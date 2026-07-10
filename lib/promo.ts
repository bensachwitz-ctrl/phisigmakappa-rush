/**
 * PROMO / DISCOUNT codes applied at chapter onboarding + platform checkout.
 *
 * FULL FEE WAIVER — `bensachwitzrocks` (matched case-insensitively). When a
 * founder enters this code at signup it waives BOTH platform fees (the $50/mo
 * monthly / platform subscription) AND the $200-per-rush-cycle fee: 100% off,
 * for the life of the subscription. Migration-free: recognized here as a
 * constant and applied via a reusable 100%-off Stripe coupon
 * (getOrCreateFullWaiverCoupon in lib/platform-billing) on the subscriptions the
 * onboard flow creates. No schema column, no DB migration.
 *
 * The other legacy promo codes (GREEKFREE / WELCOME100 / SILICON) are marketing
 * codes that only adjust the trial length / email copy; they are NOT full
 * waivers and remain handled inline where they are consumed.
 */

/** The single full-fee-waiver promo code (compared case-insensitively). */
export const FEE_WAIVER_PROMO_CODE = "bensachwitzrocks";

/**
 * True when `code` is the full-fee-waiver promo (case-insensitive, trimmed).
 * A non-string / empty / unrecognized value is always false.
 */
export function isFeeWaiverPromo(code: string | null | undefined): boolean {
  return (
    typeof code === "string" &&
    code.trim().toLowerCase() === FEE_WAIVER_PROMO_CODE
  );
}

/**
 * Apply a promo code to the platform + rush fee amounts (in cents). The waiver
 * code zeroes BOTH fees (100% off); any other or absent code leaves them
 * unchanged. Pure — the single source of truth the onboarding/checkout paths and
 * the UI summary both reason about, so the "what does this code waive" answer
 * can never drift between server and client.
 */
export function applyPromoToFees(
  code: string | null | undefined,
  fees: { platformCents: number; rushCents: number },
): { platformCents: number; rushCents: number; waived: boolean } {
  if (isFeeWaiverPromo(code)) {
    return { platformCents: 0, rushCents: 0, waived: true };
  }
  return { platformCents: fees.platformCents, rushCents: fees.rushCents, waived: false };
}
