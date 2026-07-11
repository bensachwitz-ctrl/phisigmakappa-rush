// SERVER-ONLY promo / full-fee-waiver validation.
//
// NEVER import this module from a client component. The full-fee-waiver code is a
// revenue secret — if a client component imports it, the literal ships in the
// browser bundle (the exact regression this file exists to fix, where anyone
// could read `bensachwitzrocks` out of `/onboard`'s JS and self-grant a
// free-forever chapter). The onboarding wizard validates codes over the network
// via /api/onboard/validate-promo instead of importing this. (Same server-only
// convention as lib/elections-server.ts — enforced by the import graph, not a
// bundler flag, so it also stays importable from the Vitest node suite.)
//
// The waiver is gated by an ALLOWLIST + a REDEMPTION CAP + an EXPIRY, all read
// from env at call time so the operator can rotate/disable the code without a
// deploy:
//   FEE_WAIVER_CODES            comma-separated allowlist (case-insensitive).
//                               UNSET or "" → NO waiver code is granted (the
//                               feature is OFF until explicitly configured); set
//                               it to your active waiver code(s) to enable. There
//                               is deliberately NO hardcoded fallback: an
//                               unconfigured env must never default-grant a
//                               forever-100%-off coupon.
//   FEE_WAIVER_MAX_REDEMPTIONS  hard cap on how many chapters may ever redeem it
//                               (default 5) — enforced on the Stripe coupon
//                               (max_redemptions) in lib/platform-billing.
//   FEE_WAIVER_EXPIRES_AT       ISO date after which the code is dead (optional) —
//                               enforced here AND as the coupon's redeem_by.
//
// Note: because the wizard must render a "100% off" confirmation, the validate
// endpoint is inherently a valid/invalid oracle for the code. That is acceptable:
// discovering the code grants nothing on its own — an actual free chapter still
// requires the IP-rate-limited /api/onboard path AND is bounded by the redemption
// cap + expiry above. The allowlist/cap/expiry are what protect revenue, not the
// secrecy of the string.

import { isMarketingPromo } from "@/lib/promo";

const DEFAULT_MAX_REDEMPTIONS = 5;

/**
 * Allowlisted full-fee-waiver codes (lower-cased), read from FEE_WAIVER_CODES.
 *
 * REQUIRES EXPLICIT CONFIG. When FEE_WAIVER_CODES is UNSET (or blank) this
 * returns an EMPTY allowlist — so NO code grants the 100%-off, duration:
 * "forever" waiver by default. The prior implementation fell back to a hardcoded
 * legacy code (`bensachwitzrocks`) whenever the env was unconfigured, which
 * silently default-granted a forever-free coupon on any deploy that hadn't set
 * the env. The waiver is a real, intended feature — but it must be turned ON
 * deliberately by setting FEE_WAIVER_CODES (comma-separated, case-insensitive),
 * never by omission.
 */
export function feeWaiverAllowlist(): string[] {
  const raw = process.env.FEE_WAIVER_CODES;
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
  }
  // UNSET or "" → empty allowlist (no fallback grant). The waiver stays OFF
  // until the operator explicitly configures FEE_WAIVER_CODES.
  return [];
}

/** Hard cap on total waiver redemptions (default 5). Enforced on the Stripe coupon. */
export function feeWaiverMaxRedemptions(): number {
  const n = Number(process.env.FEE_WAIVER_MAX_REDEMPTIONS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_REDEMPTIONS;
}

/** Optional redeem-by date after which the waiver is refused. Null when unset/invalid. */
export function feeWaiverRedeemBy(): Date | null {
  const raw = process.env.FEE_WAIVER_EXPIRES_AT;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * True only when `code` is an ALLOWLISTED, NON-EXPIRED full-fee-waiver code.
 * SERVER-ONLY — the single grant point for the 100%-off waiver.
 */
export function isFeeWaiverPromo(code: string | null | undefined): boolean {
  if (typeof code !== "string") return false;
  const norm = code.trim().toLowerCase();
  if (!norm) return false;
  if (!feeWaiverAllowlist().includes(norm)) return false;
  const redeemBy = feeWaiverRedeemBy();
  if (redeemBy && Date.now() > redeemBy.getTime()) return false;
  return true;
}

/** True when `code` is EITHER a marketing code OR a valid fee-waiver code. */
export function isPromoValid(code: string | null | undefined): boolean {
  return isMarketingPromo(code) || isFeeWaiverPromo(code);
}

/**
 * Classify a code for the validate endpoint: whether it is accepted at all, and
 * whether it is the full-fee waiver (drives the wizard's "100% off" confirmation).
 */
export function classifyPromo(code: string | null | undefined): {
  valid: boolean;
  waiver: boolean;
} {
  const waiver = isFeeWaiverPromo(code);
  return { valid: waiver || isMarketingPromo(code), waiver };
}

/**
 * Apply a promo code to the platform + rush fee amounts (in cents). The waiver
 * code zeroes BOTH fees (100% off); any other or absent code leaves them
 * unchanged. SERVER-ONLY (depends on the server-gated waiver check).
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
