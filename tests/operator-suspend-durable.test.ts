import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// DURABLE OPERATOR HOLD (P1). Suspending a chapter WHILE it is pending-billing
// left it in a contradictory state — isActive=false AND
// billing.pendingActivation="true" — so the very next card-backed billing event
// (or the reconcile sweep) called publishTenantIfPendingBilling, saw the "true"
// flag, and silently REPUBLISHED the chapter the operator just took down.
//
// The fix: the platform-console suspend (PATCH /api/platform/tenants/[id] with
// isActive:false) ALSO clears the pending flag to "false", and
// publishTenantIfPendingBilling refuses unless the flag is "true". This drives the
// two steps end-to-end against a shared mutable flag/isActive state and proves the
// chapter STAYS down after a subsequent card-backed subscription event.
// ---------------------------------------------------------------------------

const state = vi.hoisted(() => ({ isActive: false, pendingFlag: "true" }));

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  siteConfigUpsert: vi.fn(),
  siteConfigFindUnique: vi.fn(),
  constructEvent: vi.fn(),
  customersRetrieve: vi.fn(),
  paymentMethodsList: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    tenant: {
      update: mocks.update,
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
    },
  },
  getTenantClient: () => ({
    siteConfig: {
      upsert: mocks.siteConfigUpsert,
      findUnique: mocks.siteConfigFindUnique,
    },
  }),
}));

vi.mock("@/lib/superadmin", () => ({ isSuperAdmin: () => true }));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    customers: { retrieve: mocks.customersRetrieve },
    paymentMethods: { list: mocks.paymentMethodsList },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  }),
}));

import { PATCH } from "@/app/api/platform/tenants/[id]/route";
import { POST as WEBHOOK_POST } from "@/app/api/platform/billing/webhook/route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  state.isActive = false;
  state.pendingFlag = "true";

  // Central row mock reflects the shared state; a mirror update (no isActive) never
  // changes isActive, while an explicit isActive set does.
  mocks.update.mockImplementation(async (a: any) => {
    const data = a?.data || {};
    if (typeof data.isActive === "boolean") state.isActive = data.isActive;
    return {
      id: "t1",
      subdomain: "phi_sig",
      name: null,
      school: null,
      isActive: state.isActive,
      createdAt: new Date().toISOString(),
    };
  });
  mocks.findUnique.mockImplementation(async () => ({ subdomain: "phi_sig", isActive: state.isActive }));
  mocks.findFirst.mockImplementation(async () => ({ subdomain: "phi_sig" }));
  mocks.siteConfigUpsert.mockImplementation(async (a: any) => {
    state.pendingFlag = a?.update?.value ?? state.pendingFlag;
    return {};
  });
  mocks.siteConfigFindUnique.mockImplementation(async () => ({ value: state.pendingFlag }));
  // Card is on file (so the only thing that could keep the chapter down is the
  // durable hold, not the absence of a card).
  mocks.customersRetrieve.mockResolvedValue({ invoice_settings: { default_payment_method: "pm_1" } });
});

function patchReq(isActive: boolean) {
  return new Request("https://greekstack.vercel.app/api/platform/tenants/t1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
}

function webhookReq() {
  return new Request("https://greekstack.vercel.app/api/platform/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig", "Content-Type": "application/json" },
    body: JSON.stringify({ dummy: true }),
  });
}

describe("operator suspend durably holds a pending chapter down", () => {
  it("clears the pending flag on suspend, then a card-backed subscription event does NOT republish", async () => {
    // STEP 1 — operator suspends the still-pending chapter.
    const patchRes = await PATCH(patchReq(false), { params: { id: "t1" } });
    expect(patchRes.status).toBe(200);
    // The pending flag was cleared to "false" so publish can never fire again.
    expect(mocks.siteConfigUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "billing.pendingActivation" },
        update: { value: "false" },
      }),
    );
    expect(state.pendingFlag).toBe("false");
    expect(state.isActive).toBe(false);

    // STEP 2 — a later card-backed ACTIVE subscription event arrives.
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          customer: "cust_1",
          default_payment_method: "pm_1",
          trial_end: null,
          metadata: { subdomain: "phi_sig", plan: "monthly" },
        },
      },
    });

    const webhookRes = await WEBHOOK_POST(webhookReq());
    expect(webhookRes.status).toBe(200);

    // The chapter STAYS down: no tenant.update ever flipped isActive back to true.
    const republished = mocks.update.mock.calls.some((c: any[]) => c[0]?.data?.isActive === true);
    expect(republished).toBe(false);
    expect(state.isActive).toBe(false);
  });
});
