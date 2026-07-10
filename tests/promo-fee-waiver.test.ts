import { describe, it, expect } from "vitest";
import {
  FEE_WAIVER_PROMO_CODE,
  isFeeWaiverPromo,
  applyPromoToFees,
} from "@/lib/promo";

/**
 * PRIORITY 3 — `bensachwitzrocks` full-fee-waiver coupon.
 *
 * The recognized code (case-insensitive) waives BOTH the monthly/platform fee
 * AND the per-rush-cycle fee (100% off); any unknown / absent code leaves both
 * fees intact. lib/promo is the single source of truth the onboarding/checkout
 * server path (app/api/onboard) and the wizard UI both reason about, so this
 * pins the "what does this code waive" contract.
 */

// Realistic platform + rush fee amounts (cents): $50/mo platform, $200 rush.
const FEES = { platformCents: 5000, rushCents: 20000 };

describe("fee-waiver promo recognition", () => {
  it("recognizes the exact code and common casings/whitespace", () => {
    expect(isFeeWaiverPromo(FEE_WAIVER_PROMO_CODE)).toBe(true);
    expect(isFeeWaiverPromo("bensachwitzrocks")).toBe(true);
    expect(isFeeWaiverPromo("BENSACHWITZROCKS")).toBe(true);
    expect(isFeeWaiverPromo("BenSachwitzRocks")).toBe(true);
    expect(isFeeWaiverPromo("  bensachwitzrocks  ")).toBe(true);
  });

  it("rejects unknown / empty / non-string codes", () => {
    expect(isFeeWaiverPromo("WELCOME100")).toBe(false);
    expect(isFeeWaiverPromo("bensachwitz")).toBe(false);
    expect(isFeeWaiverPromo("")).toBe(false);
    expect(isFeeWaiverPromo(null)).toBe(false);
    expect(isFeeWaiverPromo(undefined)).toBe(false);
  });
});

describe("applyPromoToFees — waiver zeroes BOTH fees, unknown does not", () => {
  it("the waiver code zeroes the platform AND rush fees (100% off)", () => {
    const out = applyPromoToFees("bensachwitzrocks", FEES);
    expect(out.platformCents).toBe(0);
    expect(out.rushCents).toBe(0);
    expect(out.waived).toBe(true);
  });

  it("is case-insensitive for the waiver", () => {
    const out = applyPromoToFees("BENSACHWITZROCKS", FEES);
    expect(out).toEqual({ platformCents: 0, rushCents: 0, waived: true });
  });

  it("an UNKNOWN code leaves both fees unchanged (no waiver)", () => {
    const out = applyPromoToFees("WELCOME100", FEES);
    expect(out.platformCents).toBe(5000);
    expect(out.rushCents).toBe(20000);
    expect(out.waived).toBe(false);
  });

  it("an absent code leaves both fees unchanged", () => {
    expect(applyPromoToFees("", FEES)).toEqual({ platformCents: 5000, rushCents: 20000, waived: false });
    expect(applyPromoToFees(null, FEES)).toEqual({ platformCents: 5000, rushCents: 20000, waived: false });
  });
});
