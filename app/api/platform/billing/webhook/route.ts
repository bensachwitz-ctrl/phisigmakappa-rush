import { NextResponse } from "next/server";
import Stripe from "stripe";
import { centralDb } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { errorSink, logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/platform/billing/webhook";

/**
 * POST /api/platform/billing/webhook
 *
 * PUBLIC endpoint — Stripe POSTs PLATFORM-subscription lifecycle events here
 * (the chapter PAYING Greekstack). This is SEPARATE from the dues webhook
 * (/api/dues/webhook), which handles chapters collecting dues from their own
 * members. Keeping them on distinct endpoints + secrets means a dues event can
 * never be mis-applied to a platform subscription and vice-versa.
 *
 * SIGNING SECRET — uses a DEDICATED `STRIPE_PLATFORM_WEBHOOK_SECRET` (point a
 * second Stripe webhook endpoint at this URL and paste its whsec_… here). If
 * that env is unset we FALL BACK to the shared `STRIPE_WEBHOOK_SECRET` for
 * convenience in single-endpoint setups. Neither configured → 503. The
 * signature is verified BEFORE any DB write, so an attacker can never steer a
 * subscription-status update at an arbitrary chapter.
 *
 * TENANT RESOLUTION — after verification, resolve the central registry row
 * (public."Tenant") by, in order:
 *   1. event.data.object.metadata.subdomain  (stamped at checkout on the
 *      session AND the subscription), else
 *   2. the Stripe customer id (object.customer) looked up against
 *      Tenant.stripeCustomerId.
 * Then mirror the subscription state onto the row.
 *
 * IDEMPOTENT — every write is a status mirror keyed by subdomain/customer, so a
 * redelivered event is a harmless no-op overwrite (same values). We return 200
 * for unhandled types so Stripe stops retrying.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret =
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    "";
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Platform webhook secret not configured" },
      { status: 503 },
    );
  }

  // Raw bytes — Stripe signs the exact byte sequence.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    errorSink(err, { route: ROUTE, outcome: "signature_verification_failed" });
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscriptionEvent(stripe, event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoiceEvent(stripe, event.data.object as Stripe.Invoice, "payment_failed");
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        await handleInvoiceEvent(stripe, event.data.object as Stripe.Invoice, "paid");
        break;
      }
      case "checkout.session.completed": {
        // A subscription Checkout completed. The subscription.created event also
        // fires and carries full status, but handle this too so the customer↔
        // tenant link + subscription id land immediately.
        await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      }
      default:
        // Unhandled — 200 so Stripe stops retrying.
        break;
    }
  } catch (err) {
    errorSink(err, { route: ROUTE, eventType: event.type, outcome: "handler_error" });
    // 500 → Stripe retries. Better to re-process a status mirror than drop it.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  logger.info("platform.billing.webhook.processed", { route: ROUTE, eventType: event.type });
  return NextResponse.json({ ok: true });
}

/**
 * Resolve the central Tenant row for a Stripe object, by metadata.subdomain
 * first, then by stripeCustomerId. Returns the subdomain (registry key) or null.
 */
async function resolveSubdomain(
  metadataSubdomain: string | null,
  customerId: string | null,
): Promise<string | null> {
  if (metadataSubdomain) {
    const byMeta = await centralDb.tenant
      .findUnique({ where: { subdomain: metadataSubdomain }, select: { subdomain: true } })
      .catch(() => null);
    if (byMeta) return byMeta.subdomain;
    // metadata pointed at a subdomain with no row — fall through to customer id.
  }
  if (customerId) {
    const byCustomer = await centralDb.tenant
      .findFirst({ where: { stripeCustomerId: customerId }, select: { subdomain: true } })
      .catch(() => null);
    if (byCustomer) return byCustomer.subdomain;
  }
  return null;
}

/** Narrow Stripe's subscription.status to the values entitlement cares about. */
function narrowStatus(s: string | null | undefined): string {
  switch (s) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
      return s;
    case "unpaid":
      return "past_due"; // dunning exhausted but not yet canceled — treat as past_due
    case "incomplete":
    case "incomplete_expired":
      return "canceled"; // never successfully started → treat as canceled for the banner
    case "paused":
      return "canceled";
    default:
      return s || "canceled";
  }
}

/** trial_end is a UNIX seconds timestamp on the subscription; → Date | null. */
function trialEndDate(sub: Stripe.Subscription): Date | null {
  const t = (sub as any).trial_end as number | null | undefined;
  if (!t || typeof t !== "number") return null;
  return new Date(t * 1000);
}

async function handleSubscriptionEvent(
  _stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<void> {
  const metaSub = (sub.metadata?.subdomain || "").trim() || null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;
  const subdomain = await resolveSubdomain(metaSub, customerId);
  if (!subdomain) {
    logger.warn("platform.billing.unresolved_subscription", {
      route: ROUTE,
      subscriptionId: sub.id,
    });
    return;
  }

  const status = narrowStatus(sub.status);
  const plan = (sub.metadata?.plan || "").trim() || undefined;

  await centralDb.tenant
    .update({
      where: { subdomain },
      data: {
        stripeSubscriptionId: sub.id,
        subscriptionStatus: status,
        trialEndsAt: trialEndDate(sub),
        // Re-link customer id if this is the first time we see it for this tenant.
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(plan ? { plan } : {}),
      },
    })
    .catch((e) => errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "tenant_update_failed" }));

  logger.info("platform.billing.subscription_synced", {
    route: ROUTE,
    tenant: subdomain,
    status,
  });
}

async function handleInvoiceEvent(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  kind: "paid" | "payment_failed",
): Promise<void> {
  const metaSub = (invoice.metadata?.subdomain || "").trim() || null;
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
  const subdomain = await resolveSubdomain(metaSub, customerId);
  if (!subdomain) {
    logger.warn("platform.billing.unresolved_invoice", { route: ROUTE, invoiceId: invoice.id });
    return;
  }

  // Prefer the authoritative subscription status when the invoice references a
  // subscription — fetch it so we never drift from Stripe's truth.
  const subId =
    typeof (invoice as any).subscription === "string"
      ? ((invoice as any).subscription as string)
      : ((invoice as any).subscription as Stripe.Subscription | null)?.id || null;

  let status: string;
  let trialEndsAt: Date | null = null;
  let stripeSubscriptionId: string | undefined = subId || undefined;

  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      status = narrowStatus(sub.status);
      trialEndsAt = trialEndDate(sub);
      stripeSubscriptionId = sub.id;
    } catch {
      // Couldn't fetch — fall back to a conservative status from the event kind.
      status = kind === "paid" ? "active" : "past_due";
    }
  } else {
    status = kind === "paid" ? "active" : "past_due";
  }

  await centralDb.tenant
    .update({
      where: { subdomain },
      data: {
        subscriptionStatus: status,
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
        ...(trialEndsAt !== null ? { trialEndsAt } : {}),
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      },
    })
    .catch((e) => errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "tenant_update_failed" }));

  logger.info("platform.billing.invoice_synced", {
    route: ROUTE,
    tenant: subdomain,
    kind,
    status,
  });
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<void> {
  // Only platform-subscription checkouts are relevant here.
  if (session.mode !== "subscription") return;

  const metaSub = (session.metadata?.subdomain || "").trim() || null;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const subdomain = await resolveSubdomain(metaSub, customerId);
  if (!subdomain) {
    logger.warn("platform.billing.unresolved_checkout", { route: ROUTE, sessionId: session.id });
    return;
  }

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || null;

  let status = "active";
  let trialEndsAt: Date | null = null;
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      status = narrowStatus(sub.status);
      trialEndsAt = trialEndDate(sub);
    } catch {
      // keep optimistic "active" — the subscription.created event will correct it.
    }
  }

  await centralDb.tenant
    .update({
      where: { subdomain },
      data: {
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(subId ? { stripeSubscriptionId: subId } : {}),
        subscriptionStatus: status,
        ...(trialEndsAt !== null ? { trialEndsAt } : {}),
      },
    })
    .catch((e) => errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "tenant_update_failed" }));

  logger.info("platform.billing.checkout_synced", { route: ROUTE, tenant: subdomain, status });
}
