import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// lib/tenant-bootstrap.ts — the central-registry self-heal for fresh deploys
// that never ran `prisma db push` against public.
//
// REGRESSION GUARD: the original bootstrap created public."Tenant" with ONLY
// the base columns (id/subdomain/domain/name/school/isActive/created/updated).
// But the live /onboard route's tenant.create writes the platform-billing
// columns too (stripeCustomerId / stripeSubscriptionId / subscriptionStatus /
// trialEndsAt / plan). On a fresh deploy the self-heal therefore produced a
// table MISSING those columns, and the very FIRST signup 500'd with
// 'column "plan" of relation "Tenant" does not exist'. The bootstrap now also
// runs an idempotent ADD COLUMN IF NOT EXISTS for each billing column.
//
// We assert the executed DDL covers all five billing columns + the index, so a
// future edit that drops one fails here instead of in production on day one.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  executeRawUnsafe: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    $executeRawUnsafe: mocks.executeRawUnsafe,
  },
}));

describe("ensureTenantRegistry — bootstraps billing columns idempotently", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("runs ADD COLUMN IF NOT EXISTS for every platform-billing column", async () => {
    // Import fresh so the module-level bootstrap memo starts unset for this test.
    const { ensureTenantRegistry } = await import("@/lib/tenant-bootstrap");
    await ensureTenantRegistry();

    const allSql = mocks.executeRawUnsafe.mock.calls.map((c) => String(c[0])).join("\n");

    // Base table + unique index still created.
    expect(allSql).toMatch(/CREATE TABLE IF NOT EXISTS public\."Tenant"/);
    expect(allSql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_subdomain_key"/);

    // Every billing column tenant.create writes is added idempotently.
    for (const col of [
      "stripeCustomerId",
      "stripeSubscriptionId",
      "subscriptionStatus",
      "trialEndsAt",
      "plan",
    ]) {
      expect(allSql).toMatch(
        new RegExp(`ADD COLUMN IF NOT EXISTS "${col}"`),
      );
    }

    // The stripeCustomerId lookup index (mirrors the Prisma @@index) is present.
    expect(allSql).toMatch(/CREATE INDEX IF NOT EXISTS "Tenant_stripeCustomerId_idx"/);
  });

  it("runs the DDL at most once per process (memoized)", async () => {
    const { ensureTenantRegistry } = await import("@/lib/tenant-bootstrap");
    await ensureTenantRegistry();
    const callsAfterFirst = mocks.executeRawUnsafe.mock.calls.length;
    await ensureTenantRegistry();
    await ensureTenantRegistry();
    // No additional DDL round-trips on subsequent calls.
    expect(mocks.executeRawUnsafe.mock.calls.length).toBe(callsAfterFirst);
  });
});
