import { describe, it, expect, vi, beforeEach } from "vitest";

// Server-side feature-flag gate for GET /api/dues/me. When the chapter has NOT
// enabled online dues, the route must return 404 and serve NO dues data (the
// ledger query must not run) — the server half of "hide the Dues surface AND
// gate the dues API route." When enabled, it returns the brother's dues state.

const mocks = vi.hoisted(() => ({
  getCurrentBrother: vi.fn(),
  getSiteConfig: vi.fn(),
  duesPaymentFindMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentBrother: mocks.getCurrentBrother,
}));

vi.mock("@/lib/site-config", () => ({
  getSiteConfig: mocks.getSiteConfig,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    duesPayment: { findMany: mocks.duesPaymentFindMany },
  },
}));

import { GET } from "@/app/api/dues/me/route";

const BROTHER = {
  id: "brother-1",
  duesPaid: false,
  duesAmountCents: 50000,
  duesYear: "2026",
  duesPaidAt: null,
  duesPaymentMethod: null,
};

describe("GET /api/dues/me — dues feature-flag gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.duesPaymentFindMany.mockResolvedValue([]);
  });

  it("returns 401 when not signed in", async () => {
    mocks.getCurrentBrother.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 and serves NO dues data when the chapter dues flag is off", async () => {
    mocks.getCurrentBrother.mockResolvedValue(BROTHER);
    mocks.getSiteConfig.mockResolvedValue({ "dues.enabled": "false" });

    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    // The ledger must NOT be queried when dues is disabled.
    expect(mocks.duesPaymentFindMany).not.toHaveBeenCalled();
  });

  it("treats a MISSING dues.enabled key as disabled (fail-closed → 404)", async () => {
    mocks.getCurrentBrother.mockResolvedValue(BROTHER);
    mocks.getSiteConfig.mockResolvedValue({});
    const res = await GET();
    expect(res.status).toBe(404);
    expect(mocks.duesPaymentFindMany).not.toHaveBeenCalled();
  });

  it("returns the brother's dues state when the flag is on", async () => {
    mocks.getCurrentBrother.mockResolvedValue(BROTHER);
    mocks.getSiteConfig.mockResolvedValue({ "dues.enabled": "true" });
    mocks.duesPaymentFindMany.mockResolvedValue([
      {
        id: "pay-1",
        amountCents: 50000,
        currency: "usd",
        year: "2026",
        status: "PAID",
        method: "STRIPE",
        receiptUrl: "https://receipt",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.brother.id).toBe("brother-1");
    expect(body.payments).toHaveLength(1);
    expect(mocks.duesPaymentFindMany).toHaveBeenCalled();
  });
});
