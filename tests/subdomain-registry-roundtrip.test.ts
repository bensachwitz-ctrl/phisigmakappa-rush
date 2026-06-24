import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// M3 — HYPHENATED SUBDOMAIN REGISTRY ROUND-TRIP (login + suspension).
//
// Two distinct host→key normalizers exist on purpose:
//   • getSubdomain()         → the Postgres SCHEMA name. Collapses every
//                              non-alphanumeric to "_" ("phi-sig" → "phi_sig")
//                              because a bare hyphen is illegal in an unquoted
//                              identifier. This drives which schema a query reads.
//   • getRegistrySubdomain() → the central public."Tenant".subdomain KEY. The
//                              registry row is written with normalizeSubdomain()
//                              (onboard route + lib/provision), which PRESERVES
//                              interior hyphens ("phi-sig" stays "phi-sig").
//
// They diverge for any hyphenated subdomain. The suspension / login-active check
// (app/page.tsx → isTenantActive) MUST key off the registry form, or a suspended
// hyphenated chapter ("phi-sig-kappa") silently keeps serving because the lookup
// queried "phi_sig_kappa" — a row that does not exist. This regression came from
// the L3 single-source refactor; these tests pin the round-trip so it can't drift.
// ---------------------------------------------------------------------------

// Mock the Prisma client so isTenantActive's centralDb.tenant.findUnique is
// observable + controllable. The mock returns a row ONLY when queried with the
// EXACT hyphenated registry key the chapter was provisioned under.
const findUnique = vi.fn();

vi.mock("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    public tenant = { findUnique };
    constructor() {}
  },
}));

beforeEach(() => {
  findUnique.mockReset();
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/greekstack");
  vi.stubEnv("DATABASE_URL_UNPOOLED", "postgresql://user:pass@localhost:5432/greekstack");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const HOST = "phi-sig-kappa.greekstack.vercel.app";
const REGISTRY_KEY = "phi-sig-kappa"; // hyphens PRESERVED (the stored value)
const SCHEMA_KEY = "phi_sig_kappa"; //  hyphens → "_" (the schema-name form)

describe("M3 — getRegistrySubdomain preserves interior hyphens (registry key)", () => {
  it("a hyphenated host resolves to the hyphen-preserving registry key, NOT the schema form", async () => {
    const { getRegistrySubdomain, getSubdomain } = await import("@/lib/prisma");
    expect(getRegistrySubdomain(HOST)).toBe(REGISTRY_KEY);
    // Contrast: the schema resolver still collapses hyphens (unchanged behavior).
    expect(getSubdomain(HOST)).toBe(SCHEMA_KEY);
    // The two forms genuinely differ for a hyphenated subdomain.
    expect(getRegistrySubdomain(HOST)).not.toBe(getSubdomain(HOST));
  });

  it("returns null on apex hosts (mirrors getSubdomain apex handling)", async () => {
    const { getRegistrySubdomain } = await import("@/lib/prisma");
    expect(getRegistrySubdomain("greekstack.vercel.app")).toBeNull();
    expect(getRegistrySubdomain("www")).toBeNull();
    expect(getRegistrySubdomain(null)).toBeNull();
  });

  it("preserves hyphens for the localhost dev host too", async () => {
    const { getRegistrySubdomain } = await import("@/lib/prisma");
    expect(getRegistrySubdomain("phi-sig-kappa.localhost:3000")).toBe(REGISTRY_KEY);
  });
});

describe("M3 — suspension resolves a SUSPENDED hyphenated chapter (isTenantActive)", () => {
  it("blocks (returns false) when the registry row for the hyphenated key is isActive=false", async () => {
    const { getRegistrySubdomain, isTenantActive } = await import("@/lib/prisma");
    // The registry row exists ONLY under the hyphenated key — a schema-form
    // lookup ("phi_sig_kappa") would return null and (wrongly) keep serving.
    findUnique.mockImplementation(async (args: any) =>
      args?.where?.subdomain === REGISTRY_KEY ? { isActive: false } : null,
    );

    const key = getRegistrySubdomain(HOST);
    expect(key).toBe(REGISTRY_KEY);

    const active = await isTenantActive(key!);
    expect(active).toBe(false); // suspended chapter is correctly blocked

    // Prove the lookup used the hyphenated key, not the schema form.
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subdomain: REGISTRY_KEY } }),
    );
    expect(findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { subdomain: SCHEMA_KEY } }),
    );
  });

  it("serves (returns true) an ACTIVE hyphenated chapter — login works for phi-sig-kappa", async () => {
    const { getRegistrySubdomain, isTenantActive } = await import("@/lib/prisma");
    findUnique.mockImplementation(async (args: any) =>
      args?.where?.subdomain === REGISTRY_KEY ? { isActive: true } : null,
    );
    const active = await isTenantActive(getRegistrySubdomain(HOST)!);
    expect(active).toBe(true);
  });

  it("isTenantActive normalizes a raw hyphenated label to the registry key", async () => {
    // Even if a caller passes the raw label directly, it must resolve the same row.
    const { isTenantActive } = await import("@/lib/prisma");
    findUnique.mockImplementation(async (args: any) =>
      args?.where?.subdomain === REGISTRY_KEY ? { isActive: false } : null,
    );
    expect(await isTenantActive("Phi-Sig-Kappa")).toBe(false); // case-folded + hyphens kept
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subdomain: REGISTRY_KEY } }),
    );
  });

  it("REGRESSION GUARD: querying with the schema form misses the hyphenated row", async () => {
    // This is exactly the pre-fix failure mode. If a future change reverts to
    // passing getSubdomain(host) (the schema form) into isTenantActive, the
    // registry row keyed on hyphens is never found → suspended chapter serves.
    // We assert the row is NOT found under the schema key so the contract is
    // explicit: only the hyphen-preserving key resolves it.
    const { getSubdomain, isTenantActive } = await import("@/lib/prisma");
    findUnique.mockImplementation(async (args: any) =>
      args?.where?.subdomain === REGISTRY_KEY ? { isActive: false } : null,
    );
    // The schema form normalizes (in isTenantActive) to "phi_sig_kappa", which
    // the registry does not contain → no row → serves (the bug we fixed by
    // routing the real call through getRegistrySubdomain).
    expect(await isTenantActive(getSubdomain(HOST)!)).toBe(true);
  });
});
