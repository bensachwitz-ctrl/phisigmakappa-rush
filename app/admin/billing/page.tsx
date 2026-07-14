import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { centralDb, getSubdomain } from "@/lib/prisma";
import { getEntitlement } from "@/lib/entitlement";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe } from "@/lib/stripe";
import { publishTenantIfPendingBilling, customerHasUsableCard } from "@/lib/publish-tenant";
import { BillingManager } from "@/components/admin/billing-manager";
import {
  PLATFORM_PLAN_NAME,
  PLATFORM_PLAN_PRICE_CENTS,
} from "@/lib/platform-billing";
import { IconBilling as CreditCard, IconArrowLeft as ArrowLeft } from "@/components/brand/icons";

export const dynamic = "force-dynamic";

/**
 * /admin/billing — the chapter's PLATFORM subscription page (paying Greekstack).
 *
 * Admin-only (mirrors the dues hub gate: member cookie → login; non-admin role →
 * dashboard). Reads the central registry row + the fail-open entitlement and
 * hands a serialized snapshot to the client manager, which renders the plan +
 * status + trial countdown and the Start-subscription / Manage-billing buttons.
 *
 * This page NEVER hard-blocks anything — the operator `isActive` flag (enforced
 * in app/page.tsx) is the only hard switch. Here we only present billing state.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams?: { ok?: string };
}) {
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fbilling");
  if (!isAdminRole()) redirect("/admin");

  const host = headers().get("host");
  const subdomain = getSubdomain(host) || "";

  const entitlement = await getEntitlement(subdomain);

  // Has the chapter ever started checkout? (drives portal-vs-checkout default)
  // isActive lets the portal-return belt below skip the extra Stripe call for an
  // already-live chapter (the common case).
  const tenant = subdomain
    ? await centralDb.tenant
        .findUnique({
          where: { subdomain },
          select: { stripeCustomerId: true, plan: true, isActive: true },
        })
        .catch(() => null)
    : null;

  // Stripe configured? (drives the graceful "contact support" state)
  const stripe = getStripe();
  const stripeConfigured = !!stripe;

  // BELT (CARD-REQUIRED-TO-PUBLISH): the founder may have added a card in the
  // Stripe Billing Portal, whose payment_method.attached / setup_intent.succeeded /
  // customer.updated events publish the chapter via the platform-billing webhook.
  // If that webhook was missed, this admin-only return path (?ok=1 after checkout,
  // or the bare /admin/billing portal return_url) re-checks the customer's card
  // server-side and publishes so the public site is never left dark. Runs ONLY for
  // a not-yet-live chapter that already has a Stripe customer; publish is gated on
  // the pending flag, so an operator hard-suspend is never re-activated. Fully
  // best-effort — a failure here never blocks the billing page render.
  if (subdomain && stripe && tenant && tenant.isActive === false && tenant.stripeCustomerId) {
    try {
      if (await customerHasUsableCard(stripe, tenant.stripeCustomerId)) {
        await publishTenantIfPendingBilling(subdomain, { route: "/admin/billing" });
      }
    } catch {
      // best-effort belt — ignore and render the page as usual
    }
  }

  // The chosen pricing method + whether the intro dues fee has been used, so the
  // manager can render the dues-share ("1.5% then 3%") vs subscription view.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const introFeeUsed = cfg["dues.introFeeUsed"] === "true";

  const priceLabel = `$${(PLATFORM_PLAN_PRICE_CENTS / 100).toFixed(
    PLATFORM_PLAN_PRICE_CENTS % 100 === 0 ? 0 : 2,
  )}/mo`;

  return (
    <div className="container py-8 max-w-3xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <div className="mb-8 flex items-start gap-4">
        <span
          className="hidden sm:inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red ring-1 ring-brand-red/15"
          aria-hidden="true"
        >
          <CreditCard className="h-6 w-6" />
        </span>
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-brand-red">
            <CreditCard className="h-3 w-3" /> Plan &amp; billing
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-prose">
            Manage your chapter&apos;s Greekstack subscription - the platform that
            runs your rush site, roster, dues, events, and compliance trail. This
            is separate from the dues you collect from your own members.
          </p>
        </div>
      </div>

      <BillingManager
        planName={PLATFORM_PLAN_NAME}
        priceLabel={priceLabel}
        plan={tenant?.plan ?? undefined}
        introFeeUsed={introFeeUsed}
        status={entitlement.status}
        reason={entitlement.reason}
        trialEndsAt={entitlement.trialEndsAt ? entitlement.trialEndsAt.toISOString() : null}
        daysLeft={entitlement.daysLeft}
        hasCustomer={!!tenant?.stripeCustomerId}
        stripeConfigured={stripeConfigured}
        justSubscribed={searchParams?.ok === "1"}
      />
    </div>
  );
}
