import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression coverage for the double-billing guard in
// app/api/admin/billing/checkout/route.ts. A chapter that ALREADY has a live
// platform subscription must NOT be able to mint a second Checkout session
// (which would create a duplicate subscription and bill them twice). The guard
// re-verifies against Stripe (read-only) so a stale local mirror never wrongly
// blocks: only an actually-live subscription returns 409.

const mocks = vi.hoisted(() => ({
  isAdminRole: vi.fn(() => true),
  isSameOrigin: vi.fn(() => true),
  getCurrentBrother: vi.fn(async () => ({ email: "admin@chapter.org" })),
  getSubdomain: vi.fn(() => "alpha"),
  headersGet: vi.fn(() => "alpha.greekstack.app"),
  tenantFindUnique: vi.fn(),
  tenantCreate: vi.fn(),
  tenantUpdate: vi.fn(async () => ({})),
  subscriptionsRetrieve: vi.fn(),
  checkoutCreate: vi.fn(async () => ({ id: "cs_1", url: "https://checkout.stripe/cs_1" })),
  customersRetrieve: vi.fn(),
  customersCreate: vi.fn(async () => ({ id: "cus_new" })),
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: mocks.headersGet }),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    tenant: {
      findUnique: mocks.tenantFindUnique,
      create: mocks.tenantCreate,
      update: mocks.tenantUpdate,
    },
  },
  getSubdomain: mocks.getSubdomain,
}));

vi.mock("@/lib/auth", () => ({
  isAdminRole: mocks.isAdminRole,
  isSameOrigin: mocks.isSameOrigin,
  getCurrentBrother: mocks.getCurrentBrother,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    customers: { retrieve: mocks.customersRetrieve, create: mocks.customersCreate },
    checkout: { sessions: { create: mocks.checkoutCreate } },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  errorSink: vi.fn(),
}));

import { POST } from "@/app/api/admin/billing/checkout/route";

function req(body: unknown = { plan: "monthly" }) {
  return new Request("https://alpha.greekstack.app/api/admin/billing/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("billing checkout double-billing guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdminRole.mockReturnValue(true);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getSubdomain.mockReturnValue("alpha");
    mocks.headersGet.mockReturnValue("alpha.greekstack.app");
    mocks.customersRetrieve.mockResolvedValue({ id: "cus_existing", deleted: false });
  });

  it("blocks (409) when a live active subscription already exists", async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: "t1", name: "Alpha", plan: "monthly",
      stripeCustomerId: "cus_existing", stripeSubscriptionId: "sub_live",
      subscriptionStatus: "active",
    });
    mocks.subscriptionsRetrieve.mockResolvedValue({ id: "sub_live", status: "active" });

    const res = await POST(req());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("already_subscribed");
    // Crucially: NO new checkout session was created.
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("blocks (409) for a live trialing subscription", async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: "t1", name: "Alpha", plan: "monthly",
      stripeCustomerId: "cus_existing", stripeSubscriptionId: "sub_trial",
      subscriptionStatus: "trialing",
    });
    mocks.subscriptionsRetrieve.mockResolvedValue({ id: "sub_trial", status: "trialing" });

    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("allows checkout when the stored subscription is canceled at Stripe (stale mirror)", async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: "t1", name: "Alpha", plan: "monthly",
      stripeCustomerId: "cus_existing", stripeSubscriptionId: "sub_dead",
      subscriptionStatus: "active", // local mirror is stale...
    });
    // ...but Stripe says it's actually canceled.
    mocks.subscriptionsRetrieve.mockResolvedValue({ id: "sub_dead", status: "canceled" });

    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mocks.checkoutCreate).toHaveBeenCalledTimes(1);
  });

  it("allows checkout when Stripe no longer recognizes the stored subscription id", async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: "t1", name: "Alpha", plan: "monthly",
      stripeCustomerId: "cus_existing", stripeSubscriptionId: "sub_gone",
      subscriptionStatus: "active",
    });
    mocks.subscriptionsRetrieve.mockRejectedValue(new Error("No such subscription"));

    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mocks.checkoutCreate).toHaveBeenCalledTimes(1);
  });

  it("allows checkout for a brand-new chapter with no subscription on record", async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: "t1", name: "Alpha", plan: "monthly",
      stripeCustomerId: "cus_existing", stripeSubscriptionId: null,
      subscriptionStatus: null,
    });

    const res = await POST(req());
    expect(res.status).toBe(200);
    // Never even hit Stripe for a retrieve since there's no subscription id.
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mocks.checkoutCreate).toHaveBeenCalledTimes(1);
  });
});
