import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { centralDb, getSubdomain } from "@/lib/prisma";
import { getStripe, getSiteUrl, applyPassThrough } from "@/lib/stripe";
import { getConnectAccountId, isConnectChargesReady } from "@/lib/stripe-connect";
import {
  duesPlatformFeePct,
  normalizePlan,
  DUES_INTRO_FEE_USED_KEY,
} from "@/lib/platform-billing";
import { audit } from "@/lib/audit";
import { errorSink } from "@/lib/logger";
import { resolveDuesActor } from "@/lib/dues-actor";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/dues/checkout";

// CORS preflight for the bundled native app. The native shell calls this cross-
// origin (apex-hosted backend, Capacitor origin) with Authorization + Content-
// Type, so the WebView fires an OPTIONS preflight. The web app is same-origin and
// never preflights — it sees no CORS header and behaves exactly as before.
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/**
 * POST /api/dues/checkout
 *
 * Creates a Stripe Checkout session for the signed-in brother's dues
 * payment. Returns `{ ok: true, url }` — the client redirects the
 * browser there and Stripe handles card capture end-to-end (we never
 * touch PAN/CVC — PCI scope = SAQ-A).
 *
 * Graceful-degrade contract: returns 503 with a human message when
 * online dues are not configured. Caller (BrothersManager) shows the
 * message + tells the brother to pay manually via the treasurer.
 *
 * Rate-limited 5/min/brother in-process — a brother who clicks the
 * button 50× in a panic shouldn't create 50 PENDING ledger rows or
 * spam Stripe's session API. In-memory is enough for v1; a multi-
 * instance Vercel deploy would want a Redis-backed limiter eventually.
 */
const checkoutAttempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;

function checkRateLimit(brotherId: string): boolean {
  const now = Date.now();
  const prior = checkoutAttempts.get(brotherId) || [];
  const recent = prior.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  checkoutAttempts.set(brotherId, recent);
  return true;
}

export async function POST(req: Request) {
  // Wrap so native-origin CORS headers are attached to EVERY branch (web sees no
  // CORS header and is unaffected).
  return withCors(req, await handlePost(req));
}

async function handlePost(req: Request): Promise<NextResponse> {
  // The native app sends a JSON body carrying { subdomain } for Bearer-token
  // auth; the web app posts no body and authenticates via cookie. Parse leniently.
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Resolve the dues-paying brother + tenant context for BOTH transports. Native
  // (Bearer + body.subdomain) resolves against the tenant schema; web (cookie)
  // keeps the exact prior behavior. NEVER trusts a client brotherId.
  const actor = await resolveDuesActor(req, body?.subdomain);
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  const { brother, db, cfg, subdomain: actorSubdomain, transport } = actor;

  // Rate-limit before any DB / Stripe work.
  if (!checkRateLimit(brother.id)) {
    return NextResponse.json(
      { ok: false, error: "Too many checkout attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const enabled = cfg["dues.enabled"] === "true";
  const publishableKey = cfg["dues.stripePublishableKey"] || "";
  // The webhook secret can be the SINGLE platform-global STRIPE_WEBHOOK_SECRET
  // (the current model — one endpoint, routed by metadata.subdomain) OR a legacy
  // per-chapter dues.stripeWebhookSecret. Either one satisfies the prereq; the
  // webhook resolves them in the same order. (Without this, a chapter relying on
  // the global secret could never enable online dues — it 503'd forever.)
  const webhookConfigured = !!(process.env.STRIPE_WEBHOOK_SECRET || cfg["dues.stripeWebhookSecret"]);

  const stripe = getStripe();

  // All prereqs required. Missing any → graceful 503.
  if (!enabled || !publishableKey || !webhookConfigured || !stripe) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Online dues not configured. Pay manually via your chapter treasurer.",
      },
      { status: 503 },
    );
  }

  // Idempotency guard: if the brother already has a PAID DuesPayment
  // row for this year, no need to create a new session.
  const year = cfg["dues.year"] || "2026-fall";
  const baseAmount = parseInt(cfg["dues.amountCents"] || "15000", 10) || 15000;
  const currency = (cfg["dues.currency"] || "usd").toLowerCase();
  const passThrough = cfg["dues.passThroughFee"] === "true";
  const totalCents = passThrough ? applyPassThrough(baseAmount) : baseAmount;
  const label = cfg["dues.label"] || "Chapter dues";
  // Chapter display name for a professional, self-identifying invoice line +
  // statement descriptor. Falls back to a generic label when unset so a fresh
  // chapter never ships an empty invoice description.
  const chapterName =
    (cfg["chapter.fraternityName"] || "").trim() ||
    (cfg["chapter.fraternityShort"] || "").trim();

  // Already paid? Short-circuit.
  const existing = await db.duesPayment.findFirst({
    where: { brotherId: brother.id, year, status: "PAID" },
  }).catch(() => null);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: `You're already marked paid for ${year}.` },
      { status: 409 },
    );
  }

  // Create a PENDING DuesPayment first so we have an ID to embed in
  // Stripe metadata. If session-creation throws we still have a row
  // for forensics — admin can see "Brother X started 3 sessions and
  // none completed; treasurer should follow up."
  // Chapter subdomain — native callers carry it explicitly (apex-hosted, no
  // chapter Host header); web callers derive it from the request Host. Used both
  // for error context AND for the Stripe metadata.subdomain the single platform
  // webhook routes each event back by.
  const sub = actorSubdomain || getSubdomain(headers().get("host")) || "";

  let payment;
  try {
    payment = await db.duesPayment.create({
      data: {
        brotherId: brother.id,
        amountCents: totalCents,
        currency,
        year,
        method: "STRIPE",
        status: "PENDING",
      },
    });
  } catch (err) {
    errorSink(err, {
      route: ROUTE,
      tenant: sub || null,
      brotherId: brother.id,
      outcome: "create_dues_payment_failed",
    });
    return NextResponse.json(
      { ok: false, error: "Could not start checkout. Try again or contact your treasurer." },
      { status: 500 },
    );
  }

  // Stripe Checkout Session.
  const siteUrl = getSiteUrl();
  // `sub` (the chapter subdomain) was resolved above — native callers carry it
  // explicitly, web callers derive it from Host. The platform's single webhook
  // endpoint (called server-to-server by Stripe with NO subdomain) routes each
  // event back to THIS chapter's schema via metadata.subdomain below.

  // Base Checkout params — IDENTICAL to the legacy platform-collects flow.
  // metadata.subdomain MUST stay intact: the single platform webhook routes
  // each event back to this chapter's schema by reading it.
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: brother.email || undefined,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: totalCents,
          product_data: {
            name: label,
            description: `${brother.name} — ${year}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/admin/dues/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/admin/brothers`,
    metadata: {
      brotherId: brother.id,
      duesPaymentId: payment.id,
      duesYear: year,
      subdomain: sub,
    },
  };

  // A human-readable charge description shown on the PaymentIntent + receipt +
  // (when issued) the invoice. Reads as the chapter's dues with Greek Stack
  // credited. Statement-descriptor suffix is what the member sees on their card
  // statement (≤22 chars total with the account prefix; suffix kept short).
  const duesPiDescription = chapterName
    ? `${label} — ${chapterName} (${year})`
    : `${label} (${year})`;

  // PLATFORM PLAN — the chapter's OWN subscription model TO Greekstack, read from
  // the central registry (public."Tenant"), NOT the tenant SiteConfig. Only the
  // "dues_percentage" plan layers a Greekstack share onto the dues Connect fee
  // below (1.5% intro → 3% standard). Best-effort: any lookup error leaves plan
  // null, which normalizes to a NON-dues_percentage plan → no extra fee (safe).
  let platformPlan: string | null = null;
  if (sub) {
    const treg = await centralDb.tenant
      .findUnique({ where: { subdomain: sub }, select: { plan: true } })
      .catch(() => null);
    platformPlan = treg?.plan ?? null;
  }
  const isDuesPercentagePlan = normalizePlan(platformPlan) === "dues_percentage";
  // Intro fee is consumed once: the FIRST successful dues payment flips
  // dues.introFeeUsed → "true" (see app/api/dues/webhook). Until then the chapter
  // pays the 1.5% intro rate; after, the 3% standard rate.
  const introUsed = cfg[DUES_INTRO_FEE_USED_KEY] === "true";

  // ADDITIVE Stripe Connect routing (Wave-C). ONLY when this chapter has a
  // connected Express account AND Stripe reports charges_enabled do we route
  // the charge to the chapter's account via destination charges. If the chapter
  // has NOT connected, sessionParams is left byte-for-byte unchanged and the
  // platform collects (exact legacy behavior — do not change this default).
  if (isConnectChargesReady(cfg)) {
    const destination = getConnectAccountId(cfg);
    const piData: NonNullable<Stripe.Checkout.SessionCreateParams["payment_intent_data"]> = {
      transfer_data: { destination },
      // Branded charge description carried to the connected account's receipt.
      description: duesPiDescription,
    };
    // Optional admin-configured platform application fee. Applied when an admin
    // set a positive dues.platformFeePct; otherwise 0 (legacy default).
    const adminFeePct = parseFloat(cfg["dues.platformFeePct"] || "0");
    let effectiveFeePct = Number.isFinite(adminFeePct) && adminFeePct > 0 ? adminFeePct : 0;

    // INTRO DUES FEE — LAYERED ON TOP for dues_percentage chapters ONLY. This is
    // how Greekstack monetizes the dues_percentage plan: 1.5% of every member's
    // dues for the first cycle, then 3%. Added to any admin fee so Greekstack's
    // share is collected regardless of the chapter's own passthrough config.
    // Other plans (monthly/semester/custom/none) are untouched → 0 platform share.
    effectiveFeePct += duesPlatformFeePct(platformPlan, introUsed);

    if (effectiveFeePct > 0) {
      const fee = Math.round(totalCents * (effectiveFeePct / 100));
      if (fee > 0) piData.application_fee_amount = fee;
    }
    sessionParams.payment_intent_data = piData;
    // NOTE: we deliberately do NOT enable invoice_creation on destination charges
    // — the connected chapter account owns its own receipts/invoices, and mixing
    // a platform-issued invoice with a destination transfer muddies the chapter's
    // books. The PaymentIntent description above + Stripe's emailed card receipt
    // are the member-facing record in that mode.
  } else {
    // PLATFORM-COLLECT (default): issue a real, professional Stripe invoice (PDF +
    // hosted page) so the member gets a proper receipt that reads as the chapter's
    // dues with a tasteful "Powered by Greek Stack" footer — and stamp a branded
    // charge description + a short card-statement suffix.
    sessionParams.payment_intent_data = {
      description: duesPiDescription,
      statement_descriptor_suffix: "DUES",
    };
    sessionParams.invoice_creation = {
      enabled: true,
      invoice_data: {
        description: duesPiDescription,
        footer: "Powered by Greek Stack · greekstack.vercel.app",
        metadata: { brotherId: brother.id, duesYear: year },
      },
    };
  }

  // Stamp the platform plan + intro-fee state into the Checkout metadata so the
  // webhook can flip dues.introFeeUsed on the first paid dues cycle WITHOUT a
  // central-registry round-trip (Stripe carries no Host/subdomain server-to-
  // server; the webhook routes by metadata.subdomain already present below).
  if (isDuesPercentagePlan && sessionParams.metadata) {
    (sessionParams.metadata as Record<string, string>).platformPlan = "dues_percentage";
    (sessionParams.metadata as Record<string, string>).introFeeUsed = introUsed ? "true" : "false";
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err: any) {
    errorSink(err, {
      route: ROUTE,
      tenant: sub || null,
      brotherId: brother.id,
      outcome: "stripe_session_create_failed",
    });
    // Mark the row FAILED so it's not stuck PENDING forever.
    await db.duesPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", notes: `Stripe error: ${err?.message || "unknown"}` },
    }).catch(() => {});
    return NextResponse.json(
      { ok: false, error: "Payment provider unavailable. Try again or pay manually." },
      { status: 502 },
    );
  }

  // Persist the session ID so the webhook can look the row up.
  await db.duesPayment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  }).catch(() => {});

  await audit({
    action: "DUES_CHECKOUT_STARTED",
    subjectType: "Brother",
    subjectId: brother.id,
    subjectName: brother.name,
    details: `$${(totalCents / 100).toFixed(2)} ${currency.toUpperCase()} — ${year} · via ${transport}`,
    req,
  });

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: "Stripe returned no checkout URL. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, url: session.url });
}
