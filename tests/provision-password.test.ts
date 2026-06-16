import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// lib/provision.ts hardening — the programmatic seed path (reachable via
// POST /api/platform/tenants). The old code defaulted adminPassword to the
// publicly-known "Welcome123!", so EVERY chapter created this way shared one
// guessable admin credential (account-takeover vector). It now REQUIRES a
// strong, caller-supplied password and a valid admin email, and rejects both
// BEFORE any DB write.
//
// Two layers are covered:
//   1. assertStrongAdminPassword — the pure predicate (no DB).
//   2. provisionTenant — that it throws (and writes nothing) for a missing /
//      weak password or malformed email, with the central registry + schema
//      DDL mocked so the test is hermetic.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockTenantCreate: vi.fn(),
  mockTenantDelete: vi.fn(),
  mockExecuteRawUnsafe: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  centralDb: {
    tenant: {
      findUnique: mocks.mockTenantFindUnique,
      create: mocks.mockTenantCreate,
      delete: mocks.mockTenantDelete,
    },
    $executeRawUnsafe: mocks.mockExecuteRawUnsafe,
  },
  getTenantClient: vi.fn(),
}));

// A tenant-schema PrismaClient should never be constructed when validation
// fails up front; if it ever is, these spies prove no rows were written.
const tenantClientSpies = vi.hoisted(() => ({
  siteConfigCreateMany: vi.fn(),
  officerPositionCreateMany: vi.fn(),
  brotherCreate: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    siteConfig = { createMany: tenantClientSpies.siteConfigCreateMany };
    officerPosition = {
      createMany: tenantClientSpies.officerPositionCreateMany,
      findUnique: vi.fn().mockResolvedValue({ id: "pos-president" }),
    };
    officerAssignment = { create: vi.fn() };
    brother = { create: tenantClientSpies.brotherCreate };
    $executeRawUnsafe = vi.fn().mockResolvedValue(true);
    $disconnect = tenantClientSpies.disconnect;
  },
}));

import {
  assertStrongAdminPassword,
  provisionTenant,
  MIN_ADMIN_PASSWORD_LENGTH,
} from "@/lib/provision";

describe("assertStrongAdminPassword — pure predicate", () => {
  it("rejects the historical hardcoded default 'Welcome123!' (case-insensitive)", () => {
    expect(() => assertStrongAdminPassword("Welcome123!")).toThrow();
    expect(() => assertStrongAdminPassword("welcome123!")).toThrow();
    expect(() => assertStrongAdminPassword("WELCOME123!")).toThrow();
  });

  it("rejects common weak passwords", () => {
    for (const weak of ["password", "password123", "changeme", "letmein", "admin123", "greekstack"]) {
      expect(() => assertStrongAdminPassword(weak)).toThrow();
    }
  });

  it("rejects an empty / missing / non-string password", () => {
    expect(() => assertStrongAdminPassword("")).toThrow();
    // The guard parameter is typed `unknown`, so these non-string values are
    // accepted by the type checker and the runtime guard is what rejects them.
    expect(() => assertStrongAdminPassword(undefined)).toThrow();
    expect(() => assertStrongAdminPassword(null)).toThrow();
  });

  it(`rejects a password shorter than ${MIN_ADMIN_PASSWORD_LENGTH} chars`, () => {
    expect(() => assertStrongAdminPassword("a1b2c3")).toThrow(); // 6 chars
  });

  it("accepts a sufficiently long, non-trivial password", () => {
    expect(() => assertStrongAdminPassword("Clemson-Rules-2026!")).not.toThrow();
    expect(() => assertStrongAdminPassword("xK9$mq2Lz")).not.toThrow();
  });
});

describe("provisionTenant — rejects bad credentials BEFORE any DB write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockTenantFindUnique.mockResolvedValue(null);
  });

  const base = {
    subdomain: "betasigma",
    name: "Beta Sigma",
    school: "State U",
    adminName: "Jane Doe",
    adminEmail: "jane@stateu.edu",
  };

  it("throws when adminPassword is missing/empty and writes no tenant row", async () => {
    await expect(
      provisionTenant({ ...base, adminPassword: "" }),
    ).rejects.toThrow();
    expect(mocks.mockTenantCreate).not.toHaveBeenCalled();
    expect(mocks.mockExecuteRawUnsafe).not.toHaveBeenCalled();
    expect(tenantClientSpies.brotherCreate).not.toHaveBeenCalled();
  });

  it("throws on the default 'Welcome123!' password (no silent fallback)", async () => {
    await expect(
      provisionTenant({ ...base, adminPassword: "Welcome123!" }),
    ).rejects.toThrow();
    expect(mocks.mockTenantCreate).not.toHaveBeenCalled();
  });

  it("throws on a malformed admin email", async () => {
    await expect(
      provisionTenant({ ...base, adminEmail: "not-an-email", adminPassword: "Strong-Pass-2026!" }),
    ).rejects.toThrow();
    expect(mocks.mockTenantCreate).not.toHaveBeenCalled();
  });

  it("proceeds to provision when password + email are valid", async () => {
    // provisionTenant builds the tenant connection string from DATABASE_URL (the
    // PrismaClient itself is mocked, so the value just needs to be present).
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
    mocks.mockTenantCreate.mockResolvedValue({ id: "t1" });
    tenantClientSpies.brotherCreate.mockResolvedValue({ id: "b1" });
    await expect(
      provisionTenant({ ...base, adminPassword: "Strong-Pass-2026!" }),
    ).resolves.toMatchObject({ subdomain: "betasigma" });
    expect(mocks.mockTenantCreate).toHaveBeenCalledTimes(1);
    expect(tenantClientSpies.brotherCreate).toHaveBeenCalledTimes(1);
    // The admin row must NOT carry the old default hash — it hashes the supplied
    // password, so the stored hash format is scrypt$… and never a known default.
    const arg = tenantClientSpies.brotherCreate.mock.calls[0][0];
    expect(arg.data.passwordHash).toMatch(/^scrypt\$/);
  });
});
