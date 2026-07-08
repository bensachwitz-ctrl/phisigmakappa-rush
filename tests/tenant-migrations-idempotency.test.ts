import { describe, it, expect, vi, beforeEach } from "vitest";

// Backlog #8 — idempotent manual-migration applier for PRE-EXISTING tenant
// schemas (lib/tenant-migrations). New tenants get the full schema at onboard
// time, but schemas provisioned before a manual migration landed never ran it
// (most importantly 2026-07-07_portal_password_reset.sql, whose absence silently
// breaks portal password reset). The applier replays the curated, KNOWN-IDEMPOTENT
// manual migrations against a tenant client. This suite proves:
//   • the dollar-quote-aware splitter keeps a `DO $$ … $$;` block whole (the naive
//     split-on-`;` used for schema.sql would shred it),
//   • the applier reads the REAL migration files and runs each statement,
//   • re-running is a clean no-op even when Postgres reports "already exists"
//     (idempotency), and any OTHER error surfaces as a failed file,
//   • the all-tenants wrapper fans out via forEachTenant.

const mocks = vi.hoisted(() => ({ forEachTenantIncludingInactive: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  forEachTenantIncludingInactive: mocks.forEachTenantIncludingInactive,
}));

import { parseSqlStatementsDollarAware } from "@/lib/tenant-ddl";
import {
  applyPendingTenantMigrations,
  applyPendingMigrationsToAllTenants,
  IDEMPOTENT_MANUAL_MIGRATIONS,
} from "@/lib/tenant-migrations";

const PORTAL_MIGRATION = "2026-07-07_portal_password_reset.sql";

function recordingDb() {
  const executed: string[] = [];
  const db = { $executeRawUnsafe: vi.fn(async (sql: string) => { executed.push(sql); return 1; }) };
  return { db, executed };
}

beforeEach(() => vi.clearAllMocks());

describe("parseSqlStatementsDollarAware — dollar-quoted blocks stay whole", () => {
  it("keeps a DO $$ … $$ block as ONE statement despite its internal semicolons", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS "X" ("id" TEXT PRIMARY KEY);
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'x_fk') THEN
          ALTER TABLE "X" ADD CONSTRAINT "x_fk" FOREIGN KEY ("id") REFERENCES "Y"("id");
        END IF;
      END
      $$;
    `;
    const stmts = parseSqlStatementsDollarAware(sql);
    expect(stmts).toHaveLength(2);
    expect(stmts[0]).toMatch(/^CREATE TABLE IF NOT EXISTS "X"/);
    // The DO block survived as a single statement (not fragmented at its `;`s).
    expect(stmts[1]).toMatch(/^DO \$\$/);
    expect(stmts[1]).toContain("ADD CONSTRAINT");
    expect(stmts[1]).toContain("END IF");
    expect(stmts[1]).toContain("$$");
  });
});

describe("applyPendingTenantMigrations — real portal_password_reset file", () => {
  it("parses 5 idempotent statements and applies each, DO-block intact", async () => {
    const { db, executed } = recordingDb();
    const results = await applyPendingTenantMigrations(db as any, { files: [PORTAL_MIGRATION] });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ file: PORTAL_MIGRATION, ok: true });
    // CREATE TABLE + 3 indexes + 1 catalog-guarded DO block = 5 statements.
    expect(executed).toHaveLength(5);
    expect(executed.some((s) => /CREATE TABLE IF NOT EXISTS "PortalPasswordReset"/.test(s))).toBe(true);
    const doStmt = executed.find((s) => s.startsWith("DO $$"));
    expect(doStmt).toBeTruthy();
    expect(doStmt).toContain("ADD CONSTRAINT");
    expect(doStmt).toContain("pg_constraint");
  });

  it("is IDEMPOTENT: a re-run where Postgres reports 'already exists' does NOT throw and reports ok", async () => {
    const db = {
      $executeRawUnsafe: vi.fn(async () => {
        // Simulate a second run against a schema that already has every object.
        throw new Error(`relation "PortalPasswordReset" already exists`);
      }),
    };
    const results = await applyPendingTenantMigrations(db as any, { files: [PORTAL_MIGRATION] });
    expect(results[0].ok).toBe(true);
    // Every statement was attempted; the "already exists" errors were swallowed.
    expect(db.$executeRawUnsafe).toHaveBeenCalledTimes(5);
  });

  it("surfaces a GENUINE (non-'already exists') error as a failed file without throwing", async () => {
    const db = {
      $executeRawUnsafe: vi.fn(async () => {
        throw new Error(`permission denied for schema schema_alpha`);
      }),
    };
    const results = await applyPendingTenantMigrations(db as any, { files: [PORTAL_MIGRATION] });
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toMatch(/permission denied/i);
  });

  it("runs cleanly twice in a row against the same recording client (double-apply is safe)", async () => {
    const { db } = recordingDb();
    const first = await applyPendingTenantMigrations(db as any, { files: [PORTAL_MIGRATION] });
    const second = await applyPendingTenantMigrations(db as any, { files: [PORTAL_MIGRATION] });
    expect(first[0].ok).toBe(true);
    expect(second[0].ok).toBe(true);
    expect(second[0].statements).toBe(first[0].statements);
  });
});

describe("applyPendingMigrationsToAllTenants — fans out via forEachTenantIncludingInactive", () => {
  it("uses the INACTIVE-inclusive iterator and applies the curated set to a pending/inactive tenant", async () => {
    const { db } = recordingDb();
    // The iterator hands us both an active AND an inactive/pending chapter — the
    // applier must heal the inactive one too (the whole reason for switching off
    // the active-only forEachTenant), so simulate that here.
    mocks.forEachTenantIncludingInactive.mockImplementation(async (fn: any) => {
      const active = await fn(db, { subdomain: "livechap", isActive: true });
      const pending = await fn(db, { subdomain: "pendingchap", isActive: false });
      return [
        { tenant: "livechap", ok: true, result: active },
        { tenant: "pendingchap", ok: true, result: pending },
      ];
    });

    const out = await applyPendingMigrationsToAllTenants();
    expect(mocks.forEachTenantIncludingInactive).toHaveBeenCalledTimes(1);
    expect(out.map((o) => o.tenant)).toEqual(["livechap", "pendingchap"]);
    // The inactive/pending chapter (which the old active-only forEachTenant would
    // have skipped) got the full curated migration set applied.
    const pendingResult = out.find((o) => o.tenant === "pendingchap");
    expect(pendingResult?.result).toHaveLength(IDEMPOTENT_MANUAL_MIGRATIONS.length);
    expect(pendingResult?.result?.every((r: any) => r.ok)).toBe(true);
  });
});
