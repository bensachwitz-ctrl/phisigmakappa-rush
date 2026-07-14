import { PrismaClient } from "@prisma/client";
import { normalizeSubdomain } from "./reserved-subdomains";
import { getSubdomain as getSubdomainShared, getLeadingLabel } from "./tenant-host";

// The central database client pointing to the default public schema
export const centralDb = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

const globalForPrisma = globalThis as unknown as {
  prismaClients: Record<string, PrismaClient>;
};

if (!globalForPrisma.prismaClients) {
  globalForPrisma.prismaClients = {};
}

/**
 * Extracts and sanitizes the subdomain from a hostname.
 *
 * The CANONICAL apex is `greekstack.vercel.app`. The `greeklifesystems*` hosts
 * are LEGACY apex aliases kept so an old-domain request still resolves to the
 * platform apex (never a chapter) — do not remove them; doing so would make the
 * old host resolve to a bogus `greeklifesystems` tenant schema.
 */
export function getSubdomain(host: string | null): string | null {
  // Delegates to the single edge-safe source (lib/tenant-host) so the apex set
  // and strip list can never drift between the Node and Edge parsers.
  return getSubdomainShared(host);
}

/**
 * Resolve a host to the REGISTRY subdomain key — the EXACT form stored in
 * public."Tenant".subdomain. The central registry is written with
 * normalizeSubdomain() (app/api/onboard/route.ts + lib/provision.ts), which
 * PRESERVES interior hyphens ("phi-sig" stays "phi-sig"). getSubdomain() above,
 * by contrast, collapses every non-alphanumeric to "_" because its job is to
 * build the Postgres SCHEMA name ("schema_phi_sig") — a bare hyphen is illegal
 * in an unquoted identifier. Those two forms diverge for any hyphenated
 * subdomain, so a registry lookup (suspension / login resolution) MUST use this
 * hyphen-preserving key, never the schema form, or it silently misses the row
 * (e.g. a suspended "phi-sig" chapter would keep serving). Returns null on the
 * apex / unknown hosts, mirroring getSubdomain's apex handling.
 */
export function getRegistrySubdomain(host: string | null): string | null {
  // Same apex/strip handling as getSubdomain (via the shared source), but keeps
  // interior hyphens via normalizeSubdomain so the key round-trips to the
  // central registry value (e.g. "phi-sig" stays "phi-sig", never "phi_sig").
  const label = getLeadingLabel(host);
  if (!label) return null;
  const key = normalizeSubdomain(label);
  return key || null;
}

/**
 * Resolves the appropriate PrismaClient instance based on the current request's subdomain.
 */
export function getPrismaClient(): PrismaClient {
  // If explicitly overridden via environment variable (e.g. in crons, seeding, or scripts)
  if (process.env.TENANT_SCHEMA) {
    const schema = process.env.TENANT_SCHEMA;
    return getCachedClient(schema);
  }

  let host: string | null = null;
  try {
    if (typeof window === "undefined") {
      const { headers } = require("next/headers");
      const headersList = headers();
      host = headersList.get("host") || headersList.get("x-forwarded-host");
    }
  } catch {
    // headers() throws when called outside of a request context (e.g. next build static generation)
  }

  const subdomain = getSubdomain(host);
  if (!subdomain) {
    return centralDb;
  }

  return getCachedClient(`schema_${subdomain}`);
}

function getCachedClient(schema: string): PrismaClient {
  if (schema === "public") {
    return centralDb;
  }

  if (!globalForPrisma.prismaClients[schema]) {
    const baseUri = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
    // Append the schema name to the connection string parameters
    const separator = baseUri.includes("?") ? "&" : "?";
    const tenantUrl = `${baseUri}${separator}schema=${schema}`;

    globalForPrisma.prismaClients[schema] = new PrismaClient({
      datasources: {
        db: {
          url: tenantUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return globalForPrisma.prismaClients[schema];
}

/**
 * Returns an explicit PrismaClient bound to a specific tenant SCHEMA, independent
 * of the request Host. Use this in server-to-server / no-Host contexts — Stripe
 * webhooks, cron jobs, scripts — where the Host-header proxy (`prisma`) would
 * wrongly resolve to the public schema. Accepts a bare subdomain ("chapter") or a
 * full schema name ("schema_chapter"); sanitized identically to provisioning.
 */
export function getTenantClient(subdomainOrSchema: string): PrismaClient {
  const s = subdomainOrSchema.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  const schema = s.startsWith("schema_") ? s : `schema_${s}`;
  return getCachedClient(schema);
}

export interface TenantRecord {
  id: string;
  subdomain: string;
  name: string | null;
  school: string | null;
  isActive: boolean;
}

/**
 * Is the chapter for this subdomain allowed to serve? Enforces the registry's
 * `isActive` flag at the public chapter entry (app/page.tsx).
 *
 * Returns TRUE (serve) when:
 *   • the subdomain has no registry row (unprovisioned / legacy public fallback —
 *     never block a chapter that predates the registry), OR
 *   • the row exists and isActive !== false.
 * Returns FALSE (block) ONLY when a row exists with isActive explicitly false.
 *
 * Deliberately resilient: any lookup error resolves to TRUE so a transient
 * registry hiccup can never take a live, paying chapter offline. The operator
 * console is the single place a chapter is intentionally suspended.
 */
export async function isTenantActive(subdomain: string): Promise<boolean> {
  // Normalize to the EXACT registry key form (hyphen-preserving) so a hyphenated
  // subdomain resolves the same row it was provisioned under. Callers may hand us
  // a raw host label or the value from getRegistrySubdomain(); both collapse to
  // the stored key here. (Passing the schema form "phi_sig" would miss the
  // "phi-sig" row — see getRegistrySubdomain — so prefer that resolver upstream.)
  const key = normalizeSubdomain(subdomain);
  if (!key) return true;
  try {
    const row = await centralDb.tenant.findUnique({
      where: { subdomain: key },
      select: { isActive: true },
    });
    if (!row) return true; // unprovisioned / legacy → serve
    return row.isActive !== false; // block only on explicit false
  } catch {
    return true; // registry hiccup → never blackhole a live chapter
  }
}

/** All ACTIVE chapters from the central registry (public."Tenant"). [] on error. */
export async function listActiveTenants(): Promise<TenantRecord[]> {
  try {
    const rows = await centralDb.tenant.findMany({
      where: { isActive: true },
      select: { id: true, subdomain: true, name: true, school: true, isActive: true },
    });
    return rows as TenantRecord[];
  } catch {
    return [];
  }
}

/**
 * EVERY chapter from the central registry — active, suspended, AND pending-billing
 * (isActive=false). [] on error. Unlike listActiveTenants (the serve gate), this
 * is for ADDITIVE, IDEMPOTENT maintenance that must reach a chapter's schema
 * regardless of whether its PUBLIC site is live — most importantly the manual
 * schema-migration applier, which otherwise never heals a schema provisioned
 * before a migration landed if that chapter isn't active yet.
 */
export async function listAllTenants(): Promise<TenantRecord[]> {
  try {
    const rows = await centralDb.tenant.findMany({
      select: { id: true, subdomain: true, name: true, school: true, isActive: true },
    });
    return rows as TenantRecord[];
  } catch {
    return [];
  }
}

/**
 * Run `fn` once per ACTIVE tenant, each with that tenant's explicit schema client.
 * Every tenant is isolated in its own try/catch so one chapter's failure never
 * aborts the rest. Returns a per-tenant ok/result/error summary. This is how
 * crons + other no-Host jobs must fan out across every chapter's schema (the Host
 * proxy can't, since cron/webhook requests carry no subdomain).
 */
export async function forEachTenant<T>(
  fn: (db: PrismaClient, tenant: TenantRecord) => Promise<T>
): Promise<Array<{ tenant: string; ok: boolean; result?: T; error?: string }>> {
  const tenants = await listActiveTenants();
  const out: Array<{ tenant: string; ok: boolean; result?: T; error?: string }> = [];
  for (const t of tenants) {
    try {
      const result = await fn(getTenantClient(t.subdomain), t);
      out.push({ tenant: t.subdomain, ok: true, result });
    } catch (err: any) {
      out.push({ tenant: t.subdomain, ok: false, error: err?.message || "unknown error" });
    }
  }
  return out;
}

/**
 * Like forEachTenant, but fans out across EVERY registry row — including inactive /
 * pending-billing / operator-suspended chapters (listAllTenants, not
 * listActiveTenants). For ADDITIVE, IDEMPOTENT work that must reach a chapter's
 * schema irrespective of whether its public site is live — the manual schema-
 * migration applier is the canonical caller. Each tenant is isolated in its own
 * try/catch so one chapter's failure never aborts the rest. Do NOT use this for
 * request-serving / entitlement decisions — isActive is the serve gate, and this
 * intentionally ignores it.
 */
export async function forEachTenantIncludingInactive<T>(
  fn: (db: PrismaClient, tenant: TenantRecord) => Promise<T>
): Promise<Array<{ tenant: string; ok: boolean; result?: T; error?: string }>> {
  const tenants = await listAllTenants();
  const out: Array<{ tenant: string; ok: boolean; result?: T; error?: string }> = [];
  for (const t of tenants) {
    try {
      const result = await fn(getTenantClient(t.subdomain), t);
      out.push({ tenant: t.subdomain, ok: true, result });
    } catch (err: any) {
      out.push({ tenant: t.subdomain, ok: false, error: err?.message || "unknown error" });
    }
  }
  return out;
}

// Export the prisma client as a dynamic proxy that resolves the correct schema client per-query.
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
