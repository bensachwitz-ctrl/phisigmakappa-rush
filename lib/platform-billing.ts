import Stripe from "stripe";
import { getStripe, getSiteUrl } from "@/lib/stripe";

/**
 * ============================================================================
 * GREEKSTACK PLATFORM BILLING — the money the *platform* (Greekstack) earns.
 * ============================================================================
 *
 * This is DISTINCT from `lib/stripe.ts`. That file's `getStripe()` reads the
 * CHAPTER's own `STRIPE_SECRET_KEY` and is how a chapter collects member dues
 * into the chapter's own bank account. Nothing in this file changes that.
 *
 * Here we read a SECOND, separate key — `STRIPE_PLATFORM_SECRET_KEY` — which
 * belongs to the Greekstack platform Stripe account. It powers two revenue
 * models, selected per-chapter by `chapter.billingPlan` in SiteConfig:
 *
 *   • "flat_subscription" → the chapter pays Greekstack $299/semester via a
 *     Stripe Billing subscription Checkout (mode: "subscription").
 *
 *   • "dues_split"        → the chapter onboards a Stripe Connect account,
 *     and member-dues charges are routed through the PLATFORM account as a
 *     destination charge with a 1.5% application fee skimmed to Greekstack;
 *     the remainder transfers to the chapter's connected account.
 *
 * INERT BY DEFAULT — the #1 requirement. If `STRIPE_PLATFORM_SECRET_KEY` is
 * unset, `getPlatformStripe()` returns null and EVERY caller must short-circuit
 * to a 503. When that happens the existing dues flow is completely unaffected:
 * it keeps using the chapter's own `getStripe()` with NO application fee and NO
 * destination transfer (see `app/api/dues/checkout` + `co-sign`). We never read
 * this key at module load (no top-level throw) so the rest of the app renders
 * normally with platform billing disabled.
 *
 * SECRETS HYGIENE — only non-secret artifacts (Connect account id, subscription
 * status, customer id) are ever persisted to SiteConfig. The secret key and the
 * platform webhook signing secret stay in env vars exclusively.
 */

/** Pinned API version — MUST match lib/stripe.ts so webhook event shapes and
 *  request payloads stay consistent across the chapter key and platform key.
 *  Cast `as any` exactly like lib/stripe.ts: the installed SDK ships its own
 *  newer literal union for apiVersion, and pinning to an older-but-supported
 *  version is intentional. */
export const PLATFORM_API_VERSION = "2024-12-18.acacia";

/** The flat-plan price in cents: $299.00. */
export const FLAT_PLAN_AMOUNT_CENTS = 29900;
/** The flat-plan billing cadence: every 6 months (one academic semester). */
export const FLAT_PLAN_INTERVAL: "month" = "month";
export const FLAT_PLAN_INTERVAL_COUNT = 6;
export const FLAT_PLAN_CURRENCY = "usd";

/** The platform's cut on dues_split charges: 1.5%. */
export const DUES_SPLIT_FEE_RATE = 0.015;

/**
 * Param types derived directly from the installed SDK's method signatures.
 *
 * We deliberately avoid spelling `Stripe.Checkout.SessionCreateParams` etc. by
 * name: in this SDK build the umbrella `Stripe.Checkout` resolves to the
 * resource CLASS, and the merged namespace's nested create-param types aren't
 * always reachable through it (TS2724). Deriving from the actual `create`
 * method parameter is version-proof — it always matches whatever SDK is
 * installed, today or after an upgrade.
 */
type CheckoutSessionCreateParams = NonNullable<
  Parameters<Stripe["checkout"]["sessions"]["create"]>[0]
>;
type CheckoutLineItem = NonNullable<CheckoutSessionCreateParams["line_items"]>[number];

/**
 * Platform Stripe client. Returns a configured Stripe client OR null when the
 * server-side `STRIPE_PLATFORM_SECRET_KEY` env var is missing.
 *
 * Mirrors `getStripe()` in lib/stripe.ts: every platform-billing endpoint MUST
 * null-check before using and return 503 when null — a Greekstack instance that
 * has not configured platform billing should never 500, and the chapter app
 * must behave exactly as it does today.
 */
export function getPlatformStripe(): Stripe | null {
  const secret = process.env.STRIPE_PLATFORM_SECRET_KEY;
  if (!secret) return null;
  return new Stripe(secret, {
    apiVersion: PLATFORM_API_VERSION as any,
    typescript: true,
  });
}

/** Convenience: is platform billing configured at all (secret key present)? */
export function isPlatformBillingConfigured(): boolean {
  return !!process.env.STRIPE_PLATFORM_SECRET_KEY;
}

/**
 * Compute the platform application fee (in cents) for a dues_split charge.
 * Rounded UP so the platform never under-collects its 1.5%. The remainder
 * (total − fee) is what transfers to the chapter's connected account.
 */
export function computeApplicationFeeCents(totalCents: number): number {
  if (!Number.isFinite(totalCents) || totalCents <= 0) return 0;
  return Math.ceil(totalCents * DUES_SPLIT_FEE_RATE);
}

/**
 * Create a subscription Checkout Session for the $299/semester flat plan.
 *
 * Uses `STRIPE_FLAT_PRICE_ID` if set (preferred — a real recurring Price you
 * created in the platform Dashboard). Otherwise falls back to inline
 * `price_data` describing the same $299 / 6-month recurring price, so the flow
 * works out-of-the-box without dashboard setup.
 *
 * Returns the created Session. Caller returns `{ url: session.url }`.
 *
 * @param opts.customerId  Reuse an existing platform Customer if we already
 *   created one for this chapter (persisted as billing.stripeCustomerId), so we
 *   don't spawn a duplicate Customer on every Subscribe click.
 * @param opts.customerEmail  Prefill email when no customer id yet.
 */
export async function createSubscriptionCheckout(
  stripe: Stripe,
  opts: {
    successUrl?: string;
    cancelUrl?: string;
    customerId?: string;
    customerEmail?: string;
    chapterName?: string;
  } = {},
): Promise<Stripe.Checkout.Session> {
  const siteUrl = getSiteUrl();
  const successUrl =
    opts.successUrl ||
    `${siteUrl}/admin/settings?billing=subscribed&session_id={CHECKOUT_SESSION_ID}#subscription`;
  const cancelUrl = opts.cancelUrl || `${siteUrl}/admin/settings?billing=cancelled#subscription`;

  const flatPriceId = process.env.STRIPE_FLAT_PRICE_ID;

  const lineItem: CheckoutLineItem = flatPriceId
    ? { price: flatPriceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: FLAT_PLAN_CURRENCY,
          unit_amount: FLAT_PLAN_AMOUNT_CENTS,
          recurring: {
            interval: FLAT_PLAN_INTERVAL,
            interval_count: FLAT_PLAN_INTERVAL_COUNT,
          },
          product_data: {
            name: "Greekstack — Flat Semester Subscription",
            description: opts.chapterName
              ? `Platform license for ${opts.chapterName} ($299 / semester)`
              : "Platform license ($299 / semester)",
          },
        },
      };

  const params: CheckoutSessionCreateParams = {
    mode: "subscription",
    line_items: [lineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Identify the source so the webhook can recognize platform-subscription
    // sessions and persist billing.* status to SiteConfig.
    metadata: { greekstackBilling: "flat_subscription" },
    subscription_data: {
      metadata: { greekstackBilling: "flat_subscription" },
    },
  };

  // Reuse an existing platform Customer if we have one; otherwise let Checkout
  // create one and prefill the email.
  if (opts.customerId) {
    params.customer = opts.customerId;
  } else if (opts.customerEmail) {
    params.customer_email = opts.customerEmail;
  }

  return stripe.checkout.sessions.create(params);
}

/**
 * Create (if needed) and return an Account Link onboarding URL for the
 * dues_split Connect flow.
 *
 * - If `existingAccountId` is provided we REUSE it and just mint a fresh
 *   Account Link (links are single-use + short-lived, so we re-issue on demand
 *   rather than creating a new account every time — that prevents orphan
 *   accounts piling up on the platform).
 * - Otherwise we create a new connected account first.
 *
 * We use controller properties (NOT the legacy `type: 'express'`) per Stripe's
 * current Connect guidance: the platform is liable for losses and pays Stripe
 * fees (so the 1.5% destination-charge model nets correctly), Stripe collects
 * onboarding requirements, and the connected account gets an Express dashboard.
 *
 * Returns both the account id (so the caller can persist it) and the onboarding
 * URL (so the caller can redirect).
 */
export async function createOrRefreshConnectOnboarding(
  stripe: Stripe,
  opts: {
    existingAccountId?: string;
    email?: string;
    refreshUrl?: string;
    returnUrl?: string;
    chapterName?: string;
  } = {},
): Promise<{ accountId: string; url: string }> {
  const siteUrl = getSiteUrl();
  const refreshUrl =
    opts.refreshUrl || `${siteUrl}/admin/settings?billing=connect_refresh#subscription`;
  const returnUrl =
    opts.returnUrl || `${siteUrl}/admin/settings?billing=connect_return#subscription`;

  let accountId = opts.existingAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      // Controller-based config (modern Connect). Platform takes loss liability
      // and pays fees so destination charges + application_fee_amount settle
      // cleanly; Stripe collects requirements; Express-style dashboard for the
      // chapter treasurer.
      controller: {
        losses: { payments: "application" },
        fees: { payer: "application" },
        stripe_dashboard: { type: "express" },
        requirement_collection: "stripe",
      },
      email: opts.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: opts.chapterName ? { name: opts.chapterName } : undefined,
      metadata: { greekstackBilling: "dues_split" },
    });
    accountId = account.id;
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return { accountId, url: accountLink.url };
}

/**
 * ============================================================================
 * DUES-CHARGE ROUTING — decide whether a member-dues Checkout goes through the
 * PLATFORM account (destination charge + 1.5% fee) or the chapter's OWN account
 * (existing behavior, no fee).
 * ============================================================================
 *
 * This is the single source of truth shared by /api/dues/checkout and
 * /api/dues/co-sign so both routes behave identically. It is intentionally
 * conservative: the platform path activates ONLY when ALL of the following hold
 *   1. STRIPE_PLATFORM_SECRET_KEY is set (getPlatformStripe() is non-null), AND
 *   2. chapter.billingPlan === "dues_split", AND
 *   3. billing.connectChargesEnabled === "true" AND billing.connectAccountId set.
 *
 * In EVERY other case it returns the chapter's own getStripe() client with NO
 * extra session params — byte-for-byte the same Checkout the app creates today.
 * If platform billing is unconfigured, the result is literally `getStripe()` and
 * empty params, so the existing dues flow is 100% preserved.
 */
export type DuesChargeRouting = {
  /** The Stripe client to call `.checkout.sessions.create` on. */
  stripe: Stripe | null;
  /**
   * Extra params to MERGE into the existing Checkout Session create call. Empty
   * object on the chapter-own path. On the platform path it carries
   * `payment_intent_data` with the application fee + transfer destination.
   */
  extraSessionParams: Partial<CheckoutSessionCreateParams>;
  /** True only when routing through the platform as a destination charge. */
  viaPlatform: boolean;
  /** The connected account id when viaPlatform, else null (for logging/metadata). */
  connectAccountId: string | null;
};

/**
 * Resolve dues-charge routing from the current SiteConfig map + env.
 *
 * @param cfg          the SiteConfig map (already merged with DEFAULTS).
 * @param totalCents   the brother-facing total the Checkout will charge — the
 *                     application fee is computed from THIS so the platform's
 *                     1.5% is taken off the actual amount collected.
 */
export function resolveDuesChargeRouting(
  cfg: Record<string, string>,
  totalCents: number,
): DuesChargeRouting {
  const platformStripe = getPlatformStripe();
  const billingPlan = cfg["chapter.billingPlan"] || "dues_split";
  const chargesEnabled = cfg["billing.connectChargesEnabled"] === "true";
  const connectAccountId = cfg["billing.connectAccountId"] || "";

  const usePlatform =
    !!platformStripe &&
    billingPlan === "dues_split" &&
    chargesEnabled &&
    connectAccountId.length > 0;

  if (!usePlatform) {
    // EXACT existing behavior: chapter's own key, no fee, no transfer.
    return {
      stripe: getStripe(),
      extraSessionParams: {},
      viaPlatform: false,
      connectAccountId: null,
    };
  }

  const fee = computeApplicationFeeCents(totalCents);
  return {
    stripe: platformStripe,
    extraSessionParams: {
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: connectAccountId },
      },
    },
    viaPlatform: true,
    connectAccountId,
  };
}

/**
 * Create a Billing Portal session so the chapter can self-manage its platform
 * subscription (update card, view invoices, cancel). Requires a platform
 * Customer id — only meaningful once the chapter has subscribed at least once.
 *
 * Returns the created portal session. Caller returns `{ url }`.
 */
export async function createBillingPortalSession(
  stripe: Stripe,
  opts: { customerId: string; returnUrl?: string },
): Promise<Stripe.BillingPortal.Session> {
  const siteUrl = getSiteUrl();
  const returnUrl = opts.returnUrl || `${siteUrl}/admin/settings#subscription`;
  return stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: returnUrl,
  });
}
