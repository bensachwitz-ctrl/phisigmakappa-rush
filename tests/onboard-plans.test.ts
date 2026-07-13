import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// POST /api/onboard — every selectable plan funnel, end-to-end.
//
// The wizard offers five launch funnels; this exercises each one through the
// real route handler (Prisma + Stripe mocked) and asserts the plan-specific
// billing behavior + the registry row the chapter is provisioned with:
//
//   • monthly + card     → customer created, card attached + set default,
//                          platform sub created (status from Stripe), plan
//                          "monthly". (card-free monthly is covered separately
//                          in onboard-card-free.test.ts.)
//   • yearly  + card     → immediate billing, sub created, plan "yearly",
//                          status "active". (yearly w/o card → 400, also in
//                          onboard-card-free.test.ts.)
//   • dues_percentage    → NO Stripe subscription (dues-share waives the
//                          platform fee), status "active", dues.enabled=true.
//   • custom             → NO Stripe subscription (talk-to-sales build),
//                          status "active", no trial end date.
//
// These lock in that a non-subscription plan never touches Stripe billing and
// that a subscription plan always does — the exact distinction a regression
// could silently break.
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

function makeReq(body: Record<string, unknown>) {
  return new Request("https://greekstack.vercel.app/api/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baseBody(body)),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockTenantFindUnique.mockResolvedValue(null);
  mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
  mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-x" });
  mocks.mockTenantUpdate.mockResolvedValue({ id: "tenant-x" });
  mocks.mockBrotherCreate.mockResolvedValue({ id: "brother-x" });
  mocks.mockPortalUserCreate.mockResolvedValue({ id: "portal-x" });
  mocks.mockSendEmail.mockResolvedValue({ ok: true });
  mocks.mockSendSalesEmail.mockResolvedValue({ ok: true });
  mocks.mockUpsert.mockResolvedValue(true);
  mocks.mockStripeCustomersCreate.mockResolvedValue({ id: "cust_x" });
  mocks.mockStripePricesList.mockResolvedValue({ data: [{ id: "price_x" }] });
  mocks.mockStripeSubscriptionsCreate.mockResolvedValue({
    id: "sub_x",
    status: "active",
    trial_end: null,
  });
});

describe("POST /api/onboard — plan funnels", () => {
  it("monthly + card: attaches the card, sets it default, and creates a subscription", async () => {
    const res = await POST(
      makeReq({ subdomain: "monthlycard", plan: "monthly", paymentMethodId: "pm_card_123" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(mocks.mockStripeCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockStripePaymentMethodsAttach).toHaveBeenCalledWith(
      "pm_card_123",
      expect.objectContaining({ customer: "cust_x" }),
    );
    expect(mocks.mockStripeCustomersUpdate).toHaveBeenCalledWith(
      "cust_x",
      expect.objectContaining({
        invoice_settings: expect.objectContaining({ default_payment_method: "pm_card_123" }),
      }),
    );
    // At least the platform subscription is created (a rush add-on may follow).
    expect(mocks.mockStripeSubscriptionsCreate.mock.calls.length).toBeGreaterThanOrEqual(1);
    const platformSub = mocks.mockStripeSubscriptionsCreate.mock.calls[0][0];
    expect(platformSub.trial_period_days).toBe(30);

    // Stripe ids land on the FINAL update (row reserved via create up front).
    expect(mocks.mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subdomain: "monthlycard" },
        data: expect.objectContaining({ plan: "monthly", stripeCustomerId: "cust_x" }),
      }),
    );
  });

  it("yearly + card: bills immediately (active) and creates a subscription", async () => {
    const res = await POST(
      makeReq({ subdomain: "yearlycard", plan: "yearly", paymentMethodId: "pm_card_456" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(mocks.mockStripeCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockStripePaymentMethodsAttach).toHaveBeenCalledWith(
      "pm_card_456",
      expect.objectContaining({ customer: "cust_x" }),
    );
    expect(mocks.mockStripeSubscriptionsCreate).toHaveBeenCalledTimes(1);
    // Yearly has no free trial — the platform sub is created without a trial.
    const yearlySub = mocks.mockStripeSubscriptionsCreate.mock.calls[0][0];
    expect(yearlySub.trial_period_days).toBeUndefined();

    expect(mocks.mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: "yearly" }) }),
    );
  });

  it("dues-share: waives the platform fee — no Stripe subscription, active status", async () => {
    const res = await POST(makeReq({ subdomain: "duesshare", plan: "dues_percentage" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // A dues-share plan is NOT a platform subscription — Stripe billing is
    // never touched for the platform fee at onboarding time.
    expect(mocks.mockStripeSubscriptionsCreate).not.toHaveBeenCalled();
    expect(mocks.mockStripePaymentMethodsAttach).not.toHaveBeenCalled();

    expect(mocks.mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: "dues_percentage",
          subscriptionStatus: "active",
          stripeSubscriptionId: null,
        }),
      }),
    );
  });

  it("dues-share via collectDues toggle: waives platform fee and flags dues for setup", async () => {
    const res = await POST(
      makeReq({ subdomain: "duessharetoggle", plan: "dues_percentage", collectDues: true }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // No platform subscription is created for dues-share; no card is attached.
    expect(mocks.mockStripeSubscriptionsCreate).not.toHaveBeenCalled();
    expect(mocks.mockStripePaymentMethodsAttach).not.toHaveBeenCalled();

    expect(mocks.mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: "dues_percentage",
          subscriptionStatus: "active",
          stripeSubscriptionId: null,
        }),
      }),
    );

    // The tenant config flags online dues collection as pending owner setup.
    const cfg = Object.fromEntries(
      mocks.mockUpsert.mock.calls.map((c: any) => [c[0].where.key, c[0].create.value]),
    );
    expect(cfg["dues.enabled"]).toBe("true");
    expect(cfg["dues.collectThroughGreekStack"]).toBe("true");
    expect(cfg["dues.setupStatus"]).toBe("pending_owner_setup");
  });

  it("custom: talk-to-sales build — no Stripe subscription, active, no trial end", async () => {
    const res = await POST(makeReq({ subdomain: "custombuild", plan: "custom" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(mocks.mockStripeSubscriptionsCreate).not.toHaveBeenCalled();
    expect(mocks.mockStripePaymentMethodsAttach).not.toHaveBeenCalled();

    expect(mocks.mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: "custom",
          subscriptionStatus: "active",
          trialEndsAt: null,
        }),
      }),
    );
  });
});
