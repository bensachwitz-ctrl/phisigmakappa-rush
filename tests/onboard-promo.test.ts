import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mocks so they run before the module imports
const mocks = vi.hoisted(() => {
  return {
    mockTenantFindUnique: vi.fn(),
    mockTenantCreate: vi.fn(),
    mockExecuteRawUnsafe: vi.fn(),
    mockSendEmail: vi.fn(),
    mockSendSalesEmail: vi.fn(),
    mockUpsert: vi.fn(),
    mockBrotherCreate: vi.fn(),
    mockPortalUserCreate: vi.fn(),
    mockDisconnect: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    centralDb: {
      tenant: {
        findUnique: mocks.mockTenantFindUnique,
        create: mocks.mockTenantCreate,
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

import { POST } from "@/app/api/onboard/route";

describe("POST /api/onboard — Onboarding Promo Code Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions a chapter and saves promo code info when a valid code is supplied", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue(null); // Subdomain is free
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-123" });
    mocks.mockBrotherCreate.mockResolvedValue({ id: "brother-123" });
    mocks.mockPortalUserCreate.mockResolvedValue({ id: "portal-123" });
    mocks.mockSendEmail.mockResolvedValue({ ok: true });
    mocks.mockSendSalesEmail.mockResolvedValue({ ok: true });
    mocks.mockUpsert.mockResolvedValue(true);

    const req = new Request("https://greekstack.vercel.app/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subdomain: "gammatriton",
        orgType: "fraternity",
        fraternityName: "Phi Sigma Kappa",
        greekLetters: "Gamma Triton",
        schoolName: "University of South Carolina",
        adminName: "Alex Mercer",
        adminEmail: "alex@sc.edu",
        adminPassword: "Password123!",
        plan: "monthly",
        promoCode: "WELCOME100",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify SiteConfig upsert was called with billing.promoCode
    const upsertCalls = mocks.mockUpsert.mock.calls;
    const promoCodeUpsert = upsertCalls.find((call: any) => call[0].where.key === "billing.promoCode");
    expect(promoCodeUpsert).toBeDefined();
    expect(promoCodeUpsert[0].create.value).toBe("WELCOME100");

    // Verify welcome email matches promo benefits
    expect(mocks.mockSendEmail).toHaveBeenCalledTimes(1);
    const welcomeMail = mocks.mockSendEmail.mock.calls[0][0];
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
