import type Stripe from "stripe";

/**
 * Stripe Connect (Express) helpers — additive payout routing layer.
 *
 * The platform runs ONE Stripe account (`STRIPE_SECRET_KEY`, see lib/stripe.ts).
 * Connect lets each chapter attach its OWN payout (Express) account so dues /
 * donation charges settle to the chapter's bank instead of the platform balance.
 *
 * SAFETY CONTRACT (do not break): a chapter that has NOT connected an account
 * keeps the EXACT legacy behavior — the platform collects. Charges are only
 * routed to a chapter's account when that chapter has a connected account AND
 * `charges_enabled === true`. These helpers are pure wrappers around the Stripe
 * SDK; the conditional routing decision lives in the checkout routes.
 *
 * Per-chapter Connect state is persisted in that chapter's SiteConfig:
 *   dues.stripeConnectAccountId  → "acct_..."   (the Express account id)
 *   dues.connectChargesEnabled   → "true"/"false" (charges_enabled mirror)
 *   dues.connectPayoutsEnabled   → "true"/"false" (payouts_enabled mirror)
 */

/** SiteConfig key holding the chapter's connected Express account id. */
export const CONNECT_ACCOUNT_KEY = "dues.stripeConnectAccountId";
/** SiteConfig key mirroring Stripe's account.charges_enabled. */
export const CONNECT_CHARGES_KEY = "dues.connectChargesEnabled";
/** SiteConfig key mirroring Stripe's account.payouts_enabled. */
export const CONNECT_PAYOUTS_KEY = "dues.connectPayoutsEnabled";

/**
 * Read the chapter's connected account id from a resolved SiteConfig map.
 * Returns "" when the chapter has not started Connect onboarding.
 */
export function getConnectAccountId(
  cfg: Record<string, string> | null | undefined,
): string {
  return (cfg?.[CONNECT_ACCOUNT_KEY] || "").trim();
}

/**
 * True only when the chapter has a connected account AND Stripe reports
 * charges_enabled. This is the SINGLE gate the checkout routes consult before
 * adding a destination — when false, the platform collects (legacy behavior).
 */
export function isConnectChargesReady(
  cfg: Record<string, string> | null | undefined,
): boolean {
  return (
    getConnectAccountId(cfg) !== "" &&
    cfg?.[CONNECT_CHARGES_KEY] === "true"
  );
}

/**
 * Create a new Express connected account on the platform's Stripe account.
 * Returns the Stripe Account object (caller persists `account.id`).
 */
export async function createConnectAccount(
  stripe: Stripe,
): Promise<Stripe.Account> {
  return stripe.accounts.create({ type: "express" });
}

/**
 * Create a hosted onboarding link for the given connected account. The chapter
 * admin is redirected here to enter bank / identity details with Stripe.
 *
 * - refreshUrl: where Stripe sends the user if the link expires / is revisited
 *   (point this back at the POST that mints a fresh link).
 * - returnUrl:  where Stripe sends the user on completion (our /return route,
 *   which re-checks status and redirects into the admin).
 */
export async function createOnboardingLink(
  stripe: Stripe,
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export interface ConnectAccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

/**
 * Retrieve the live capability status of a connected account. Used both during
 * onboarding return and by the GET status endpoint to mirror Stripe's flags
 * back into SiteConfig so the checkout gate can read them without a Stripe
 * round-trip on every payment.
 */
export async function getAccountStatus(
  stripe: Stripe,
  accountId: string,
): Promise<ConnectAccountStatus> {
  const acct = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: !!acct.charges_enabled,
    payoutsEnabled: !!acct.payouts_enabled,
    detailsSubmitted: !!acct.details_submitted,
  };
}
