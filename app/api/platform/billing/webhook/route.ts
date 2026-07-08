import { NextResponse } from "next/server";
import Stripe from "stripe";
import { centralDb, getTenantClient } from "@/lib/prisma";
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
      case "charge.refunded":
      case "charge.dispute.created":
      case "charge.dispute.closed": {
        // REVERSAL VISIBILITY — refunds/disputes must never be silently dropped,
        // or platform revenue can be reconciled against Stripe and come up
        // short. Access itself is governed by the subscription lifecycle cases
        // above (a reversal that ends the plan arrives as subscription.deleted);
        // here we make every reversal auditable so revenue is never overstated.
        await handleReversalEvent(stripe, event);
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

/**
 * CARD-REQUIRED-TO-PUBLISH — publish a PENDING-billing chapter once a real billing
 * arrangement lands. A card-free MONTHLY chapter is provisioned with central
 * Tenant.isActive=false (its PUBLIC subdomain dark) + a tenant SiteConfig
 * "billing.pendingActivation"="true" flag (set at onboard). When it later adds a
 * card (a card-backed trialing/active subscription, or a completed subscription
 * Checkout) via the platform-billing path, we flip isActive=true so app/page.tsx
 * begins serving the public site, and clear the pending flag.
 *
 * GATED ON THE PENDING FLAG so this can NEVER un-suspend an operator HARD-suspend:
 * we publish ONLY a chapter that onboard explicitly marked pending. An operator-
 * suspended chapter carries no "true" pending flag, so a routine card-backed
 * subscription event leaves it suspended. If we cannot read the flag we do NOT
 * flip (fail safe — never re-activate on uncertainty).
 *
 * Idempotent (no-op once already active), best-effort, NEVER throws (so it can't
 * fail the webhook — the caller returns 200 and Stripe stops retrying).
 */
async function publishTenantIfPendingBilling(subdomain: string): Promise<void> {
  try {
    const row = await centralDb.tenant
      .findUnique({ where: { subdomain }, select: { isActive: true } })
      .catch(() => null);
    // Already live (or unknown) → nothing to publish. Idempotent for redeliveries.
    if (!row || row.isActive === true) return;

    // Only publish a chapter onboard marked pending-billing — never re-activate an
    // operator hard-suspend (which has no "true" pending flag).
    let pending = false;
    try {
      const tenantDb = getTenantClient(subdomain);
      const flag = await tenantDb.siteConfig.findUnique({
        where: { key: "billing.pendingActivation" },
        select: { value: true },
      });
      pending = flag?.value === "true";
    } catch {
      return; // can't confirm pending → fail safe, do NOT flip
    }
    if (!pending) return;

    await centralDb.tenant.update({
      where: { subdomain },
      data: { isActive: true },
    });

    // Clear the pending flag so app/page.tsx serves the live site and a LATER
    // operator suspend is never mistaken for pending-billing.
    try {
      const tenantDb = getTenantClient(subdomain);
      await tenantDb.siteConfig.upsert({
        where: { key: "billing.pendingActivation" },
        update: { value: "false" },
        create: { key: "billing.pendingActivation", value: "false" },
      });
    } catch (e) {
      errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "clear_pending_flag_failed" });
    }

    logger.info("platform.billing.tenant_published", { route: ROUTE, tenant: subdomain });
  } catch (e) {
    errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "publish_pending_billing_failed" });
  }
}

/**
 * True when the subscription is backed by a payment method — its own default PM,
 * or (fallback) the customer's default PM. A card-free trial has NEITHER, so this
 * distinguishes "adding a card during the trial" from the initial card-free launch.
 * Best-effort: any lookup error resolves to false (we simply don't publish yet).
 */
async function subscriptionHasCard(stripe: Stripe, sub: Stripe.Subscription): Promise<boolean> {
  if (sub.default_payment_method) return true;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;
  if (!customerId) return false;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !(customer as any).deleted) {
      return Boolean((customer as any).invoice_settings?.default_payment_method);
    }
  } catch {
    // ignore — treat as no card yet
  }
  return false;
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

/** True for the SEPARATE $200-each-semester rush subscription (and its checkout
 *  session / invoices). Rush objects carry metadata.kind="rush_cycle" — they
 *  must NEVER overwrite the chapter's MAIN platform-plan mirror
 *  (stripeSubscriptionId / subscriptionStatus / trialEndsAt / plan). */
function isRushCycle(metadata: Stripe.Metadata | null | undefined): boolean {
  return ((metadata?.kind as string) || "") === "rush_cycle";
}

async function handleSubscriptionEvent(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<void> {
  // RUSH-CYCLE GUARD — the rush add-on is its own subscription; skip the mirror.
  if (isRushCycle(sub.metadata)) {
    logger.info("platform.billing.rush_subscription_event_skipped", {
      route: ROUTE,
      subscriptionId: sub.id,
    });
    return;
  }

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
  // CANCELLATION TRIAL-LEAK GUARD — Stripe RETAINS the original trial_end on a
  // deleted/canceled subscription. Mirroring it would leave a future trialEndsAt
  // on a canceled chapter, and getEntitlement() would grant a "trial_active"
  // pass until that stale date passes (access + revenue leak). Null it on cancel.
  const trialEndsAt = status === "canceled" ? null : trialEndDate(sub);

  await centralDb.tenant
    .update({
      where: { subdomain },
      data: {
        stripeSubscriptionId: sub.id,
        subscriptionStatus: status,
        trialEndsAt,
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

  // CARD-REQUIRED-TO-PUBLISH — a card-backed trialing/active subscription is the
  // signal that a pending-billing (card-free monthly) chapter now has a real
  // billing arrangement, so publish its public site. Gated on the pending flag
  // inside the helper (never un-suspends an operator hard-suspend). Best-effort.
  if (
    (status === "trialing" || status === "active") &&
    (await subscriptionHasCard(stripe, sub))
  ) {
    await publishTenantIfPendingBilling(subdomain);
  }
}

async function handleInvoiceEvent(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  kind: "paid" | "payment_failed",
): Promise<void> {
  // RUSH-CYCLE GUARD — invoices for the separate rush subscription must not flip
  // the chapter's MAIN subscriptionStatus mirror. Newer API versions surface the
  // subscription's metadata on invoice.subscription_details; the retrieve-based
  // check below covers older shapes.
  const invoiceSubMeta = (invoice as any).subscription_details?.metadata as
    | Stripe.Metadata
    | undefined;
  if (isRushCycle(invoice.metadata) || isRushCycle(invoiceSubMeta)) {
    logger.info("platform.billing.rush_invoice_event_skipped", {
      route: ROUTE,
      invoiceId: invoice.id,
      kind,
    });
    return;
  }

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
  // Only set the subscription-id mirror AFTER we have proven (via retrieve) that
  // this subscription is the chapter's MAIN plan and not a rush_cycle. Until then
  // it stays undefined so a retrieve failure can't stamp an unverified id onto
  // the main plan columns.
  let stripeSubscriptionId: string | undefined = undefined;

  if (subId) {
    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(subId);
    } catch (err) {
      // CORRUPTION GUARD — we could NOT confirm whether this subscription is the
      // chapter's main plan or a separate rush_cycle. Writing subId +
      // event-derived status onto the MAIN plan columns now would corrupt a
      // chapter whose invoice actually belonged to its rush subscription (the
      // pre-rush-guard mirror bug). Instead, mutate NOTHING and re-raise so the
      // POST handler returns 500 → Stripe retries the delivery, by which point
      // the retrieve typically succeeds and the rush guard can run.
      errorSink(err, {
        route: ROUTE,
        invoiceId: invoice.id ?? undefined,
        kind,
        outcome: "subscription_retrieve_failed_mirror_skipped",
      });
      throw err;
    }
    // RUSH-CYCLE GUARD (retrieve-based) — a rush invoice resolved here must
    // not mirror the rush subscription's state onto the main plan columns.
    if (isRushCycle(sub.metadata)) {
      logger.info("platform.billing.rush_invoice_event_skipped", {
        route: ROUTE,
        invoiceId: invoice.id,
        kind,
      });
      return;
    }
    status = narrowStatus(sub.status);
    trialEndsAt = trialEndDate(sub);
    stripeSubscriptionId = sub.id;
  } else {
    // No subscription on the invoice (e.g. a one-off charge) — safe to mirror a
    // conservative status from the event kind without touching subscription id.
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

  // RUSH-CYCLE GUARD — the rush add-on checkout is also mode:"subscription" now,
  // but it must not stamp its subscription id/status over the main plan mirror.
  if (isRushCycle(session.metadata)) {
    logger.info("platform.billing.rush_checkout_skipped", {
      route: ROUTE,
      sessionId: session.id,
    });
    return;
  }

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

  // CARD-REQUIRED-TO-PUBLISH — a completed subscription Checkout collected a
  // payment method, so publish a pending-billing chapter (e.g. one that re-
  // subscribed after its card-free trial cancelled). Gated on the pending flag
  // (never un-suspends an operator hard-suspend). Best-effort.
  await publishTenantIfPendingBilling(subdomain);
}

/**
 * Record a platform-subscription reversal (refund or dispute) so platform
 * revenue is reconcilable against Stripe. We intentionally do NOT mutate
 * subscriptionStatus here: a partial/goodwill refund does not end the plan, and
 * a reversal that DOES end it arrives separately as customer.subscription.
 * deleted (handled above). This handler exists to close the audit gap — the
 * webhook previously 200'd these events with no record at all.
 */
async function handleReversalEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  let customerId: string | null = null;
  let detail: Record<string, unknown> = {};

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id || null;
    detail = {
      chargeId: charge.id,
      amount: charge.amount,
      amountRefunded: charge.amount_refunded,
      currency: charge.currency,
      fullyRefunded: charge.amount_refunded >= charge.amount,
    };
  } else {
    // charge.dispute.created | charge.dispute.closed — the Dispute object carries
    // only the charge id, so retrieve the charge to resolve the paying customer.
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id || null;
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId).catch(() => null);
      customerId =
        charge && typeof charge.customer === "string"
          ? charge.customer
          : (charge?.customer as Stripe.Customer | null)?.id || null;
    }
    detail = {
      disputeId: dispute.id,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      disputeStatus: dispute.status,
    };
  }

  const subdomain = await resolveSubdomain(null, customerId);
  logger.warn("platform.billing.reversal_recorded", {
    route: ROUTE,
    eventType: event.type,
    tenant: subdomain || "unresolved",
    ...detail,
  });
}
