import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// POST /api/platform/billing/webhook — CARD-ADDED-IN-PORTAL publish path.
//
// The shipped bug: a card-free MONTHLY chapter onboards on a TRIALING sub, so its
// /admin/billing shows "Manage billing" → the Stripe Billing Portal. Adding a card
// in the portal emits payment_method.attached / setup_intent.succeeded /
// customer.updated — NONE of which were handled — so the pending chapter stayed
// DARK until ~day-30 trial conversion. These pin the fix:
//   • payment_method.attached with a card on file PUBLISHES a pending chapter;
//   • setup_intent.succeeded publishes via the PM-LIST fallback (no default PM);
//   • customer.updated publishes when a default PM is now set;
//   • a still-card-free customer does NOT publish; and
//   • an operator hard-suspend (pending flag "false") is NEVER re-activated even
//     with a card on file.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  siteConfigFindUnique: vi.fn(),
  siteConfigUpsert: vi.fn(),
  constructEvent: vi.fn(),
  customersRetrieve: vi.fn(),
  paymentMethodsList: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    tenant: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
  getTenantClient: () => ({
    siteConfig: {
      findUnique: mocks.siteConfigFindUnique,
      upsert: mocks.siteConfigUpsert,
    },
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    customers: { retrieve: mocks.customersRetrieve },
    paymentMethods: { list: mocks.paymentMethodsList },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
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

/** The tenant.update call (if any) that flips the public site live. */
function publishCall() {
  return mocks.update.mock.calls.find((c: any[]) => c[0]?.data?.isActive === true);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  mocks.update.mockResolvedValue({});
  mocks.siteConfigUpsert.mockResolvedValue({});
  // A pending-billing chapter: not yet publicly live + the onboard pending flag.
  mocks.findUnique.mockResolvedValue({ subdomain: "freelaunch", isActive: false });
  mocks.findFirst.mockResolvedValue({ subdomain: "freelaunch" });
  mocks.siteConfigFindUnique.mockResolvedValue({ value: "true" });
});

describe("POST /api/platform/billing/webhook — portal card-add publishes a pending chapter", () => {
  it("publishes on payment_method.attached when the customer now has a default card", async () => {
    mocks.customersRetrieve.mockResolvedValue({
      invoice_settings: { default_payment_method: "pm_1" },
    });
    mocks.constructEvent.mockReturnValue({
      type: "payment_method.attached",
      data: { object: { id: "pm_1", customer: "cust_cf", metadata: {} } },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const call = publishCall();
    expect(call).toBeTruthy();
    expect(call![0].where).toEqual({ subdomain: "freelaunch" });
    expect(mocks.siteConfigUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "billing.pendingActivation" },
        update: { value: "false" },
      }),
    );
  });

  it("publishes on setup_intent.succeeded via the payment-method-list fallback (no default PM)", async () => {
    // No invoice-settings default PM, but a card IS attached → the PM-list fallback
    // in customerHasUsableCard finds it.
    mocks.customersRetrieve.mockResolvedValue({
      invoice_settings: { default_payment_method: null },
    });
    mocks.paymentMethodsList.mockResolvedValue({ data: [{ id: "pm_1" }] });
    mocks.constructEvent.mockReturnValue({
      type: "setup_intent.succeeded",
      data: {
        object: {
          id: "si_1",
          customer: "cust_cf",
          payment_method: "pm_1",
          metadata: { subdomain: "freelaunch" },
        },
      },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(publishCall()).toBeTruthy();
  });

  it("publishes on customer.updated when a default payment method is now set", async () => {
    mocks.customersRetrieve.mockResolvedValue({
      invoice_settings: { default_payment_method: "pm_1" },
    });
    mocks.constructEvent.mockReturnValue({
      type: "customer.updated",
      data: {
        object: {
          id: "cust_cf",
          metadata: { subdomain: "freelaunch" },
          invoice_settings: { default_payment_method: "pm_1" },
        },
      },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(publishCall()).toBeTruthy();
  });

  it("does NOT publish while the customer is still card-free (no default + empty PM list)", async () => {
    mocks.customersRetrieve.mockResolvedValue({
      invoice_settings: { default_payment_method: null },
    });
    mocks.paymentMethodsList.mockResolvedValue({ data: [] });
    mocks.constructEvent.mockReturnValue({
      type: "payment_method.attached",
      data: { object: { id: "pm_x", customer: "cust_cf", metadata: {} } },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(publishCall()).toBeUndefined();
    expect(mocks.siteConfigUpsert).not.toHaveBeenCalled();
  });

  it("does NOT re-activate an operator hard-suspend even with a card on file (flag not 'true')", async () => {
    mocks.siteConfigFindUnique.mockResolvedValue({ value: "false" });
    mocks.customersRetrieve.mockResolvedValue({
      invoice_settings: { default_payment_method: "pm_1" },
    });
    mocks.constructEvent.mockReturnValue({
      type: "payment_method.attached",
      data: { object: { id: "pm_1", customer: "cust_cf", metadata: {} } },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(publishCall()).toBeUndefined();
    expect(mocks.siteConfigUpsert).not.toHaveBeenCalled();
  });
});
