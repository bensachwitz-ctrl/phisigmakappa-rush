/**
 * PROMO / DISCOUNT codes — CLIENT-SAFE marketing codes ONLY.
 *
 * The three marketing codes below (GREEKFREE / WELCOME100 / SILICON) only adjust
 * trial-length messaging / email copy; they are NOT fee waivers and are not
 * secret, so it is fine for them to appear in the browser bundle.
 *
 * ⚠️  THE FULL-FEE-WAIVER CODE IS A REVENUE SECRET AND IS NOT IN THIS MODULE.
 * It lives in `lib/promo-server.ts` (server-only, env-driven allowlist + a
 * redemption cap + an expiry) so the literal NEVER ships in the client bundle.
 * The onboarding wizard validates codes by POSTing to
 * `/api/onboard/validate-promo` (which calls into the server module) instead of
 * importing the waiver logic. Do NOT re-introduce the waiver code here or import
 * `lib/promo-server` from a client component — either would re-leak the code.
 */

/** Non-secret marketing promo codes (compared case-insensitively / upper-cased). */
export const MARKETING_PROMO_CODES = ["GREEKFREE", "WELCOME100", "SILICON"] as const;

/**
 * True when `code` is a recognized (non-waiver) marketing promo code. Safe to run
 * on the client — these codes are not secret and grant no fee waiver.
 */
export function isMarketingPromo(code: string | null | undefined): boolean {
  if (typeof code !== "string") return false;
  const norm = code.trim().toUpperCase();
  return (MARKETING_PROMO_CODES as readonly string[]).includes(norm);
}
