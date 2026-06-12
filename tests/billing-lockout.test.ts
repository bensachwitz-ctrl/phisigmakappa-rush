import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEntitlement } from "@/lib/entitlement";
import { centralDb } from "@/lib/prisma";

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({}),
}));

describe("getEntitlement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns no_tenant_row for empty subdomain", async () => {
    const res = await getEntitlement("");
    expect(res.entitled).toBe(true);
    expect(res.reason).toBe("no_tenant_row");
  });

  it("handles trialing status correctly", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);

    vi.spyOn(centralDb.tenant, "findUnique").mockResolvedValue({
      id: "t1",
      subdomain: "test",
      name: "Test",
      school: "Test School",
      isActive: false,
      plan: "monthly",
      subscriptionStatus: "trialing",
      trialEndsAt: futureDate,
      stripeCustomerId: "cust_123",
      stripeSubscriptionId: "sub_123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await getEntitlement("test");
    expect(res.entitled).toBe(true);
    expect(res.reason).toBe("trialing");
    expect(res.status).toBe("trialing");
    expect(res.daysLeft).toBeGreaterThan(0);
  });

  it("handles active status correctly", async () => {
    vi.spyOn(centralDb.tenant, "findUnique").mockResolvedValue({
      id: "t1",
      subdomain: "test",
      name: "Test",
      school: "Test School",
      isActive: false,
      plan: "monthly",
      subscriptionStatus: "active",
      trialEndsAt: null,
      stripeCustomerId: "cust_123",
      stripeSubscriptionId: "sub_123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await getEntitlement("test");
    expect(res.entitled).toBe(true);
    expect(res.reason).toBe("subscribed");
    expect(res.status).toBe("active");
  });

  it("detects expired trial when status is null and trialEndsAt is in past", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    vi.spyOn(centralDb.tenant, "findUnique").mockResolvedValue({
      id: "t1",
      subdomain: "test",
      name: "Test",
      school: "Test School",
      isActive: true,
      plan: "monthly",
      subscriptionStatus: null,
      trialEndsAt: pastDate,
      stripeCustomerId: "cust_123",
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await getEntitlement("test");
    expect(res.entitled).toBe(true);
    expect(res.reason).toBe("trial_expired");
    expect(res.daysLeft).toBe(0);
  });

  it("detects canceled subscription", async () => {
    vi.spyOn(centralDb.tenant, "findUnique").mockResolvedValue({
      id: "t1",
      subdomain: "test",
      name: "Test",
      school: "Test School",
      isActive: true,
      plan: "monthly",
      subscriptionStatus: "canceled",
      trialEndsAt: null,
      stripeCustomerId: "cust_123",
      stripeSubscriptionId: "sub_123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await getEntitlement("test");
    expect(res.entitled).toBe(true);
    expect(res.reason).toBe("canceled");
    expect(res.status).toBe("canceled");
  });
});
