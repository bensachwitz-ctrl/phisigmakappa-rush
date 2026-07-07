import type { PrismaClient } from "@prisma/client";

/**
 * Parse the per-tenant DDL script (lib/schema.sql) into individual executable
 * statements.
 *
 * ORDER IS LOAD-BEARING: strip full-line `--` comments BEFORE splitting on `;`.
 *
 * A comment line may itself contain a semicolon, e.g. schema.sql:
 *   "-- ...when rows exist; with zero rows it falls back byte-for-byte..."
 * If we split on `;` FIRST, the text after that comment-semicolon
 * ("with zero rows it falls back...") no longer starts with `--`, so a naive
 * per-line comment filter cannot recognise it. It survives as the HEAD of the
 * NEXT chunk and is prepended to the following `CREATE TABLE ...` as raw SQL.
 * Postgres then rejects that statement with a syntax error whose message does
 * NOT contain "already exists", so the provisioner rethrows and rolls the whole
 * tenant back — i.e. every provision via that path fails.
 *
 * This helper is the SINGLE parser shared by both provisioning paths
 * (lib/provision.ts and app/api/onboard/route.ts). They previously carried two
 * copies that drifted (provision = buggy split-first; onboard = fixed
 * strip-first); centralising the parser here means it can never drift again.
 */
export function parseTenantDdl(sqlContent: string): string[] {
  let content = sqlContent;
  // Strip a leading UTF-8 BOM if present (schema.sql is authored on Windows).
  if (content.startsWith("﻿")) {
    content = content.slice(1);
  }
  return content
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
}

/** Minimal surface of a PrismaClient this helper needs — keeps it easy to test. */
type RawExecutor = Pick<PrismaClient, "$executeRawUnsafe">;

/**
 * Apply parsed tenant DDL to a schema-bound client. Each statement runs in turn;
 * only "already exists" errors are swallowed so a re-run against a partially
 * built schema stays idempotent (mirrors the ADD CONSTRAINT re-run pattern
 * documented in schema.sql). Any other error is rethrown so the caller can roll
 * the tenant back.
 */
export async function applyTenantDdl(
  client: RawExecutor,
  sqlContent: string,
): Promise<void> {
  const statements = parseTenantDdl(sqlContent);
  for (const stmt of statements) {
    try {
      await client.$executeRawUnsafe(stmt);
    } catch (err: any) {
      if (!err?.message?.includes("already exists")) {
        throw err;
      }
    }
  }
}
