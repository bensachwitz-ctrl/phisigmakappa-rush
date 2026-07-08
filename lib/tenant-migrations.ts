// Idempotent manual-migration applier for PRE-EXISTING tenant schemas.
//
// Greek Stack is schema-per-tenant: every chapter lives in its own Postgres
// schema (schema_<subdomain>). NEW tenants get the full, current schema from
// lib/schema.sql at onboard time (lib/provision.ts → applyTenantDdl). But schemas
// provisioned BEFORE a given manual migration landed never ran it — most
// importantly prisma/manual-migrations/2026-07-07_portal_password_reset.sql, whose
// absence leaves the member-portal password reset silently broken (the OTP row
// can't be written, so no code is ever emailed and reset can never complete).
//
// This module brings those existing schemas up to date. It replays each curated,
// KNOWN-IDEMPOTENT manual migration file against a tenant client — every statement
// in those files is guarded by `IF NOT EXISTS` or a catalog-lookup `DO` block, so
// re-running against a schema that already has the objects is a clean no-op.
// Nothing here drops or rewrites data: it is strictly additive (CREATE TABLE/INDEX
// IF NOT EXISTS + guarded ADD CONSTRAINT).
//
// INVOCATION: this runs on an explicit deploy / ops trigger, never in a request
// hot path — see app/api/cron/apply-tenant-migrations/route.ts (CRON_SECRET-gated,
// same auth model as the reconcile-stripe safety-net cron). It fans out across
// every active tenant via forEachTenant so one chapter's failure can't abort the
// rest.

import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { forEachTenant } from "./prisma";
import { parseSqlStatementsDollarAware } from "./tenant-ddl";

/**
 * The manual-migration files that are SAFE + IDEMPOTENT to (re)apply to an
 * existing tenant schema, in chronological order. Each file's every statement is
 * `IF NOT EXISTS`-guarded (or a catalog-guarded `DO` block for ADD CONSTRAINT),
 * per the "IDEMPOTENT" banner at the top of each file — so applying them to a
 * schema that already has the objects is a no-op. New tenants already carry these
 * from lib/schema.sql; this list heals schemas provisioned before each file
 * landed. A destructive / non-idempotent migration must NOT be added here.
 */
export const IDEMPOTENT_MANUAL_MIGRATIONS = [
  "2026-06-15_auditlog_hashchain.sql",
  "2026-06-30_section_builder.sql",
  "2026-07-07_portal_password_reset.sql",
] as const;

/** Default on-disk location of the manual-migration files (repo-relative). */
export function manualMigrationsDir(): string {
  return path.join(process.cwd(), "prisma", "manual-migrations");
}

export interface MigrationFileResult {
  file: string;
  /** Statements parsed from the file (0 when the file couldn't be read). */
  statements: number;
  ok: boolean;
  error?: string;
}

/**
 * Apply the curated idempotent manual migrations to ONE schema-bound client.
 *
 * `db` must be bound to the target tenant schema (its connection string carries
 * `schema=schema_<sub>`), so the unqualified identifiers in the migration files
 * resolve to that tenant's schema — exactly as during provisioning.
 *
 * Each statement runs in turn; mirroring applyTenantDdl, only "already exists"
 * errors are swallowed (belt-and-suspenders — every statement is already
 * IF-NOT-EXISTS/catalog-guarded, so this branch should rarely trigger). Any other
 * error rethrows so the caller (forEachTenant) records that tenant as failed
 * without aborting the others. Returns a per-file summary.
 */
export async function applyPendingTenantMigrations(
  db: Pick<PrismaClient, "$executeRawUnsafe">,
  opts?: { dir?: string; files?: readonly string[] },
): Promise<MigrationFileResult[]> {
  const dir = opts?.dir ?? manualMigrationsDir();
  const files = opts?.files ?? IDEMPOTENT_MANUAL_MIGRATIONS;
  const results: MigrationFileResult[] = [];

  for (const file of files) {
    let statements: string[];
    try {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      statements = parseSqlStatementsDollarAware(sql);
    } catch (err: any) {
      results.push({ file, statements: 0, ok: false, error: err?.message || "read failed" });
      continue;
    }

    try {
      for (const stmt of statements) {
        try {
          await db.$executeRawUnsafe(stmt);
        } catch (err: any) {
          // Idempotency: an "already exists" race is not a failure — the object is
          // already present, which is exactly the state we want. Rethrow anything
          // else so a genuine problem surfaces per-tenant.
          if (!err?.message?.includes("already exists")) throw err;
        }
      }
      results.push({ file, statements: statements.length, ok: true });
    } catch (err: any) {
      results.push({
        file,
        statements: statements.length,
        ok: false,
        error: err?.message || "apply failed",
      });
    }
  }

  return results;
}

/**
 * Fan the idempotent manual migrations out across EVERY active tenant schema.
 * forEachTenant isolates each chapter in its own try/catch, so one schema's
 * failure can't abort the sweep. Returns the per-tenant summary forEachTenant
 * produces (each `result` is the per-file MigrationFileResult[] above).
 */
export async function applyPendingMigrationsToAllTenants(): Promise<
  Array<{ tenant: string; ok: boolean; result?: MigrationFileResult[]; error?: string }>
> {
  return forEachTenant(async (db) => applyPendingTenantMigrations(db));
}
