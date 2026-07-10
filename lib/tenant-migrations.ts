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
// EVERY tenant — including inactive / pending-billing / suspended — via
// forEachTenantIncludingInactive so a not-yet-live chapter's schema is still
// healed, and each chapter's failure is isolated so it can't abort the rest.

import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { forEachTenantIncludingInactive } from "./prisma";
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
  "2026-07-10_portal_mustreset.sql",
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
  db: Pick<PrismaClient, "$executeRawUnsafe"> & Partial<Pick<PrismaClient, "$transaction">>,
  opts?: { dir?: string; files?: readonly string[]; schema?: string },
): Promise<MigrationFileResult[]> {
  const dir = opts?.dir ?? manualMigrationsDir();
  const files = opts?.files ?? IDEMPOTENT_MANUAL_MIGRATIONS;
  const schema = opts?.schema;
  const results: MigrationFileResult[] = [];

  // Swallow only "already exists" (idempotency); rethrow anything else so a real
  // problem surfaces per-file.
  const run = async (
    exec: (sql: string) => Promise<unknown>,
    stmt: string,
  ): Promise<void> => {
    try {
      await exec(stmt);
    } catch (err: any) {
      if (!err?.message?.includes("already exists")) throw err;
    }
  };

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
      if (schema && typeof db.$transaction === "function") {
        // CORRECT per-tenant application. getTenantClient's `?schema=schema_<sub>`
        // URL param makes Prisma QUALIFY its own model queries but does NOT set the
        // connection search_path (it stays `"$user", public`). So a raw, UNQUALIFIED
        // migration statement would run against `public`, not the tenant schema —
        // which is exactly how PortalPasswordReset + PortalUser.mustReset failed to
        // reach any chapter schema. An INTERACTIVE transaction holds ONE connection,
        // so a leading `SET search_path` persists across every statement, pinning the
        // unqualified identifiers to THIS tenant's schema. `schema` is derived from a
        // sanitized subdomain ([a-z0-9_]), so it is safe to interpolate.
        await (db.$transaction as PrismaClient["$transaction"])(async (tx) => {
          await tx.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
          for (const stmt of statements) await run((s) => tx.$executeRawUnsafe(s), stmt);
        });
      } else {
        // Back-compat / unit-test path: no schema pinning (caller has already bound
        // search_path, or is asserting raw statement emission).
        for (const stmt of statements) await run((s) => db.$executeRawUnsafe(s), stmt);
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
 * Fan the idempotent manual migrations out across EVERY tenant schema — INCLUDING
 * inactive / pending-billing / suspended chapters. Uses
 * forEachTenantIncludingInactive (NOT forEachTenant, which is active-only) because
 * the work is additive + idempotent and MUST reach a schema even when the
 * chapter's public site isn't live yet — otherwise a chapter provisioned before a
 * migration landed and still pending billing would never get the healing DDL (e.g.
 * the portal_password_reset table). Each chapter is isolated in its own try/catch,
 * so one schema's failure can't abort the sweep. Returns the per-tenant summary
 * the iterator produces (each `result` is the per-file MigrationFileResult[] above).
 */
export async function applyPendingMigrationsToAllTenants(): Promise<
  Array<{ tenant: string; ok: boolean; result?: MigrationFileResult[]; error?: string }>
> {
  return forEachTenantIncludingInactive(async (db, tenant) => {
    // Pin each file's statements to THIS tenant's schema (see the search_path note
    // in applyPendingTenantMigrations). Schema name is derived from the sanitized
    // subdomain, identical to getTenantClient — so unqualified DDL lands in the
    // chapter's schema, not public.
    const schema = `schema_${String(tenant.subdomain).replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()}`;
    return applyPendingTenantMigrations(db, { schema });
  });
}
