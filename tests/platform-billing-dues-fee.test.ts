import { describe, it, expect, vi } from "vitest";

// ── Stripe test-coverage gap 2(b): duesPlatformFeePct intro-fee math ──────────
// The dues_percentage platform plan is how Greek Stack monetizes chapters that
// don't pay a subscription: it takes a Stripe Connect application fee of 1.5% on
// the FIRST dues cycle, then 3% after `dues.introFeeUsed` flips true. Every
// existing checkout test forced duesPlatformFeePct → 0, so this branch never
// executed under test. These pin the real math + the "0 for every other plan"
// contract that keeps non-dues_percentage chapters fee-free.

// duesPlatformFeePct only imports centralDb for the module's OTHER helpers; it
// never touches it, so an empty stub keeps this a pure unit test (no PrismaClient).
vi.mock("@/lib/prisma", () => ({ centralDb: {} }));

import {
  duesPlatformFeePct,
  DUES_INTRO_FEE_PCT,
  DUES_STANDARD_FEE_PCT,
} from "@/lib/platform-billing";

describe("duesPlatformFeePct — dues_percentage intro vs standard rate", () => {
  it("charges the INTRO rate (1.5%) before the intro cycle is used", () => {
    expect(duesPlatformFeePct("dues_percentage", false)).toBe(1.5);
    expect(duesPlatformFeePct("dues_percentage", false)).toBe(DUES_INTRO_FEE_PCT);
  });

  it("charges the STANDARD rate (3.0%) after the intro cycle is used", () => {
    expect(duesPlatformFeePct("dues_percentage", true)).toBe(3.0);
    expect(duesPlatformFeePct("dues_percentage", true)).toBe(DUES_STANDARD_FEE_PCT);
  });

  it("returns 0 for every NON-dues_percentage plan (no platform share)", () => {
    for (const plan of ["monthly", "yearly", "semester", "custom", "", null, undefined]) {
      expect(duesPlatformFeePct(plan as any, false)).toBe(0);
      expect(duesPlatformFeePct(plan as any, true)).toBe(0);
    }
  });

  it("honors normalizePlan aliases (e.g. 'dues' / 'percentage' → dues_percentage)", () => {
    expect(duesPlatformFeePct("dues", false)).toBe(1.5);
    expect(duesPlatformFeePct("percentage", true)).toBe(3.0);
  });
});
