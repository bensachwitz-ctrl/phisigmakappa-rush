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
  platformCheckoutCustomFields,
  platformSubscriptionInvoiceSettings,
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
 * Admin-only. Creates a RECURRING (`mode:"subscription"`) Stripe Checkout
 * Session for the $200 rush-cycle add-on — billed EACH SEMESTER (every 6
 * months). This is the rush fee the storefront advertises on top of the $50/mo
 * MONTHLY plan. It is minted as a SEPARATE subscription (not an item on the
 * $50/mo one) tagged metadata.kind="rush_cycle", so the platform webhook can
 * keep it from ever overwriting the chapter's main plan mirror, and the chapter
 * can cancel rush independently in the billing portal.
 *
 * Only billable to MONTHLY chapters — YEARLY includes all rush cycles, and the
 * non-subscription plans (dues_percentage / custom) are handled out-of-band — so
 * those get a graceful 400 with the right explanation. A chapter with a LIVE
 * rush subscription already gets a graceful 400 (no double-billing).
 * Stripe-unconfigured → 503.
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

  // One LIVE rush subscription per chapter — if it's already running, the next
  // semester bills automatically, so a second Checkout would double-charge.
  // Best-effort: a failed list never blocks the happy path.
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    const live = subs.data.find(
      (s) =>
        (s.metadata?.kind || "") === "rush_cycle" &&
        ["active", "trialing", "past_due", "unpaid"].includes(s.status),
    );
    if (live) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Your rush-cycle subscription is already active — it renews each semester (every 6 months) automatically. Use Manage billing to view or cancel it.",
        },
        { status: 400 },
      );
    }
  } catch (err: any) {
    errorSink(err, { route: ROUTE, tenant: subdomain, outcome: "rush_dup_check_failed" });
  }

  const origin = billingReturnOrigin(host);

  const chapterName = tenant?.name ?? subdomain;
  const rushDescription = chapterName
    ? `Greek Stack rush cycle (each semester) — ${chapterName}`
    : "Greek Stack rush cycle (each semester)";

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [platformRushChargeLineItem()],
    success_url: `${origin}/admin/billing?rush=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/admin/billing`,
    // kind lets the platform webhook tell the rush-cycle subscription apart from
    // the main $50/mo platform subscription — the webhook SKIPS rush_cycle
    // objects so they never overwrite the chapter's plan/status mirror.
    metadata: { subdomain, kind: "rush_cycle" },
    // Branded, chapter-named invoice for the rush-cycle subscription.
    subscription_data: {
      metadata: { subdomain, kind: "rush_cycle" },
      description: rushDescription,
      invoice_settings: platformSubscriptionInvoiceSettings(),
    },
    custom_fields: platformCheckoutCustomFields(chapterName),
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
