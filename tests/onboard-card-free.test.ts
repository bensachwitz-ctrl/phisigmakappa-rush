import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// POST /api/onboard — CARD REQUIRED at signup for any charging subscription
// plan (P2a). The owner's spec is "require a card, first month free, don't
// charge month 1": the free first month is delivered by the trial
// (trial_period_days), NOT by launching card-free. So the SERVER now rejects a
// subscription-plan signup (monthly OR yearly) that arrives without a
// paymentMethodId — closing the direct-API hole where a card-free monthly POST
// still provisioned a dark (isActive=false) chapter.
//   • MONTHLY without a card  → hard 400 (was a card-free "dark launch").
//   • YEARLY  without a card  → hard 400 (it bills $800 today, no trial).
//   • MONTHLY / YEARLY with a card → provisioned + billed (onboard-stripe /
//     onboard-plans cover the happy path).
// The SINGLE deliberate exception is a full-fee-waiver chapter (owes $0 forever
// via the 100%-off coupon); it is not exercised here (see promo-fee-waiver).
// Both rejections happen AFTER schema creation and roll the schema back cleanly,
// and neither creates a Stripe customer/subscription.
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

function issuedDropSchema(): boolean {
  return mocks.mockExecuteRawUnsafe.mock.calls
    .map((c) => String(c[0]))
    .some((sql) => /DROP SCHEMA IF EXISTS/i.test(sql));
}

describe("POST /api/onboard — MONTHLY without a card is rejected (P2a)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-cf" });
    mocks.mockTenantUpdate.mockResolvedValue({ id: "tenant-cf" });
    mocks.mockTenantDelete.mockResolvedValue({ id: "tenant-cf" });
    mocks.mockBrotherCreate.mockResolvedValue({ id: "brother-cf" });
    mocks.mockPortalUserCreate.mockResolvedValue({ id: "portal-cf" });
    mocks.mockSendEmail.mockResolvedValue({ ok: true });
    mocks.mockSendSalesEmail.mockResolvedValue({ ok: true });
    mocks.mockUpsert.mockResolvedValue(true);
    mocks.mockStripeSubscriptionsCancel.mockResolvedValue({ id: "sub_x", status: "canceled" });
    mocks.mockStripeCustomersDel.mockResolvedValue({ id: "cust_x", deleted: true });
  });

  it("rejects a card-free monthly signup (400), creates no Stripe customer/subscription, and rolls back the schema", async () => {
    const req = new Request("https://greekstack.vercel.app/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baseBody({ subdomain: "freelaunch", plan: "monthly" })),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(String(body.error)).toMatch(/payment method is required/i);

    // The card is required BEFORE any Stripe object is created — no customer,
    // no subscription (so nothing is billed and nothing needs Stripe rollback).
    expect(mocks.mockStripeCustomersCreate).not.toHaveBeenCalled();
    expect(mocks.mockStripeSubscriptionsCreate).not.toHaveBeenCalled();

    // The half-created schema is rolled back so the subdomain frees up cleanly.
    expect(issuedDropSchema()).toBe(true);
  });
});

describe("POST /api/onboard — YEARLY still requires a card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockUpsert.mockResolvedValue(true);
    mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-y" });
    mocks.mockTenantUpdate.mockResolvedValue({ id: "tenant-y" });
    mocks.mockTenantDelete.mockResolvedValue({ id: "tenant-y" });
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
    expect(issuedDropSchema()).toBe(true);
  });
});
