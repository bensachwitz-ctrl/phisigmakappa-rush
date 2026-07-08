import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// POST /api/onboard — CARD-FREE MONTHLY provisioning + YEARLY card requirement.
//
// CARD-REQUIRED-TO-PUBLISH: a card-free MONTHLY signup is fully PROVISIONED (the
// founder can log into /admin) but its PUBLIC subdomain does NOT go live until
// billing is added. So this signup:
//   • creates a single trialing subscription with NO payment method and
//     trial_settings.end_behavior.missing_payment_method="cancel" (never silently
//     charges), skipping paymentMethods.attach / customers.update + the rush sub;
//   • reserves + finalizes the central registry row with isActive=FALSE (public
//     subdomain not yet live — it publishes later when billing lands);
//   • seeds the tenant "billing.pendingActivation"="true" flag so the public page
//     shows "launching soon — billing setup in progress"; and
//   • redirects the founder to /admin/billing (the "add billing to publish" step).
//   • MONTHLY with a paymentMethodId is billing-ready → live (onboard-stripe.test).
//   • YEARLY without a paymentMethodId is a hard 400 (it bills $800 today).
// The webhook side (adding billing later flips isActive=true) is covered in
// platform-billing-publish.test.ts.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockTenantCreate: vi.fn(),
  mockTenantUpdate: vi.fn(),
  mockTenantDelete: vi.fn(),
  mockExecuteRawUnsafe: vi.fn(),
  mockSendEmail: vi.fn(),
  mockSendSalesEmail: vi.fn(),
  mockUpsert: vi.fn(),
  mockBrotherCreate: vi.fn(),
  mockPortalUserCreate: vi.fn(),
  mockDisconnect: vi.fn(),
  mockStripeCustomersCreate: vi.fn(),
  mockStripeCustomersUpdate: vi.fn(),
  mockStripePaymentMethodsAttach: vi.fn(),
  mockStripeSubscriptionsCreate: vi.fn(),
  mockStripeSubscriptionsCancel: vi.fn(),
  mockStripeCustomersDel: vi.fn(),
  mockStripePricesList: vi.fn(),
  mockStripeProductsCreate: vi.fn(),
  mockStripePricesCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    tenant: {
      findUnique: mocks.mockTenantFindUnique,
      create: mocks.mockTenantCreate,
      update: mocks.mockTenantUpdate,
      delete: mocks.mockTenantDelete,
    },
    $executeRawUnsafe: mocks.mockExecuteRawUnsafe,
  },
  prisma: {},
  getSubdomain: () => null,
}));

vi.mock("@prisma/client", () => {
  const mockClient = {
    siteConfig: { upsert: mocks.mockUpsert },
    brother: { create: mocks.mockBrotherCreate },
    portalUser: { create: mocks.mockPortalUserCreate },
    $executeRawUnsafe: vi.fn().mockResolvedValue(true),
    $disconnect: mocks.mockDisconnect,
  };
  return {
    PrismaClient: class {
      constructor() {
        return mockClient;
      }
    },
  };
});

vi.mock("@/lib/tenant-bootstrap", () => ({
  ensureTenantRegistry: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/email", () => ({ sendEmail: mocks.mockSendEmail }));

vi.mock("@/lib/sales-contact", () => ({
  sendSalesEmail: mocks.mockSendSalesEmail,
  salesContactEmail: () => "sales@greekstack.com",
}));

vi.mock("@/lib/auth", () => ({ setBrotherCookie: vi.fn() }));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: {
      create: mocks.mockStripeCustomersCreate,
      update: mocks.mockStripeCustomersUpdate,
      del: mocks.mockStripeCustomersDel,
    },
    paymentMethods: { attach: mocks.mockStripePaymentMethodsAttach },
    subscriptions: {
      create: mocks.mockStripeSubscriptionsCreate,
      cancel: mocks.mockStripeSubscriptionsCancel,
    },
    prices: { list: mocks.mockStripePricesList, create: mocks.mockStripePricesCreate },
    products: { create: mocks.mockStripeProductsCreate },
  }),
}));

import { POST } from "@/app/api/onboard/route";

function baseBody(overrides: Record<string, unknown>) {
  return {
    orgType: "fraternity",
    fraternityName: "Phi Sigma Kappa",
    greekLetters: "Epsilon Omega",
    schoolName: "Clemson University",
    adminName: "Jane Doe",
    adminEmail: "jane@clemson.edu",
    adminPassword: "ClemsonPassword123!",
    ...overrides,
  };
}

describe("POST /api/onboard — card-free MONTHLY launch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-cf" });
    mocks.mockTenantUpdate.mockResolvedValue({ id: "tenant-cf" });
    mocks.mockBrotherCreate.mockResolvedValue({ id: "brother-cf" });
    mocks.mockPortalUserCreate.mockResolvedValue({ id: "portal-cf" });
    mocks.mockSendEmail.mockResolvedValue({ ok: true });
    mocks.mockSendSalesEmail.mockResolvedValue({ ok: true });
    mocks.mockUpsert.mockResolvedValue(true);
    mocks.mockStripeCustomersCreate.mockResolvedValue({ id: "cust_cf" });
    mocks.mockStripePricesList.mockResolvedValue({ data: [{ id: "price_cf" }] });
    mocks.mockStripeSubscriptionsCreate.mockResolvedValue({
      id: "sub_cf",
      status: "trialing",
      trial_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    });
  });

  it("launches monthly without a card: one trialing sub, no attach/update, safe trial_settings", async () => {
    const req = new Request("https://greekstack.vercel.app/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baseBody({ subdomain: "freelaunch", plan: "monthly" })),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // A customer is still created (so the chapter can add a card later)...
    expect(mocks.mockStripeCustomersCreate).toHaveBeenCalledTimes(1);
    // ...but with no card there is nothing to attach or set as default.
    expect(mocks.mockStripePaymentMethodsAttach).not.toHaveBeenCalled();
    expect(mocks.mockStripeCustomersUpdate).not.toHaveBeenCalled();

    // Exactly ONE subscription (no rush add-on without a card).
    expect(mocks.mockStripeSubscriptionsCreate).toHaveBeenCalledTimes(1);
    const subArg = mocks.mockStripeSubscriptionsCreate.mock.calls[0][0];
    expect(subArg.trial_period_days).toBe(30);
    // Safe end-behavior: cancel (never silently charge) if no PM by trial end.
    expect(subArg.trial_settings?.end_behavior?.missing_payment_method).toBe("cancel");

    // CARD-REQUIRED-TO-PUBLISH — a card-free monthly chapter is provisioned but
    // its PUBLIC subdomain is NOT live yet: the reserved registry row is created
    // with isActive=false...
    expect(mocks.mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subdomain: "freelaunch",
          isActive: false,
          plan: "monthly",
        }),
      }),
    );
    // ...and the final row update KEEPS isActive=false (still not publicly live),
    // while recording the customer + trialing status under the monthly plan.
    expect(mocks.mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subdomain: "freelaunch" },
        data: expect.objectContaining({
          isActive: false,
          stripeCustomerId: "cust_cf",
          stripeSubscriptionId: "sub_cf",
          subscriptionStatus: "trialing",
          plan: "monthly",
        }),
      }),
    );

    // The pending-publication signal is seeded in the tenant schema so app/page.tsx
    // shows the "launching soon — billing setup in progress" page (not the
    // operator-suspend page) and the webhook can clear it on publish.
    expect(mocks.mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "billing.pendingActivation" },
        update: { value: "true" },
        create: { key: "billing.pendingActivation", value: "true" },
      }),
    );

    // The founder is redirected to /admin/billing (the "add billing to publish"
    // step), NOT straight to the dashboard.
    expect(String(body.url)).toMatch(/\/admin\/billing$/);
  });
});

describe("POST /api/onboard — YEARLY still requires a card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockUpsert.mockResolvedValue(true);
    mocks.mockBrotherCreate.mockResolvedValue({ id: "b" });
    mocks.mockPortalUserCreate.mockResolvedValue({ id: "p" });
    mocks.mockStripeSubscriptionsCancel.mockResolvedValue({ id: "sub_x", status: "canceled" });
    mocks.mockStripeCustomersDel.mockResolvedValue({ id: "cust_x", deleted: true });
  });

  it("rejects yearly without a paymentMethodId (400) and creates no subscription", async () => {
    const req = new Request("https://greekstack.vercel.app/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baseBody({ subdomain: "yearlynoCard", plan: "yearly" })),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(String(body.error)).toMatch(/payment method is required|Annual plan/i);
    expect(mocks.mockStripeSubscriptionsCreate).not.toHaveBeenCalled();
    // The half-created schema is rolled back (DROP SCHEMA issued on the central db).
    const dropped = mocks.mockExecuteRawUnsafe.mock.calls
      .map((c) => String(c[0]))
      .some((sql) => /DROP SCHEMA IF EXISTS/i.test(sql));
    expect(dropped).toBe(true);
  });
});
