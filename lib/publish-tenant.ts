import type Stripe from "stripe";
import { centralDb, getTenantClient } from "@/lib/prisma";
import { errorSink, logger } from "@/lib/logger";

/**
 * CARD-REQUIRED-TO-PUBLISH — the SHARED "publish a pending-billing chapter" step,
 * used by every path that can learn a card landed: the platform-billing webhook
 * (subscription / checkout / payment_method.attached / setup_intent.succeeded /
 * customer.updated), the /admin/billing portal-return belt, and the reconcile-
 * stripe safety-net cron. Centralised here so the flag-gated publish logic can
 * never drift between those callers.
 */

const DEFAULT_SOURCE = "lib/publish-tenant";

/**
 * Publish a PENDING-billing chapter once a real billing arrangement lands. A
 * card-free MONTHLY chapter is provisioned with central Tenant.isActive=false (its
 * PUBLIC subdomain dark) + a tenant SiteConfig "billing.pendingActivation"="true"
 * flag (set at onboard). When it later adds a card, we flip isActive=true so
 * app/page.tsx begins serving the public site, and clear the pending flag.
 *
 * GATED ON THE PENDING FLAG so this can NEVER un-suspend an operator HARD-suspend:
 * we publish ONLY a chapter that onboard explicitly marked pending. An operator-
 * suspended chapter carries no "true" pending flag (the console suspend clears it
 * to "false"), so a routine card-backed event leaves it suspended. If we cannot
 * read the flag we do NOT flip (fail safe — never re-activate on uncertainty).
 *
 * Idempotent (no-op once already active), best-effort, NEVER throws. Returns true
 * only when it actually flipped isActive true (so callers can count publishes).
 */
export async function publishTenantIfPendingBilling(
  subdomain: string,
  opts?: { route?: string },
): Promise<boolean> {
  const route = opts?.route || DEFAULT_SOURCE;
  try {
    const row = await centralDb.tenant
      .findUnique({ where: { subdomain }, select: { isActive: true } })
      .catch(() => null);
    // Already live (or unknown) → nothing to publish. Idempotent for redeliveries.
    if (!row || row.isActive === true) return false;

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
      return false; // can't confirm pending → fail safe, do NOT flip
    }
    if (!pending) return false;

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
      errorSink(e, { route, tenant: subdomain, outcome: "clear_pending_flag_failed" });
    }

    logger.info("platform.billing.tenant_published", { route, tenant: subdomain });
    return true;
  } catch (e) {
    errorSink(e, { route, tenant: subdomain, outcome: "publish_pending_billing_failed" });
    return false;
  }
}

/**
 * True when a usable CARD is on file for the customer. Checks the invoice-settings
 * default payment method first, then (fallback) whether ANY card payment method is
 * attached — a founder who adds a card in the Billing Portal via
 * payment_method.attached / setup_intent.succeeded may not set it as the invoice
 * default, but the attached card still means billing can proceed. Best-effort: any
 * lookup error resolves to false (we simply don't publish yet).
 */
export async function customerHasUsableCard(
  stripe: Stripe,
  customerId: string | null | undefined,
): Promise<boolean> {
  const id = (customerId || "").trim();
  if (!id) return false;
  try {
    const customer = await stripe.customers.retrieve(id);
    if (customer && !(customer as any).deleted) {
      if ((customer as any).invoice_settings?.default_payment_method) return true;
    }
  } catch {
    // ignore — fall through to the payment-method list below
  }
  try {
    const pms = await stripe.paymentMethods.list({ customer: id, type: "card", limit: 1 });
    return (pms?.data?.length ?? 0) > 0;
  } catch {
    return false; // treat as no card yet
  }
}
