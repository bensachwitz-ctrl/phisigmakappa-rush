// One-time central-registry bootstrap.
//
// A fresh deploy may not have run `prisma db push` against the public schema, so
// the central `public."Tenant"` registry table can be missing on the very first
// signup. We still want signup to self-heal that case — but the original code ran
// the `CREATE TABLE IF NOT EXISTS` + `CREATE UNIQUE INDEX` DDL on the shared
// public schema on EVERY unauthenticated signup request (in the hot path of
// app/api/onboard/route.ts). That is wasteful (two raw DDL round-trips per
// signup) and means an open endpoint repeatedly issues schema-altering SQL.
//
// This module hoists that DDL out of the hot path: it runs the bootstrap AT MOST
// ONCE per server process (memoized on a module-scoped promise). Subsequent
// signups skip the DDL entirely and go straight to the registry insert. The DDL
// is still idempotent (`IF NOT EXISTS`), so a cold instance that has never seen
// the table heals it on its first signup; every signup after that is a no-op.

import { centralDb } from "@/lib/prisma";

// Memoized so the DDL executes once per process. Holds the in-flight promise so
// concurrent first-signups share a single bootstrap rather than racing.
let bootstrapPromise: Promise<void> | null = null;

async function runBootstrap(): Promise<void> {
  await centralDb.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS public."Tenant" ("id" TEXT NOT NULL, "subdomain" TEXT NOT NULL, "domain" TEXT, "name" TEXT, "school" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id"));`,
  );
  await centralDb.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_subdomain_key" ON public."Tenant"("subdomain");`,
  );
}

/**
 * Ensure the central `public."Tenant"` registry table + unique index exist.
 *
 * Idempotent and process-memoized: the underlying DDL runs at most once per
 * server instance. Safe to call from any provisioning path. If the bootstrap
 * fails (e.g. transient DB error) the memo is cleared so a later call retries
 * rather than caching the failure.
 */
export async function ensureTenantRegistry(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().catch((err) => {
      // Don't cache a failed bootstrap — allow the next signup to retry.
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}
