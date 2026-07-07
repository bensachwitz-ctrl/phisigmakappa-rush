import { describe, it, expect, vi, beforeEach } from "vitest";

// P0 #2 regression — non-atomic tenant provisioning / cross-tenant schema DROP.
//
// A double-submit races two provisioning requests for the SAME subdomain. Both
// read findUnique→null, both CREATE SCHEMA IF NOT EXISTS the same schema, then
// the central registry's unique constraint lets ONLY one win: the loser's
// central write throws P2002. In the buggy flow the registry write was LAST, so
// the loser's rollback ran `DROP SCHEMA ... CASCADE` on the WINNER's already-
// provisioned schema — catastrophic cross-tenant data loss.
//
// The fix reserves the subdomain with an ATOMIC central-registry create BEFORE
// any DDL/seed, so the loser fails the reservation up front (P2002) WITHOUT ever
// creating a schema, and the rollback drops a schema ONLY if THIS request
// created the registry row it owns. This test drives the real route as the race
// LOSER and asserts: clean 400 (not a 500 from a botched rollback) and — the
// load-bearing invariant — NO `DROP SCHEMA` is ever issued.

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
  mockStripeSubscriptionsCancel: vi.fn(),
  mockStripeCustomersDel: vi.fn(),
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
  return { PrismaClient: class { constructor() { return mockClient; } } };
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
    subscriptions: { cancel: mocks.mockStripeSubscriptionsCancel },
    customers: { del: mocks.mockStripeCustomersDel },
  }),
}));

import { POST } from "@/app/api/onboard/route";

function makeReq(overrides: Record<string, unknown>) {
  return new Request("https://greekstack.vercel.app/api/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgType: "fraternity",
      fraternityName: "Phi Sigma Kappa",
      greekLetters: "Epsilon Omega",
      schoolName: "Clemson University",
      adminName: "Jane Doe",
      adminEmail: "jane@clemson.edu",
      adminPassword: "ClemsonPassword123!",
      // dues_percentage avoids the Stripe path entirely — keeps the race test
      // focused on schema/registry ordering.
      plan: "dues_percentage",
      ...overrides,
    }),
  });
}

function issuedDropSchema(): boolean {
  return mocks.mockExecuteRawUnsafe.mock.calls
    .map((c) => String(c[0]))
    .some((sql) => /DROP\s+SCHEMA/i.test(sql));
}

describe("POST /api/onboard — concurrent double-provision (P0 #2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockExecuteRawUnsafe.mockResolvedValue(true);
    mocks.mockBrotherCreate.mockResolvedValue({ id: "brother-x" });
    mocks.mockPortalUserCreate.mockResolvedValue({ id: "portal-x" });
    mocks.mockUpsert.mockResolvedValue(true);
    mocks.mockSendEmail.mockResolvedValue({ ok: true });
    mocks.mockSendSalesEmail.mockResolvedValue({ ok: true });
    mocks.mockTenantUpdate.mockResolvedValue({ id: "tenant-x" });
    mocks.mockTenantDelete.mockResolvedValue({ id: "tenant-x" });
  });

  it("the race LOSER (P2002 reserving the subdomain) must NOT drop the winner's schema", async () => {
    // Both racers saw the subdomain free...
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    // ...but the central-registry unique constraint lets only one win; THIS
    // request is the loser — its registry write throws P2002.
    mocks.mockTenantCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const res = await POST(makeReq({ subdomain: "raced" }));

    // The loser is rejected cleanly as "already taken" (400), not a 500 from a
    // rollback that dropped a live schema.
    expect(res.status).toBe(400);

    // LOAD-BEARING INVARIANT: the loser must never DROP a schema (the winner
    // created/owns it) and must never delete the winner's registry row.
    expect(issuedDropSchema()).toBe(false);
    expect(mocks.mockTenantDelete).not.toHaveBeenCalled();
  });

  it("the race WINNER provisions fully and never drops its own schema", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue(null);
    mocks.mockTenantCreate.mockResolvedValue({ id: "tenant-winner" });

    const res = await POST(makeReq({ subdomain: "winner" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // A fully successful provision never rolls back — no schema is dropped.
    expect(issuedDropSchema()).toBe(false);
  });
});
