import { describe, it, expect } from "vitest";
import { resolveBillingTone } from "@/lib/billing-banner-tone";

/**
 * Unit coverage for the SHARED entitlement→banner-tone resolver that both the
 * web admin banner and the mobile dashboard banner consume. Locks the show/hide
 * decision + severity so the two surfaces can never drift, and so the fail-open
 * contract (no banner on healthy/uncertain states) is regression-proof.
 */
describe("resolveBillingTone", () => {
  describe("healthy / fail-open states → no banner", () => {
    it("active subscription → null", () => {
      expect(
        resolveBillingTone({ reason: "subscribed", status: "active", daysLeft: null }),
      ).toBeNull();
    });

    it("status active even with a stale reason → null", () => {
      expect(
        resolveBillingTone({ reason: "unknown", status: "active", daysLeft: 3 }),
      ).toBeNull();
    });

    it("operator-comped with no billing issue → null", () => {
      expect(
        resolveBillingTone({ reason: "operator_active", status: null, daysLeft: null }),
      ).toBeNull();
    });

    it("no tenant row (unprovisioned) → null", () => {
      expect(
        resolveBillingTone({ reason: "no_tenant_row", status: null, daysLeft: null }),
      ).toBeNull();
    });

    it("lookup error → null (fail open, nothing to nudge)", () => {
      expect(
        resolveBillingTone({ reason: "lookup_error", status: null, daysLeft: null }),
      ).toBeNull();
    });

    it("unknown status → null", () => {
      expect(
        resolveBillingTone({ reason: "unknown", status: null, daysLeft: null }),
      ).toBeNull();
    });

    it("early trial (>7 days left) → null (don't nag from day 1)", () => {
      expect(
        resolveBillingTone({ reason: "trialing", status: "trialing", daysLeft: 14 }),
      ).toBeNull();
    });
  });

  describe("past due → danger, always", () => {
    it("status past_due → danger", () => {
      const tone = resolveBillingTone({ reason: "past_due", status: "past_due", daysLeft: null });
      expect(tone).not.toBeNull();
      expect(tone!.severity).toBe("danger");
      expect(tone!.key).toBe("past_due");
      expect(tone!.title).toMatch(/past due/i);
      expect(tone!.ctaLabel).toMatch(/update billing/i);
    });

    it("reason past_due even when status missing → danger", () => {
      const tone = resolveBillingTone({ reason: "past_due", status: null, daysLeft: null });
      expect(tone!.severity).toBe("danger");
    });
  });

  describe("trial ending soon → warning", () => {
    it("3 days left → warning with day count in the title", () => {
      const tone = resolveBillingTone({ reason: "trial_active", status: "trialing", daysLeft: 3 });
      expect(tone).not.toBeNull();
      expect(tone!.severity).toBe("warning");
      expect(tone!.title).toMatch(/3 days/);
      expect(tone!.key).toBe("trial_3");
    });

    it("1 day left → singular 'day'", () => {
      const tone = resolveBillingTone({ reason: "trial_active", status: "trialing", daysLeft: 1 });
      expect(tone!.title).toMatch(/1 day\b/);
      expect(tone!.title).not.toMatch(/1 days/);
    });

    it("exactly 7 days left → still shows (boundary)", () => {
      const tone = resolveBillingTone({ reason: "trialing", status: "trialing", daysLeft: 7 });
      expect(tone).not.toBeNull();
      expect(tone!.severity).toBe("warning");
    });

    it("0 days left while trialing → 'ending' copy", () => {
      const tone = resolveBillingTone({ reason: "trialing", status: "trialing", daysLeft: 0 });
      expect(tone).not.toBeNull();
      expect(tone!.title).toMatch(/ending|soon/i);
    });
  });

  describe("trial expired / canceled → warning re-subscribe nudge", () => {
    it("trial_expired → warning, inactive key", () => {
      const tone = resolveBillingTone({ reason: "trial_expired", status: null, daysLeft: 0 });
      expect(tone).not.toBeNull();
      expect(tone!.severity).toBe("warning");
      expect(tone!.key).toBe("inactive");
      expect(tone!.title).toMatch(/trial has ended/i);
    });

    it("canceled → warning, inactive key", () => {
      const tone = resolveBillingTone({ reason: "canceled", status: "canceled", daysLeft: null });
      expect(tone).not.toBeNull();
      expect(tone!.severity).toBe("warning");
      expect(tone!.key).toBe("inactive");
      expect(tone!.title).toMatch(/inactive/i);
    });
  });

  it("never throws on odd inputs", () => {
    expect(() =>
      resolveBillingTone({ reason: "" as any, status: null, daysLeft: null }),
    ).not.toThrow();
    expect(
      resolveBillingTone({ reason: "" as any, status: null, daysLeft: null }),
    ).toBeNull();
  });
});
