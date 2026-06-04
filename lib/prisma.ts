import { PrismaClient } from "@prisma/client";

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
 */
export function getSubdomain(host: string | null): string | null {
  if (!host) return null;
  
  const hostWithoutPort = host.split(":")[0].toLowerCase();
  if (
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "greeklifesystems" ||
    hostWithoutPort === "greeklifesystems.vercel.app" ||
    hostWithoutPort === "greek-life-systems.vercel.app" ||
    hostWithoutPort === "www"
  ) {
    return null;
  }

  const cleanHost = host
    .replace(".localhost:3000", "")
    .replace(".localhost:3001", "")
    .replace(".greeklifesystems.vercel.app", "")
    .replace(".greek-life-systems.vercel.app", "")
    .trim();

  if (!cleanHost || cleanHost === "www" || cleanHost === "greeklifesystems") {
    return null;
  }
  return cleanHost.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
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
 * wrongly resolve to the public schema. Accepts a bare subdomain ("phisig") or a
 * full schema name ("schema_phisig"); sanitized identically to provisioning.
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
