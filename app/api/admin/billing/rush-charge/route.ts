import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { centralDb, getSubdomain } from "@/lib/prisma";
import { isAdminRole, isSameOrigin, getCurrentBrother } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import {
  normalizePlan,
  rushCycleBillable,
  platformRushChargeLineItem,
  getOrCreatePlatformCustomer,
  billingReturnOrigin,
  PLATFORM_RUSH_CYCLE_PRICE_CENTS,
} from "@/lib/platform-billing";
import { errorSink, logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/admin/billing/rush-charge";

/**
 * POST /api/admin/billing/rush-charge
 *
 * Admin-only. Creates a one-time (`mode:"payment"`) Stripe Checkout Session for
 * the $200 rush-cycle add-on. This is the per-rush-cycle fee the storefront
 * advertises on top of the $50/mo MONTHLY plan.
 *
 * Only billable to MONTHLY chapters — YEARLY includes all rush cycles, and the
 * non-subscription plans (dues_percentage / custom) are handled out-of-band — so
 * those get a graceful 400 with the right explanation. Stripe-unconfigured → 503.
 */
export async function POST(req: Request) {
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
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

  const host = headers().get("host");
  const subdomain = getSubdomain(host);
  if (!subdomain) {
    return NextResponse.json(
      { ok: false, error: "Open billing from your chapter's admin, not the platform site." },
      { status: 400 },
    );
  }

  const tenant = await centralDb.tenant
    .findUnique({
      where: { subdomain },
      select: { id: true, name: true, plan: true, stripeCustomerId: true },
    })
    .catch(() => null);

  const plan = normalizePlan(tenant?.plan ?? null);
  if (!rushCycleBillable(plan)) {
    const msg =
      plan === "yearly"
        ? "Your yearly plan already includes every rush cycle — there's nothing extra to pay."
        : plan === "custom"
          ? "Rush-cycle billing for custom plans is handled with our team. Visit /contact."
          : "Rush cycles aren't billed separately on your current plan.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

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
    return NextResponse.json({ ok: false, error: "Could not start the charge. Try again." }, { status: 502 });
  }

  const origin = billingReturnOrigin(host);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer: customerId,
    line_items: [platformRushChargeLineItem()],
    success_url: `${origin}/admin/billing?rush=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/admin/billing`,
    // kind lets the platform webhook tell a rush-cycle payment apart from the
    // recurring subscription invoices when labeling/recording the charge.
    metadata: { subdomain, kind: "rush_cycle" },
    payment_intent_data: { metadata: { subdomain, kind: "rush_cycle" } },
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
    return NextResponse.json({ ok: false, error: "Stripe returned no checkout URL. Try again." }, { status: 502 });
  }

  logger.info("platform.billing.rush_charge_started", {
    route: ROUTE,
    tenant: subdomain,
    amountCents: PLATFORM_RUSH_CYCLE_PRICE_CENTS,
    outcome: "session_created",
  });

  return NextResponse.json({ ok: true, url: session.url });
}
