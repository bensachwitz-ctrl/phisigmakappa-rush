import { describe, it, expect } from "vitest";
import { buildAlumniTabs } from "@/components/nav/portal-nav";
import { isDuesConfigured } from "@/lib/dues-config";
import { isConnectChargesReady } from "@/lib/stripe-connect";

// The alumni portal's information architecture and the two feature gates that
// drive it (Donate, member Dues) are pure functions so they can be pinned here
// without rendering. These assertions mirror the three-tab restructure in
// app/portal/alumni/dashboard/DashboardClient.tsx.

describe("alumni portal primary tabs", () => {
  it("exposes EXACTLY three primary tabs in order: events, networking, alumni", () => {
    const tabs = buildAlumniTabs();
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.id)).toEqual(["events", "networking", "alumni"]);
  });

  it("gives every tab a non-empty, em-dash-free label", () => {
    for (const tab of buildAlumniTabs()) {
      expect(tab.label.length).toBeGreaterThan(0);
      expect(tab.label).not.toContain("—");
    }
  });
});

describe("Donate action gate (isConnectChargesReady)", () => {
  it("is HIDDEN when the chapter has no Stripe Connect account", () => {
    expect(isConnectChargesReady(null)).toBe(false);
    expect(isConnectChargesReady({})).toBe(false);
    expect(
      isConnectChargesReady({ "dues.connectChargesEnabled": "true" }),
    ).toBe(false);
  });

  it("is HIDDEN when connected but charges are not enabled", () => {
    expect(
      isConnectChargesReady({
        "dues.stripeConnectAccountId": "acct_123",
        "dues.connectChargesEnabled": "false",
      }),
    ).toBe(false);
  });

  it("is SHOWN only when connected and charges are enabled", () => {
    expect(
      isConnectChargesReady({
        "dues.stripeConnectAccountId": "acct_123",
        "dues.connectChargesEnabled": "true",
      }),
    ).toBe(true);
  });
});

describe("member Dues tab gate (isDuesConfigured)", () => {
  it("is HIDDEN when dues are unconfigured (missing, disabled, or zero amount)", () => {
    expect(isDuesConfigured(null)).toBe(false);
    expect(isDuesConfigured({})).toBe(false);
    expect(
      isDuesConfigured({ "dues.enabled": "false", "dues.amountCents": "5000" }),
    ).toBe(false);
    expect(
      isDuesConfigured({ "dues.enabled": "true", "dues.amountCents": "0" }),
    ).toBe(false);
  });

  it("is SHOWN only when dues are enabled with a positive amount", () => {
    expect(
      isDuesConfigured({ "dues.enabled": "true", "dues.amountCents": "5000" }),
    ).toBe(true);
  });
});
