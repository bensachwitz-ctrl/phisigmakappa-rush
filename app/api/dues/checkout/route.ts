import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe, getSiteUrl, applyPassThrough } from "@/lib/stripe";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  // Rate-limit before any DB / Stripe work.
  if (!checkRateLimit(brother.id)) {
    return NextResponse.json(
      { ok: false, error: "Too many checkout attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const enabled = cfg["dues.enabled"] === "true";
  const publishableKey = cfg["dues.stripePublishableKey"] || "";
  const webhookSecret = cfg["dues.stripeWebhookSecret"] || "";

  const stripe = getStripe();

  // All four prereqs required. Missing any → graceful 503.
  if (!enabled || !publishableKey || !webhookSecret || !stripe) {
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

  // Already paid? Short-circuit.
  const existing = await prisma.duesPayment.findFirst({
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
  let payment;
  try {
    payment = await prisma.duesPayment.create({
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
    console.error("[/api/dues/checkout] create DuesPayment failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not start checkout. Try again or contact your treasurer." },
      { status: 500 },
    );
  }

  // Stripe Checkout Session.
  const siteUrl = getSiteUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
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
      },
    });
  } catch (err: any) {
    console.error("[/api/dues/checkout] Stripe.create failed:", err);
    // Mark the row FAILED so it's not stuck PENDING forever.
    await prisma.duesPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", notes: `Stripe error: ${err?.message || "unknown"}` },
    }).catch(() => {});
    return NextResponse.json(
      { ok: false, error: "Payment provider unavailable. Try again or pay manually." },
      { status: 502 },
    );
  }

  // Persist the session ID so the webhook can look the row up.
  await prisma.duesPayment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  }).catch(() => {});

  await audit({
    action: "DUES_CHECKOUT_STARTED",
    subjectType: "Brother",
    subjectId: brother.id,
    subjectName: brother.name,
    details: `$${(totalCents / 100).toFixed(2)} ${currency.toUpperCase()} — ${year}`,
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
