import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  return {
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
    mockStripePricesList: vi.fn(),
    mockStripeProductsCreate: vi.fn(),
    mockStripePricesCreate: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
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
  };
});

vi.mock("@prisma/client", () => {
  const mockClient = {
    siteConfig: {
      upsert: mocks.mockUpsert,
    },
    brother: {
      create: mocks.mockBrotherCreate,
    },
    portalUser: {
      create: mocks.mockPortalUserCreate,
    },
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

vi.mock("@/lib/tenant-bootstrap", () => {
  return {
    ensureTenantRegistry: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("@/lib/email", () => {
  return {
    sendEmail: mocks.mockSendEmail,
  };
});

vi.mock("@/lib/sales-contact", () => {
  return {
    sendSalesEmail: mocks.mockSendSalesEmail,
    salesContactEmail: () => "sales@greekstack.com",
  };
});

vi.mock("@/lib/auth", () => {
  return {
    setBrotherCookie: vi.fn(),
  };
});

// Mock Stripe library client
vi.mock("@/lib/stripe", () => {
  return {
    getStripe: () => ({
      customers: {
        create: mocks.mockStripeCustomersCreate,
        update: mocks.mockStripeCustomersUpdate,
      },
      paymentMethods: {
        attach: mocks.mockStripePaymentMethodsAttach,
      },
      subscriptions: {
        create: mocks.mockStripeSubscriptionsCreate,
      },
      prices: {
        list: mocks.mockStripePricesList,
        create: mocks.mockStripePricesCreate,
      },
      products: {
        create: mocks.mockStripeProductsCreate,
      },
    }),
  };
});

import { POST } from "@/app/api/onboard/route";

describe("POST /api/onboard — Stripe Onboarding Payment Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles stripe customer, card attachment, and subscription setup for monthly plan", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-123" });
    mocks.mockBrotherCreate.mockResolvedValue({ id: "brother-123" });
    mocks.mockPortalUserCreate.mockResolvedValue({ id: "portal-123" });
    mocks.mockSendEmail.mockResolvedValue({ ok: true });
    mocks.mockSendSalesEmail.mockResolvedValue({ ok: true });
    mocks.mockUpsert.mockResolvedValue(true);

    mocks.mockStripeCustomersCreate.mockResolvedValue({ id: "cust_123" });
    mocks.mockStripeCustomersUpdate.mockResolvedValue({ id: "cust_123" });
    mocks.mockStripePaymentMethodsAttach.mockResolvedValue({ id: "pm_123" });
    mocks.mockStripePricesList.mockResolvedValue({ data: [{ id: "price_123" }] });
    mocks.mockStripeSubscriptionsCreate.mockResolvedValue({
      id: "sub_123",
      status: "trialing",
      trial_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    });

    const req = new Request("https://greekstack.vercel.app/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subdomain: "epsilonomega",
        orgType: "fraternity",
        fraternityName: "Phi Sigma Kappa",
        greekLetters: "Epsilon Omega",
        schoolName: "Clemson University",
        adminName: "Jane Doe",
        adminEmail: "jane@clemson.edu",
        adminPassword: "ClemsonPassword123!",
        plan: "monthly",
        paymentMethodId: "pm_tok_visa",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify Stripe customer was created
    expect(mocks.mockStripeCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "jane@clemson.edu",
        name: "Jane Doe (Phi Sigma Kappa)",
      })
    );

    // Verify PaymentMethod was attached
    expect(mocks.mockStripePaymentMethodsAttach).toHaveBeenCalledWith("pm_tok_visa", {
      customer: "cust_123",
    });

    // Verify Customer's default payment method was set
    expect(mocks.mockStripeCustomersUpdate).toHaveBeenCalledWith("cust_123", {
      invoice_settings: {
        default_payment_method: "pm_tok_visa",
      },
    });

    // Verify subscriptions were created (both monthly main plan + rush cycle)
    expect(mocks.mockStripeSubscriptionsCreate).toHaveBeenCalledTimes(2);

    // Verify the reserved central registry row was FINALIZED (update) with the
    // Stripe fields. The subdomain is reserved via tenant.create up front (before
    // any DDL/seed); the Stripe ids + refined status land via tenant.update.
    expect(mocks.mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subdomain: "epsilonomega" },
        data: expect.objectContaining({
          stripeCustomerId: "cust_123",
          stripeSubscriptionId: "sub_123",
          subscriptionStatus: "trialing",
          plan: "monthly",
        }),
      })
    );
    // And the up-front reservation create ran exactly once, before provisioning.
    expect(mocks.mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subdomain: "epsilonomega", plan: "monthly" }),
      })
    );
  });

  it("provisions the chapter with active subscription status and no Stripe calls for dues_percentage plan", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-456" });
    mocks.mockBrotherCreate.mockResolvedValue({ id: "brother-456" });
    mocks.mockPortalUserCreate.mockResolvedValue({ id: "portal-456" });
    mocks.mockSendEmail.mockResolvedValue({ ok: true });
    mocks.mockSendSalesEmail.mockResolvedValue({ ok: true });
    mocks.mockUpsert.mockResolvedValue(true);

    const req = new Request("https://greekstack.vercel.app/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subdomain: "sigmaomega",
        orgType: "fraternity",
        fraternityName: "Phi Sigma Kappa",
        greekLetters: "Sigma Omega",
        schoolName: "Clemson University",
        adminName: "Jane Doe",
        adminEmail: "jane@clemson.edu",
        adminPassword: "ClemsonPassword123!",
        plan: "dues_percentage",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify Stripe customer creation was NOT called
    expect(mocks.mockStripeCustomersCreate).not.toHaveBeenCalled();

    // Verify centralDb tenant registry was created with active status and dues_percentage plan
    expect(mocks.mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: "active",
          plan: "dues_percentage",
        }),
      })
    );

    // Verify siteConfig was updated with dues.enabled: "true"
    expect(mocks.mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "dues.enabled" },
        update: { value: "true" },
        create: { key: "dues.enabled", value: "true" },
      })
    );
  });
});
