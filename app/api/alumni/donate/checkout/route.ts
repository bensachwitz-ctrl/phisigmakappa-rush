import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma, getSubdomain } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { getConnectAccountId, isConnectChargesReady } from "@/lib/stripe-connect";
import { getPortalSession, isAdminOverride } from "@/lib/portal-auth";
import { errorSink } from "@/lib/logger";
import { z } from "zod";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/alumni/donate/checkout";

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

// ── Per-IP rate limit (in-memory bucket) ─────────────────────────────────────
// Mirrors the intent of app/api/rush/route.ts (windowed per-IP cap + 429 +
// Retry-After) to stop unbounded PENDING-row / live-Stripe-session creation if a
// session is ever replayed or scripted. We use an in-memory bucket (same shape
// as lib/incident.ts) rather than a DB log table so this fix stays self-contained
// to one file and needs no schema migration. A process restart resets the bucket,
// which is acceptable at chapter scale and behind the auth gate below.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 10; // ~10 checkout attempts per IP per hour
const RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>();

function checkDonationRateLimit(
  ipKey: string,
  now = Date.now()
): { ok: true } | { ok: false; retryAfterMs: number } {
  const k = ipKey || "unknown";
  const bucket = RATE_BUCKETS.get(k);
  if (!bucket || bucket.resetAt < now) {
    RATE_BUCKETS.set(k, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= RATE_MAX) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true };
}

export async function POST(req: Request) {
  try {
    // ── AuthZ: donor identity comes from the portal session, never the body ──
    // Only a logged-in alumnus (or an admin overriding into the alumni portal —
    // the same override the dashboard page honors) may open a donation checkout.
    // This is the sole caller path (app/portal/alumni/dashboard/DashboardClient
    // .tsx). Resolving alumniId from the session kills the prior abuse where any
    // anonymous caller could POST an arbitrary alumniId to create PENDING rows +
    // live Stripe sessions AND leak that alum's email via customer_email.
    const sess = getPortalSession();
    const isAdmin = isAdminOverride();

    if ((!sess || sess.role !== "alumni") && !isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Map the portal session (PortalUser id) → the AlumniProfile id. Same
    // pattern as app/api/alumni/vouch/route.ts and the dashboard page loader.
    let alumniId: string | null = null;
    if (sess?.role === "alumni") {
      const portalUser = await prisma.portalUser.findUnique({
        where: { id: sess.userId },
      });
      alumniId = portalUser?.alumniId || null;
    }
    if (isAdmin && !alumniId) {
      // Admin override (no alumni cookie): fall back to the first alumnus, exactly
      // as the dashboard page does when an admin views the alumni portal.
      const firstAlumni = await prisma.alumniProfile.findFirst();
      alumniId = firstAlumni?.id || null;
    }
    if (!alumniId) {
      return NextResponse.json({ ok: false, error: "Alumni profile not found" }, { status: 404 });
    }

    // ── Per-IP rate limit ────────────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = checkDonationRateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many donation attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = DonationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid donation details" }, { status: 400 });
    }

    const { amountCents, campaign, notes } = parsed.data;

    // Fetch the SESSION-resolved alumni profile (id derived above, not from body).
    const alumni = await prisma.alumniProfile.findUnique({
      where: { id: alumniId },
    });

    if (!alumni) {
      return NextResponse.json({ ok: false, error: "Alumni profile not found" }, { status: 404 });
    }

    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    const stripe = getStripe();
    
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: "Donation checkout not configured. Please contact the chapter treasurer." },
        { status: 503 }
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

    // Create PENDING donation row. Only prefix the fee line when a fee is
    // actually charged; otherwise the note is just the donor's own notes.
    const donation = await prisma.alumniDonation.create({
      data: {
        alumniId,
        amountCents, // This is the total donation amount
        campaign,
        notes: platformFeeCents > 0
          ? `Platform fee: $${(platformFeeCents / 100).toFixed(2)}. ${notes}`
          : notes,
        status: "PENDING",
      },
    });
    
    const siteUrl = getSiteUrl();
    const currency = (cfg["dues.currency"] || "usd").toLowerCase();
    // Chapter subdomain — read from the request Host so the platform's single
    // webhook endpoint (called server-to-server by Stripe with NO subdomain)
    // can route the event back to THIS chapter's schema via metadata.subdomain.
    const sub = getSubdomain(headers().get("host")) || "";

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
      success_url: `${siteUrl}/portal/alumni/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/portal/alumni/dashboard`,
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
    if (isConnectChargesReady(cfg)) {
      const destination = getConnectAccountId(cfg);
      const piData: NonNullable<Stripe.Checkout.SessionCreateParams["payment_intent_data"]> = {
        transfer_data: { destination },
      };
      const feePct = parseFloat(cfg["dues.platformFeePct"] || "0");
      if (Number.isFinite(feePct) && feePct > 0) {
        const fee = Math.round(amountCents * (feePct / 100));
        if (fee > 0) piData.application_fee_amount = fee;
      }
      sessionParams.payment_intent_data = piData;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    // Save stripe session ID on the donation record
    await prisma.alumniDonation.update({
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
