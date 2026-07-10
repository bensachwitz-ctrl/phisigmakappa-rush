import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/prisma";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { getConnectAccountId, isConnectChargesReady } from "@/lib/stripe-connect";
import { resolveDonateActor } from "@/lib/donate-actor";
import { isApexHost } from "@/lib/tenant-host";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { errorSink } from "@/lib/logger";
import { z } from "zod";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/alumni/donate/checkout";

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

// The donor's alumniId is ALWAYS derived from the authenticated portal session
// (see below) — never from the request body. We deliberately omit alumniId from
// the schema so a body-supplied value is ignored entirely: it can't drive which
// AlumniProfile gets a PENDING row, and it can't leak another alum's email into
// the Checkout session. amountCents/campaign/notes are the only donor-controlled
// fields.
const DonationSchema = z.object({
  amountCents: z.number().min(500), // Min donation $5.00
  campaign: z.string().min(1).max(100).optional().default("General"),
  notes: z.string().max(1000).optional().default(""),
});

// ── Per-IP rate limit (DB-backed, cross-instance) ────────────────────────────
// Caps unbounded PENDING-row / live-Stripe-session creation if a session is ever
// replayed or scripted. Previously this used an in-memory Map bucket that RESET
// per-process — useless across a multi-instance Vercel deploy. We now use the
// SAME DB-count pattern app/api/upload-headshot already uses: count this IP's
// recent attempts in the shared RushSubmitLog table (an existing table — zero new
// infra / no migration) and record one row per attempt. The window/ceiling are
// unchanged (10/IP/hour) so single-instance behavior is identical; the only
// difference is the count is now shared across instances. Fail-open on a DB error
// so a glitch never blocks a legitimate donation.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 10; // ~10 checkout attempts per IP per hour
const RATE_STATUS = "DONATE_CHECKOUT"; // RushSubmitLog discriminator for this route

export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

async function handlePost(req: Request): Promise<NextResponse> {
  try {
    // Parse the body up front — the native transport carries { subdomain } for
    // Bearer-token auth (the web transport authenticates via cookie and sends no
    // subdomain). amountCents/campaign/notes are validated further below.
    const body = await req.json().catch(() => ({}));

    // ── AuthZ + tenant context (BOTH transports) ─────────────────────────────
    // Web: portal cookie session (+ admin override) → alumniId via global prisma.
    // Native: tenant-bound Bearer token + body.subdomain → alumniId via the tenant
    // client. The donor's alumniId is ALWAYS identity-derived, NEVER from the body
    // — killing the prior abuse where any caller could POST an arbitrary alumniId
    // to create PENDING rows + live Stripe sessions AND leak that alum's email.
    const actor = await resolveDonateActor(req, (body as any)?.subdomain);
    if (!actor.ok) {
      return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
    }
    const { alumniId, db, cfg, transport } = actor;

    // ── Per-IP rate limit (DB-backed; see RATE_* above) ──────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (ip !== "unknown") {
      try {
        const since = new Date(Date.now() - RATE_WINDOW_MS);
        const recent = await db.rushSubmitLog.count({
          where: { ipAddress: ip, status: RATE_STATUS, createdAt: { gte: since } },
        });
        if (recent >= RATE_MAX) {
          return NextResponse.json(
            { ok: false, error: "Too many donation attempts. Please try again later." },
            { status: 429, headers: { "Retry-After": String(Math.ceil(RATE_WINDOW_MS / 1000)) } }
          );
        }
        // Record this attempt (best-effort; a failed log must not block the donor).
        db.rushSubmitLog.create({ data: { ipAddress: ip, status: RATE_STATUS } }).catch(() => {});
      } catch {
        // Fail open on a DB error so a glitch doesn't break a legitimate donation.
      }
    }

    const parsed = DonationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid donation details" }, { status: 400 });
    }

    const { amountCents, campaign, notes } = parsed.data;

    // Fetch the identity-resolved alumni profile (id derived above, not from body)
    // from the caller's chapter schema (tenant client on native, global on web).
    const alumni = await db.alumniProfile.findUnique({
      where: { id: alumniId },
    });

    if (!alumni) {
      return NextResponse.json({ ok: false, error: "Alumni profile not found" }, { status: 404 });
    }

    const stripe = getStripe();
    
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: "Donation checkout not configured. Please contact the chapter treasurer." },
        { status: 503 }
      );
    }

    // ── CONNECT-READY SERVER GATE (money integrity) ──────────────────────────
    // The dashboard hides the Donate action unless this chapter has a connected,
    // charges-ready Stripe account (isConnectChargesReady) — so donations always
    // land in the CHAPTER's account, not the platform's. That gate was UI-only:
    // a crafted POST bypassed it and the checkout fell through to the platform-
    // collect branch, routing the donor's money to Greek Stack's own account.
    // Enforce the SAME condition server-side: no connected payout account → no
    // checkout. Match the dashboard so the button and the API agree.
    if (!isConnectChargesReady(cfg)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Online donations are not available for this chapter yet. Please contact the chapter treasurer.",
        },
        { status: 403 }
      );
    }

    // Record the SAME platform fee that the charge will actually take (see the
    // Connect block below). The fee is only charged via application_fee_amount
    // when this chapter has a connected, charges-ready account AND set a
    // positive dues.platformFeePct — otherwise it is $0. Deriving the recorded
    // fee from cfg (not a hardcoded 5%) keeps the donation note honest: it never
    // claims a fee that wasn't charged.
    const feePct = isConnectChargesReady(cfg) ? parseFloat(cfg["dues.platformFeePct"] || "0") : 0;
    const platformFeeCents =
      Number.isFinite(feePct) && feePct > 0 ? Math.round(amountCents * (feePct / 100)) : 0;
    const donationNotes =
      platformFeeCents > 0
        ? `Platform fee: $${(platformFeeCents / 100).toFixed(2)}. ${notes}`
        : notes;

    // ── DOUBLE-CHARGE GUARD (money integrity, TOCTOU-safe) ───────────────────
    // A double-click / two tabs / a retried fetch must NOT mint two live Stripe
    // sessions for the same intended donation → the donor would be charged twice.
    // Mirrors app/api/dues/checkout/route.ts: the find-recent-open-PENDING +
    // PENDING-create runs inside a SERIALIZABLE transaction so two concurrent
    // requests can't BOTH read "no pending row" and BOTH create one. The loser is
    // aborted by the DB with a write-conflict (Prisma P2034) which we map to a 409.
    //
    // Donations (unlike dues) are intentionally repeatable, so we only collapse
    // DUPLICATES: an open PENDING row for the SAME (alumniId, campaign) created
    // within a short window. A genuinely new donation (different campaign, or after
    // the window) is unaffected. When a duplicate is found we resume its existing
    // OPEN Stripe session URL (idempotent — no new charge) rather than minting one.
    const DUP_WINDOW_MS = 10 * 60 * 1000; // 10 min — covers retries/second tabs
    type GuardResult =
      | { kind: "pending"; donation: { id: string; stripeSessionId: string | null } }
      | { kind: "created"; donation: { id: string } };

    let guard: GuardResult;
    try {
      guard = await db.$transaction(
        async (tx): Promise<GuardResult> => {
          const since = new Date(Date.now() - DUP_WINDOW_MS);
          const recent = await tx.alumniDonation.findFirst({
            where: {
              alumniId,
              campaign,
              status: "PENDING",
              recordedAt: { gte: since },
            },
            orderBy: { recordedAt: "desc" },
            select: { id: true, stripeSessionId: true },
          });
          if (recent) return { kind: "pending", donation: recent };

          const created = await tx.alumniDonation.create({
            data: {
              alumniId,
              amountCents, // This is the total donation amount
              campaign,
              notes: donationNotes,
              status: "PENDING",
            },
            select: { id: true },
          });
          return { kind: "created", donation: created };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err: any) {
      // Serialization conflict (Postgres 40001 → Prisma P2034): a concurrent
      // request won the race and created the PENDING row. Treat exactly like an
      // observed duplicate so the loser never mints a second chargeable session.
      if (err?.code === "P2034") {
        return NextResponse.json(
          { ok: false, error: "A donation is already in progress. Please finish or cancel it before starting another." },
          { status: 409 },
        );
      }
      throw err;
    }

    // A recent OPEN PENDING donation for the same (alumniId, campaign) means the
    // donor already started this checkout. Resume its existing OPEN session URL
    // (idempotent — no new charge) when we still have it; otherwise block with a
    // 409 rather than minting a second chargeable session.
    if (guard.kind === "pending") {
      if (guard.donation.stripeSessionId) {
        try {
          const prior = await stripe.checkout.sessions.retrieve(guard.donation.stripeSessionId);
          if (prior && prior.status === "open" && prior.url) {
            return NextResponse.json({ ok: true, url: prior.url });
          }
        } catch {
          // Fall through to the 409 below if the prior session can't be read.
        }
      }
      return NextResponse.json(
        { ok: false, error: "A donation is already in progress. Please finish or cancel it before starting another." },
        { status: 409 },
      );
    }

    // guard.kind === "created": we hold a fresh PENDING donation whose ID we embed
    // in the Stripe metadata below.
    const donation = guard.donation;

    const siteUrl = getSiteUrl();
    const currency = (cfg["dues.currency"] || "usd").toLowerCase();
    // Chapter subdomain — native callers carry it explicitly (apex-hosted, no
    // chapter Host header); web callers derive it from the request Host. Used both
    // for the redirect origin AND the Stripe metadata.subdomain the single
    // platform webhook (called server-to-server with NO subdomain) routes each
    // event back to THIS chapter's schema by.
    const sub = actor.subdomain || getSubdomain(headers().get("host")) || "";

    // POST-PAYMENT REDIRECT ORIGIN. Web callers carry the chapter Host, so
    // getSiteUrl()/the apex origin resolves the success page correctly. Native
    // callers are apex-hosted but resolved `sub`, so rebuild the chapter-host
    // origin from it — the success page reads the donation via the Host-proxied
    // client, and only the CHAPTER host resolves that chapter's schema (mirrors
    // the app/api/dues/checkout native redirect). Web behavior is unchanged.
    const hostHeader = headers().get("host");
    const apexBaseDomain = (
      process.env.APP_BASE_DOMAIN ||
      process.env.NEXT_PUBLIC_APP_DOMAIN ||
      "greekstack.vercel.app"
    ).replace(/^\.+/, "");
    const origin =
      transport === "native" && sub
        ? `https://${sub}.${apexBaseDomain}`
        : siteUrl;

    // Base Checkout params — IDENTICAL to the legacy platform-collects flow.
    // metadata.subdomain MUST stay intact so the single platform webhook can
    // route the event back to this chapter's schema.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: alumni.email || undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: `Donation to ${cfg["chapter.fraternityShort"] || cfg["chapter.fraternityName"] || "Your Chapter"} — ${campaign}`,
              description: (() => {
                const greek = cfg["chapter.greekLetters"] || "";
                const schoolShort = cfg["chapter.schoolShort"] || "";
                const who = [greek ? `the ${greek} chapter` : "the chapter", schoolShort ? `at ${schoolShort}` : ""]
                  .filter(Boolean)
                  .join(" ");
                return `Thank you for supporting ${who}.`;
              })(),
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/portal/alumni/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/portal/alumni/dashboard`,
      metadata: {
        alumniId,
        donationId: donation.id,
        campaign,
        platformFeeCents: platformFeeCents.toString(),
        subdomain: sub,
      },
    };

    // ADDITIVE Stripe Connect routing (Wave-C). ONLY when this chapter has a
    // connected Express account AND Stripe reports charges_enabled do we route
    // the donation to the chapter's account. If the chapter has NOT connected,
    // sessionParams is left unchanged and the platform collects (exact legacy
    // behavior). An optional platform fee comes from dues.platformFeePct only
    // when an admin set a positive value (default: no fee).
    const donationChapter =
      (cfg["chapter.fraternityShort"] || cfg["chapter.fraternityName"] || "").trim();
    const donationDescription = donationChapter
      ? `Donation to ${donationChapter} — ${campaign}`
      : `Chapter donation — ${campaign}`;

    // PaymentIntent metadata — stamped onto the PI (and thus reachable from the
    // Charge/Dispute) so the dues webhook can route a REFUND / CHARGEBACK back to
    // THIS chapter's schema. charge.refunded / charge.dispute.* carry a
    // Charge/Dispute object that does NOT carry the Checkout Session's metadata,
    // so without this the webhook resolves subdomain=undefined → the empty public
    // schema → the reversal finds no AlumniDonation row → money left Stripe while
    // the donation stayed PAID. The Session metadata below is unchanged.
    const donationPiMetadata: Record<string, string> = {
      subdomain: sub,
      donationId: donation.id,
      alumniId,
      campaign,
    };

    if (isConnectChargesReady(cfg)) {
      const destination = getConnectAccountId(cfg);
      const piData: NonNullable<Stripe.Checkout.SessionCreateParams["payment_intent_data"]> = {
        transfer_data: { destination },
        description: donationDescription,
        // Route refunds/chargebacks back to this chapter (see donationPiMetadata).
        metadata: donationPiMetadata,
      };
      const feePct = parseFloat(cfg["dues.platformFeePct"] || "0");
      if (Number.isFinite(feePct) && feePct > 0) {
        const fee = Math.round(amountCents * (feePct / 100));
        if (fee > 0) piData.application_fee_amount = fee;
      }
      sessionParams.payment_intent_data = piData;
    } else {
      // PLATFORM-COLLECT: issue a branded receipt invoice + charge description so
      // the donor gets a professional record, with Greek Stack credited politely.
      sessionParams.payment_intent_data = {
        description: donationDescription,
        statement_descriptor_suffix: "DONATION",
        // Route refunds/chargebacks back to this chapter (see donationPiMetadata).
        metadata: donationPiMetadata,
      };
      sessionParams.invoice_creation = {
        enabled: true,
        invoice_data: {
          description: donationDescription,
          footer: "Powered by Greek Stack · greekstack.vercel.app",
          metadata: { alumniId, campaign },
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    // Save stripe session ID on the donation record (caller's chapter schema).
    await db.alumniDonation.update({
      where: { id: donation.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    errorSink(err, {
      route: ROUTE,
      tenant: getSubdomain(headers().get("host")) || null,
      outcome: "donation_checkout_create_failed",
    });
    // Real error already captured server-side via errorSink above; never echo
    // the raw message (may carry Stripe/DB internals) back to the public caller.
    return NextResponse.json(
      { ok: false, error: "We couldn't start the payment. Please try again." },
      { status: 500 },
    );
  }
}
