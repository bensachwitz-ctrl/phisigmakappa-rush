import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { centralDb, getSubdomain } from "@/lib/prisma";
import { isAdminRole, isSameOrigin } from "@/lib/auth";
import { getCurrentBrother } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import {
  PLATFORM_PLAN,
  PLATFORM_TRIAL_DAYS,
  platformLineItem,
  getOrCreatePlatformCustomer,
  billingReturnOrigin,
} from "@/lib/platform-billing";
import { errorSink, logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/admin/billing/checkout";

/**
 * POST /api/admin/billing/checkout
 *
 * Admin-only. Creates a Stripe `mode:"subscription"` Checkout Session so the
 * chapter can start PAYING Greekstack for the platform (distinct from the dues
 * Connect flow, which is the chapter collecting from its own members).
 *
 *   1. Resolve THIS chapter's subdomain from the request Host and its central
 *      registry row (public."Tenant").
 *   2. Create/reuse the chapter's Stripe Customer, persisting stripeCustomerId.
 *   3. Create a subscription Checkout Session for the "chapter" plan with
 *      metadata.subdomain set (so the platform webhook can route the resulting
 *      subscription/invoice events back to this tenant), success → /admin/billing?ok=1,
 *      cancel → /admin/billing.
 *
 * Graceful 503 when Stripe is unconfigured (getStripe() null) — the billing page
 * shows the manual/contact fallback rather than a 500.
 */
export async function POST(req: Request) {
  // Admin role required — only a chapter admin may start a platform subscription.
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  // CSRF belt-and-suspenders (mirrors the dues routes).
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Billing is not configured yet. Please contact Greekstack support." },
      { status: 503 },
    );
  }

  // Resolve the chapter from the request Host. The apex (no subdomain) has no
  // chapter to bill — refuse rather than create an orphan customer.
  const host = headers().get("host");
  const subdomain = getSubdomain(host);
  if (!subdomain) {
    return NextResponse.json(
      { ok: false, error: "Open billing from your chapter's admin, not the platform site." },
      { status: 400 },
    );
  }

  // Load (or self-heal) the central registry row for this chapter.
  let tenant = await centralDb.tenant
    .findUnique({
      where: { subdomain },
      select: { id: true, name: true, stripeCustomerId: true, subscriptionStatus: true },
    })
    .catch(() => null);

  if (!tenant) {
    // A live chapter with no registry row is a legacy/edge case — don't block
    // billing; create the row so the subscription can attach. isActive defaults
    // true (operator's hard switch unchanged).
    try {
      tenant = await centralDb.tenant.create({
        data: { subdomain, name: subdomain },
        select: { id: true, name: true, stripeCustomerId: true, subscriptionStatus: true },
      });
    } catch {
      tenant = null;
    }
  }

  // Best-effort label for the Stripe customer (admin's email if available).
  const admin = await getCurrentBrother().catch(() => null);

  let customerId: string;
  try {
    customerId = await getOrCreatePlatformCustomer(stripe, {
      subdomain,
      existingCustomerId: tenant?.stripeCustomerId ?? null,
      email: admin?.email ?? null,
      name: tenant?.name ?? subdomain,
    });
  } catch (err: any) {
    errorSink(err, { route: ROUTE, tenant: subdomain, outcome: "customer_resolve_failed" });
    return NextResponse.json(
      { ok: false, error: "Could not start billing. Try again." },
      { status: 502 },
    );
  }

  const origin = billingReturnOrigin(host);

  // Only offer a Checkout-time trial if the chapter has never subscribed (no
  // status yet). A chapter that already trialed/canceled doesn't get a fresh
  // 14 days on re-subscribe — Stripe would honor whatever we pass, so gate it.
  const neverSubscribed =
    !tenant?.subscriptionStatus || tenant.subscriptionStatus === "trialing";

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [platformLineItem()],
    allow_promotion_codes: true,
    success_url: `${origin}/admin/billing?ok=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/admin/billing`,
    // metadata.subdomain is the routing key the platform webhook reads to map the
    // resulting subscription/invoice back to THIS chapter's registry row. Stamp
    // it on BOTH the session and the subscription so either object resolves.
    metadata: { subdomain, plan: PLATFORM_PLAN },
    subscription_data: {
      metadata: { subdomain, plan: PLATFORM_PLAN },
      ...(neverSubscribed ? { trial_period_days: PLATFORM_TRIAL_DAYS } : {}),
    },
  };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err: any) {
    errorSink(err, { route: ROUTE, tenant: subdomain, outcome: "session_create_failed" });
    return NextResponse.json(
      { ok: false, error: "Payment provider unavailable. Try again shortly." },
      { status: 502 },
    );
  }

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: "Stripe returned no checkout URL. Try again." },
      { status: 502 },
    );
  }

  logger.info("platform.billing.checkout_started", {
    route: ROUTE,
    tenant: subdomain,
    outcome: "session_created",
  });

  return NextResponse.json({ ok: true, url: session.url });
}
