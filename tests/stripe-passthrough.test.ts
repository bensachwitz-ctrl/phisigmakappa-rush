import { describe, it, expect } from "vitest";
import { applyPassThrough } from "@/lib/stripe";

/**
 * applyPassThrough grosses up a dues base so that, after Stripe deducts its
 * 2.9% + fixed 30¢ card fee, the chapter still nets at least the base amount.
 *
 * Regression guard for the money bug where the fixed 30¢ was omitted from the
 * gross-up, causing the chapter to under-collect ~30¢ per member.
 *
 * Stripe's actual deduction on a successful standard card charge is:
 *   fee = round(0.029 * total) + 30
 * (percentage rounded to the nearest cent, plus the fixed 30¢).
 */
const STRIPE_RATE = 0.029;
function stripeFee(totalCents: number): number {
  return Math.round(STRIPE_RATE * totalCents) + 30;
}
function netAfterFee(totalCents: number): number {
  return totalCents - stripeFee(totalCents);
}

describe("applyPassThrough", () => {
  const bases = [5000, 10000, 15000];

  it.each(bases)(
    "nets at least the base amount after Stripe's 2.9%% + 30c fee (base=%i)",
    (base) => {
      const total = applyPassThrough(base);
      const net = netAfterFee(total);
      // The whole point of pass-through: the chapter must not be out of pocket.
      expect(net).toBeGreaterThanOrEqual(base);
    },
  );

  it.each(bases)(
    "does not massively over-collect — net lands within a cent of base (base=%i)",
    (base) => {
      const total = applyPassThrough(base);
      const net = netAfterFee(total);
      // Rounding UP to the next cent can over-collect by at most ~1-2c.
      expect(net - base).toBeLessThanOrEqual(2);
    },
  );

  it("grosses up above the bare base (the fee is actually passed through)", () => {
    for (const base of bases) {
      expect(applyPassThrough(base)).toBeGreaterThan(base);
    }
  });

  it("includes the fixed 30c — total exceeds the percentage-only gross-up", () => {
    // The buggy implementation was base / (1 - rate); the correct one adds +30
    // to the numerator, so the result must be strictly larger.
    for (const base of bases) {
      const percentageOnly = Math.ceil(base / (1 - STRIPE_RATE));
      expect(applyPassThrough(base)).toBeGreaterThan(percentageOnly);
    }
  });
});
