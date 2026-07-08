import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// lib/prisma — forEachTenantIncludingInactive (P2). forEachTenant iterates ACTIVE
// tenants only (where:{isActive:true}), so the manual schema-migration applier
// never healed a schema provisioned before a migration landed if that chapter
// wasn't active yet (pending-billing / suspended). This pins the inactive-inclusive
// iterator: it reads the registry WITHOUT an isActive filter, runs the callback for
// EVERY row (including inactive), and isolates a per-tenant failure.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

// Mock the Prisma client so lib/prisma's `new PrismaClient()` (centralDb) + every
// getTenantClient() resolve to a stub exposing tenant.findMany.
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return { tenant: { findMany: mocks.findMany } } as any;
    }
  },
}));

import { forEachTenantIncludingInactive } from "@/lib/prisma";

beforeEach(() => vi.clearAllMocks());

describe("forEachTenantIncludingInactive", () => {
  it("reaches EVERY chapter — including an inactive/pending one — and does NOT filter by isActive", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "1", subdomain: "livechap", name: "Live", school: "X", isActive: true },
      { id: "2", subdomain: "pendingchap", name: "Pending", school: "Y", isActive: false },
    ]);

    const seen: Array<{ sub: string; active: boolean }> = [];
    const out = await forEachTenantIncludingInactive(async (_db, t) => {
      seen.push({ sub: t.subdomain, active: t.isActive });
      return "applied";
    });

    // BOTH the active AND the inactive/pending chapter were visited.
    expect(seen).toEqual([
      { sub: "livechap", active: true },
      { sub: "pendingchap", active: false },
    ]);
    expect(out.map((o) => o.tenant)).toEqual(["livechap", "pendingchap"]);
    expect(out.every((o) => o.ok)).toBe(true);

    // The registry read is intentionally UNFILTERED (no where:{isActive:true}),
    // which is the whole point vs forEachTenant.
    const findManyArg = mocks.findMany.mock.calls[0]?.[0] || {};
    expect(findManyArg.where).toBeUndefined();
  });

  it("isolates a per-tenant failure without aborting the sweep", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "1", subdomain: "boom", name: null, school: null, isActive: false },
      { id: "2", subdomain: "fine", name: null, school: null, isActive: false },
    ]);

    const out = await forEachTenantIncludingInactive(async (_db, t) => {
      if (t.subdomain === "boom") throw new Error("schema exploded");
      return "ok";
    });

    expect(out[0]).toMatchObject({ tenant: "boom", ok: false });
    expect(out[0].error).toMatch(/schema exploded/);
    expect(out[1]).toMatchObject({ tenant: "fine", ok: true, result: "ok" });
  });

  it("returns [] when the registry read fails (never throws to the caller)", async () => {
    mocks.findMany.mockRejectedValue(new Error("registry down"));
    const out = await forEachTenantIncludingInactive(async () => "unused");
    expect(out).toEqual([]);
  });
});
