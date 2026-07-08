import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// POST /api/platform/billing/webhook — CARD-REQUIRED-TO-PUBLISH publish step.
//
// A card-free MONTHLY chapter is provisioned NOT publicly live: central
// Tenant.isActive=false + a tenant SiteConfig "billing.pendingActivation"="true"
// flag (seeded at onboard). When it later adds billing via the platform-billing
// path, the webhook PUBLISHES it — flips isActive=true and clears the flag — so
// app/page.tsx begins serving the public site.
//
// These pin:
//   • a card-backed trialing subscription event PUBLISHES a pending chapter;
//   • a completed subscription Checkout PUBLISHES a pending chapter;
//   • an operator HARD-suspended chapter (no "true" pending flag) is NEVER
//     re-activated by a routine card-backed subscription event; and
//   • a still-card-free trialing event does NOT prematurely publish.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockTenantFindFirst: vi.fn(),
  mockTenantUpdate: vi.fn(),
  mockConstructEvent: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
  mockCustomersRetrieve: vi.fn(),
  mockSiteConfigFindUnique: vi.fn(),
  mockSiteConfigUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    tenant: {
      findUnique: mocks.mockTenantFindUnique,
      findFirst: mocks.mockTenantFindFirst,
      update: mocks.mockTenantUpdate,
    },
  },
  getTenantClient: () => ({
    siteConfig: {
      findUnique: mocks.mockSiteConfigFindUnique,
      upsert: mocks.mockSiteConfigUpsert,
    },
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.mockConstructEvent },
    subscriptions: { retrieve: mocks.mockSubscriptionsRetrieve },
    customers: { retrieve: mocks.mockCustomersRetrieve },
  }),
}));

import { POST } from "@/app/api/platform/billing/webhook/route";

function makeReq() {
  return new Request("https://greekstack.vercel.app/api/platform/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test", "Content-Type": "application/json" },
    body: JSON.stringify({ dummy: true }),
  });
}

/** Find the tenant.update call (if any) that flips the public site live. */
function publishCall() {
  return mocks.mockTenantUpdate.mock.calls.find(
    (c: any[]) => c[0]?.data?.isActive === true,
  );
}

describe("POST /api/platform/billing/webhook — publish pending-billing chapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.mockTenantUpdate.mockResolvedValue({});
    mocks.mockTenantFindFirst.mockResolvedValue(null);
    mocks.mockSiteConfigUpsert.mockResolvedValue({});
  });

  it("publishes a pending card-free monthly chapter when a card-backed trialing sub arrives", async () => {
    // Not-yet-live registry row + the onboard-seeded pending flag.
    mocks.mockTenantFindUnique.mockResolvedValue({ subdomain: "freelaunch", isActive: false });
    mocks.mockSiteConfigFindUnique.mockResolvedValue({ value: "true" });

    const sub = {
      id: "sub_cf",
      status: "trialing",
      customer: "cust_cf",
      default_payment_method: "pm_123", // a card is now attached
      trial_end: Math.floor(Date.now() / 1000) + 20 * 24 * 60 * 60,
      metadata: { subdomain: "freelaunch", plan: "monthly" },
    };
    mocks.mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: sub },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    // The public site is published: isActive flipped true for this chapter.
    const call = publishCall();
    expect(call).toBeTruthy();
    expect(call![0].where).toEqual({ subdomain: "freelaunch" });

    // The pending-activation flag is cleared so app/page.tsx serves the live site.
    expect(mocks.mockSiteConfigUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "billing.pendingActivation" },
        update: { value: "false" },
      }),
    );
  });

  it("publishes a pending chapter when a subscription Checkout completes", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({ subdomain: "freelaunch", isActive: false });
    mocks.mockSiteConfigFindUnique.mockResolvedValue({ value: "true" });
    mocks.mockSubscriptionsRetrieve.mockResolvedValue({ status: "active", trial_end: null });

    const session = {
      id: "cs_1",
      mode: "subscription",
      customer: "cust_cf",
      subscription: "sub_new",
      metadata: { subdomain: "freelaunch", plan: "monthly" },
    };
    mocks.mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: session },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const call = publishCall();
    expect(call).toBeTruthy();
    expect(call![0].where).toEqual({ subdomain: "freelaunch" });
  });

  it("does NOT re-activate an operator hard-suspended chapter (no pending flag)", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({ subdomain: "suspended", isActive: false });
    // Operator-suspended: the pending flag is not "true".
    mocks.mockSiteConfigFindUnique.mockResolvedValue({ value: "false" });

    const sub = {
      id: "sub_s",
      status: "active",
      customer: "cust_s",
      default_payment_method: "pm_9",
      trial_end: null,
      metadata: { subdomain: "suspended", plan: "monthly" },
    };
    mocks.mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: sub },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    // Never un-suspends: no update flips isActive true, and the flag is untouched.
    expect(publishCall()).toBeUndefined();
    expect(mocks.mockSiteConfigUpsert).not.toHaveBeenCalled();
  });

  it("does NOT publish while the trial is still card-free (no payment method yet)", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({ subdomain: "freelaunch", isActive: false });
    mocks.mockSiteConfigFindUnique.mockResolvedValue({ value: "true" });
    // No card on the sub AND none as the customer default.
    mocks.mockCustomersRetrieve.mockResolvedValue({ invoice_settings: { default_payment_method: null } });

    const sub = {
      id: "sub_cf",
      status: "trialing",
      customer: "cust_cf",
      default_payment_method: null,
      trial_end: Math.floor(Date.now() / 1000) + 20 * 24 * 60 * 60,
      metadata: { subdomain: "freelaunch", plan: "monthly" },
    };
    mocks.mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: sub },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    // Still card-free → stays pending (not published).
    expect(publishCall()).toBeUndefined();
    expect(mocks.mockSiteConfigUpsert).not.toHaveBeenCalled();
  });
});
