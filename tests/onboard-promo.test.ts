import { describe, it, expect, vi, beforeEach } from "vitest";

// ── P1 — promo PROMISE (email copy) must match the STRIPE EFFECT ──────────────
// The marketing codes (GREEKFREE / WELCOME100 / SILICON) are trial-length perks,
// not fee waivers. The welcome email promises "3 months free total" on MONTHLY —
// so the platform subscription must actually grant a 90-day trial (the real
// Stripe effect, no coupon). On ANNUAL the codes grant NO dollar-off (no coupon
// wired), so the email must state the real $800 charge and the yearly sub must
// carry NO coupon and NO trial. These tests pin BOTH sides — the email copy AND
// the subscription-create args — so the promise and the charge can never drift.

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

const MARKETING_CODES = ["GREEKFREE", "WELCOME100", "SILICON"] as const;

function baseBody(overrides: Record<string, unknown>) {
  return {
    orgType: "fraternity",
    fraternityName: "Phi Sigma Kappa",
    greekLetters: "Gamma Triton",
    schoolName: "University of South Carolina",
    adminName: "Alex Mercer",
    adminEmail: "alex@sc.edu",
    adminPassword: "Password123!",
    paymentMethodId: "pm_tok_visa",
    ...overrides,
  };
}

function primeMocks(subOverride?: Record<string, unknown>) {
  vi.clearAllMocks();
  mocks.mockTenantFindUnique.mockResolvedValue(null);
  mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
  mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-123" });
  mocks.mockTenantUpdate.mockResolvedValue({ id: "tenant-123" });
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
    trial_end: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
    ...subOverride,
  });
}

async function runOnboard(body: Record<string, unknown>) {
  const req = new Request("https://greekstack.vercel.app/api/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baseBody(body)),
  });
  const res = await POST(req);
  const json = await res.json();
  // The FIRST subscriptions.create call is always the platform subscription
  // (a monthly rush add-on, if any, is the second call).
  const platformSub = mocks.mockStripeSubscriptionsCreate.mock.calls[0]?.[0];
  const welcomeMail = mocks.mockSendEmail.mock.calls[0]?.[0];
  return { status: res.status, body: json, platformSub, welcomeMail };
}

describe("POST /api/onboard — promo email copy (unchanged public contract)", () => {
  beforeEach(() => primeMocks());

  it("provisions a chapter and saves promo code info when a valid code is supplied", async () => {
    const { status, body, welcomeMail } = await runOnboard({
      subdomain: "gammatriton",
      plan: "monthly",
      promoCode: "WELCOME100",
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    // Verify SiteConfig upsert was called with billing.promoCode
    const upsertCalls = mocks.mockUpsert.mock.calls;
    const promoCodeUpsert = upsertCalls.find((call: any) => call[0].where.key === "billing.promoCode");
    expect(promoCodeUpsert).toBeDefined();
    if (!promoCodeUpsert) throw new Error("billing.promoCode upsert not called");
    expect(promoCodeUpsert[0].create.value).toBe("WELCOME100");

    // Verify welcome email matches promo benefits (backed by the 90-day trial).
    expect(mocks.mockSendEmail).toHaveBeenCalledTimes(1);
    expect(welcomeMail.to).toBe("alex@sc.edu");
    expect(welcomeMail.html).toContain("WELCOME100");
    expect(welcomeMail.html).toContain("3 months free total");

    // Verify owner sales notification email has promo fields
    expect(mocks.mockSendSalesEmail).toHaveBeenCalledTimes(1);
    const salesMail = mocks.mockSendSalesEmail.mock.calls[0][0];
    const promoField = salesMail.fields.find((f: any) => f.label === "Promo Code");
    expect(promoField).toBeDefined();
    expect(promoField.value).toBe("WELCOME100 (Applied)");
  });
});

// ── The invariant: email PROMISE == STRIPE EFFECT, for each code × plan ───────
describe("POST /api/onboard — promo Stripe effect matches the email promise (P1)", () => {
  describe("MONTHLY: the '3 months free total' promise is a REAL 90-day trial (no coupon)", () => {
    for (const code of MARKETING_CODES) {
      it(`${code} → platform sub trial_period_days=90 and NO coupon`, async () => {
        primeMocks();
        const { status, platformSub, welcomeMail } = await runOnboard({
          subdomain: `m-${code.toLowerCase()}`,
          plan: "monthly",
          promoCode: code,
        });
        expect(status).toBe(200);
        // STRIPE EFFECT: the extended trial IS the perk — a genuine 90 days free.
        expect(platformSub.trial_period_days).toBe(90);
        // A marketing code is NOT a fee waiver, so NO coupon/promotion_code.
        expect(platformSub.discounts).toBeUndefined();
        expect((platformSub as any).coupon).toBeUndefined();
        expect((platformSub as any).promotion_code).toBeUndefined();
        // COPY matches the effect.
        expect(welcomeMail.html).toContain("3 months free total");
      });
    }

    it("NO promo → platform sub trial_period_days=30 (proves the promo actually changes it)", async () => {
      primeMocks({ trial_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 });
      const { status, platformSub, welcomeMail } = await runOnboard({
        subdomain: "m-noPromo",
        plan: "monthly",
      });
      expect(status).toBe(200);
      expect(platformSub.trial_period_days).toBe(30);
      expect(platformSub.discounts).toBeUndefined();
      expect(welcomeMail.html).not.toContain("3 months free total");
    });
  });

  describe("ANNUAL: the codes grant NO discount — copy states $800 and the sub carries NO coupon/trial", () => {
    for (const code of MARKETING_CODES) {
      it(`${code} → yearly sub has NO coupon, NO trial, and the email promises no $150-off`, async () => {
        primeMocks({ status: "active", trial_end: null });
        const { status, platformSub, welcomeMail } = await runOnboard({
          subdomain: `y-${code.toLowerCase()}`,
          plan: "yearly",
          promoCode: code,
        });
        expect(status).toBe(200);
        // STRIPE EFFECT: annual is charged in full — no coupon, no trial.
        expect(platformSub.discounts).toBeUndefined();
        expect((platformSub as any).coupon).toBeUndefined();
        expect(platformSub.trial_period_days).toBeUndefined();
        // COPY-TRUTH: no fabricated $150-off / $650 total; states the real $800.
        expect(welcomeMail.html).not.toContain("$150 off");
        expect(welcomeMail.html).not.toContain("$650");
        expect(welcomeMail.html).toContain("$800/year");
      });
    }
  });
});
