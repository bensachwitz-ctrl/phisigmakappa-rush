import { describe, it, expect, vi, beforeEach } from "vitest";

// ── /api/onboard DB-backed per-IP rate limiter (cross-instance) ──────────────
// Tenant provisioning is an OPEN, unauth endpoint that spins up a Postgres
// schema + ~42 tables per call. The limiter must hold a 5/IP/hour ceiling that
// works across a multi-instance serverless deploy — the prior in-memory Map
// reset per process and didn't. We now count recent rows in the central public
// "OnboardAttempt" table (centralDb.onboardAttempt) and record one per attempt.
// This suite proves: (1) 429 once the count hits the ceiling, (2) under the
// ceiling it records an attempt and proceeds, and (3) it fails OPEN on a DB
// error so a glitch never blocks a legitimate signup.

const mocks = vi.hoisted(() => ({
  attemptCount: vi.fn(async (): Promise<number> => 0),
  attemptCreate: vi.fn(async (): Promise<any> => ({ id: "att_1" })),
  tenantFindUnique: vi.fn(async (): Promise<any> => null),
  tenantCreate: vi.fn(async (): Promise<any> => ({ id: "tenant-1" })),
  executeRawUnsafe: vi.fn(async (): Promise<any> => true),
  brotherCreate: vi.fn(async (): Promise<any> => ({ id: "brother-1" })),
  portalUserCreate: vi.fn(async (): Promise<any> => ({ id: "portal-1" })),
  upsert: vi.fn(async (): Promise<any> => true),
  disconnect: vi.fn(async (): Promise<any> => true),
  sendEmail: vi.fn(async (): Promise<any> => ({ ok: true })),
  sendSalesEmail: vi.fn(async (): Promise<any> => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    onboardAttempt: { count: mocks.attemptCount, create: mocks.attemptCreate },
    tenant: { findUnique: mocks.tenantFindUnique, create: mocks.tenantCreate },
    $executeRawUnsafe: mocks.executeRawUnsafe,
  },
  prisma: {},
  getSubdomain: () => null,
}));

vi.mock("@prisma/client", () => {
  const mockClient = {
    siteConfig: { upsert: mocks.upsert },
    brother: { create: mocks.brotherCreate },
    portalUser: { create: mocks.portalUserCreate },
    $executeRawUnsafe: vi.fn(async () => true),
    $disconnect: mocks.disconnect,
  };
  return { PrismaClient: class { constructor() { return mockClient; } } };
});

vi.mock("@/lib/tenant-bootstrap", () => ({ ensureTenantRegistry: vi.fn(async () => true) }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/sales-contact", () => ({ sendSalesEmail: mocks.sendSalesEmail, salesContactEmail: () => "sales@greekstack.com" }));
vi.mock("@/lib/auth", () => ({ setBrotherCookie: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => null }));

import { POST } from "@/app/api/onboard/route";

function onboardReq(ip = "203.0.113.7") {
  return new Request("https://greekstack.vercel.app/api/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({
      subdomain: "ratelimited",
      orgType: "fraternity",
      fraternityName: "Phi Sigma Kappa",
      greekLetters: "Alpha Beta",
      schoolName: "Clemson University",
      adminName: "Jane Doe",
      adminEmail: "jane@clemson.edu",
      adminPassword: "ClemsonPassword123!",
      plan: "dues_percentage", // no Stripe path → isolates the limiter
    }),
  });
}

describe("POST /api/onboard — DB-backed per-IP rate limiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.attemptCount.mockResolvedValue(0);
    mocks.attemptCreate.mockResolvedValue({ id: "att_1" });
    mocks.tenantFindUnique.mockResolvedValue(null);
    mocks.tenantCreate.mockResolvedValue({ id: "tenant-1" });
    mocks.brotherCreate.mockResolvedValue({ id: "brother-1" });
    mocks.portalUserCreate.mockResolvedValue({ id: "portal-1" });
  });

  it("returns 429 once this IP has hit the 5/hour ceiling (counted in the shared table)", async () => {
    mocks.attemptCount.mockResolvedValue(5); // ceiling reached

    const res = await POST(onboardReq());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/too many/i);

    // The count was scoped to THIS IP within the window…
    expect(mocks.attemptCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ipAddress: "203.0.113.7",
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
    // …and a rate-limited request never provisions a tenant.
    expect(mocks.tenantCreate).not.toHaveBeenCalled();
    // …nor records a new attempt row (we're already over the ceiling).
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });

  it("under the ceiling: records one attempt row keyed by IP and proceeds", async () => {
    mocks.attemptCount.mockResolvedValue(2); // under 5

    const res = await POST(onboardReq());
    expect(res.status).toBe(200);

    expect(mocks.attemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ipAddress: "203.0.113.7" }) }),
    );
    expect(mocks.tenantCreate).toHaveBeenCalledTimes(1);
  });

  it("fails OPEN when the limiter DB read errors — signup is never blocked by a glitch", async () => {
    mocks.attemptCount.mockRejectedValue(new Error("db down"));

    const res = await POST(onboardReq());
    // Not a 429 — the request proceeds to provisioning.
    expect(res.status).toBe(200);
    expect(mocks.tenantCreate).toHaveBeenCalledTimes(1);
  });
});
