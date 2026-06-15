import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { centralDb, getSubdomain } from "@/lib/prisma";
import { isAdminRole, isSameOrigin } from "@/lib/auth";
import { getCurrentBrother } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import {
  type SubscriptionPlan,
  isSubscriptionPlan,
  normalizePlan,
  platformLineItem,
  platformSubscriptionData,
  platformCheckoutCustomFields,
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
 * Accepts an optional `{ plan: "monthly" | "yearly" | "semester" }` in the body:
 *   • "monthly"  → $50/mo subscription with a 30-DAY FREE TRIAL (first month
 *                  free) — but only the FIRST time (a chapter that already
 *                  trialed/canceled re-subscribes without a fresh trial). The
 *                  $200-per-rush-cycle add-on is billed separately (see
 *                  /api/admin/billing/rush-charge).
 *   • "yearly"   → $800/yr subscription (interval=year). No trial; rush included.
 *   • "semester" → $250 every 6 months (legacy; hidden in UI). No trial.
 * When `plan` is omitted we fall back to the chapter's stored plan, then to
 * "monthly". The two non-subscription plans ("dues_percentage" — earns via the
 * dues Connect fee; "custom" — talk to sales) are NOT mintable here and return a
 * graceful 400 with guidance (the UI routes them elsewhere).
 *
 *   1. Resolve THIS chapter's subdomain from the request Host and its central
 *      registry row (public."Tenant").
 *   2. Create/reuse the chapter's Stripe Customer, persisting stripeCustomerId.
 *   3. Create a subscription Checkout Session for the chosen plan with
 *      metadata.subdomain + metadata.plan set (so the platform webhook can route
 *      and label the resulting subscription/invoice events), success →
 *      /admin/billing?ok=1, cancel → /admin/billing.
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

  // Parse the requested plan from the body (best-effort — body may be empty).
  let requestedPlan: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.plan === "string") requestedPlan = body.plan;
  } catch {
    // No / invalid JSON body — fall back to the stored plan below.
  }

  // Load (or self-heal) the central registry row for this chapter.
  let tenant = await centralDb.tenant
    .findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    })
    .catch(() => null);

  if (!tenant) {
    // A live chapter with no registry row is a legacy/edge case — don't block
    // billing; create the row so the subscription can attach. isActive defaults
    // true (operator's hard switch unchanged).
    try {
      tenant = await centralDb.tenant.create({
        data: { subdomain, name: subdomain },
        select: {
          id: true,
          name: true,
          plan: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
        },
      });
    } catch {
      tenant = null;
    }
  }

  // ── Double-billing guard ─────────────────────────────────────────────────
  // If this chapter ALREADY has a live platform subscription, do NOT mint a
  // second Checkout — that would create a duplicate subscription and bill the
  // chapter twice for the same plan. We re-VERIFY against Stripe (read-only) so
  // we never refuse on a stale local mirror: only an actually-live subscription
  // blocks. A genuinely active/trialing/past_due subscription → 409 with a clear
  // pointer to the billing portal (where they change plan / payment method /
  // cancel). Canceled/incomplete or a subscription Stripe no longer has → fall
  // through and let them re-subscribe.
  const mirroredActive =
    tenant?.subscriptionStatus === "active" ||
    tenant?.subscriptionStatus === "trialing" ||
    tenant?.subscriptionStatus === "past_due";
  if (tenant?.stripeSubscriptionId && mirroredActive) {
    let live: Stripe.Subscription | null = null;
    try {
      live = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
    } catch {
      // Stripe doesn't recognize the stored subscription id (deleted/migrated) —
      // treat the local mirror as stale and allow a fresh subscription below.
      live = null;
    }
    const LIVE_BLOCKING = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);
    if (live && LIVE_BLOCKING.has(live.status)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Your chapter already has an active Greekstack subscription. Open the billing portal to change your plan, update payment, or cancel.",
          code: "already_subscribed",
          manageUrl: "/admin/billing",
        },
        { status: 409 },
      );
    }
  }

  // Resolve the EFFECTIVE plan: explicit request → stored plan → "monthly".
  // Only the two self-serve subscription plans are mintable here.
  const effective = normalizePlan(requestedPlan ?? tenant?.plan ?? null);
  if (!isSubscriptionPlan(effective)) {
    const msg =
      effective === "dues_percentage"
        ? "Your chapter is on the dues-percentage plan — there's no monthly subscription to start. Greekstack's share comes out of dues automatically."
        : "Custom plans are set up with our team. Visit /contact to talk to sales.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
  const plan: SubscriptionPlan = effective;

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
  // 30 days on re-subscribe — Stripe would honor whatever we pass, so gate it.
  // (Only the monthly plan trials at all; platformSubscriptionData enforces that.)
  const neverSubscribed =
    !tenant?.subscriptionStatus || tenant.subscriptionStatus === "trialing";

  // Persist the chosen plan on the registry row up-front so the page/banner and
  // any webhook that arrives before a status update reflect the selection.
  // Best-effort — a write failure must not block checkout.
  if (tenant && tenant.plan !== plan) {
    await centralDb.tenant
      .update({ where: { subdomain }, data: { plan } })
      .catch(() => {});
  }

  // The chapter's display name is the Stripe customer — surfaced on the invoice
  // and pre-filled into the Checkout "Chapter" custom field.
  const chapterName = tenant?.name ?? subdomain;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [platformLineItem(plan)],
    allow_promotion_codes: true,
    success_url: `${origin}/admin/billing?ok=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/admin/billing`,
    // metadata.subdomain is the routing key the platform webhook reads to map the
    // resulting subscription/invoice back to THIS chapter's registry row; plan is
    // a label. Stamp both on the session AND the subscription so either resolves.
    metadata: { subdomain, plan },
    // Professional Greek Stack invoice: chapter-named description + self-issued
    // invoice (Dashboard logo/business name) + branded footer on every renewal.
    subscription_data: platformSubscriptionData({ plan, subdomain, neverSubscribed, chapterName }),
    // Show + record which chapter is paying (pre-filled, optional).
    custom_fields: platformCheckoutCustomFields(chapterName),
    // Let the payer correct the billing name/address; keeps the customer record
    // (the chapter) clean and accurate on the invoice.
    customer_update: { name: "auto", address: "auto" },
    billing_address_collection: "auto",
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
    plan,
    outcome: "session_created",
  });

  return NextResponse.json({ ok: true, url: session.url });
}
