import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { centralDb, getTenantClient } from "./prisma";
import { hashPassword } from "./password";
import { checkSubdomainFormat, normalizeSubdomain } from "./reserved-subdomains";
import { DEFAULT_OFFICER_CATALOG, stringifyPermissions } from "./officer-permissions";
import { DEFAULTS } from "./site-config";
import { applyTenantDdl } from "./tenant-ddl";

export interface ProvisioningInput {
  subdomain: string;
  name: string;
  school: string;
  adminName: string;
  adminEmail: string;
  /**
   * REQUIRED. The first admin's password. There is intentionally NO default:
   * the previous `"Welcome123!"` fallback minted every programmatically-created
   * chapter with the SAME publicly-known password, an account-takeover vector
   * for any tenant created via this path (POST /api/platform/tenants). Callers
   * MUST supply a strong, caller-chosen password (validated by
   * `assertStrongAdminPassword` below) so no predictable credential is ever
   * seeded.
   */
  adminPassword: string;
  greekLetters?: string;
  orgType?: "fraternity" | "sorority";
}

/**
 * Minimum length for a seeded admin password. Mirrors the 8-char floor the
 * self-serve /onboard route enforces, so both provisioning paths agree.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 8;

/**
 * A small denylist of trivially-guessable passwords that must never be accepted
 * for a freshly-seeded admin — most importantly the historical hardcoded default
 * `Welcome123!`, plus the common variants an operator might reflexively type.
 * Comparison is case-insensitive.
 */
const WEAK_ADMIN_PASSWORDS: ReadonlySet<string> = new Set([
  "welcome123!",
  "welcome123",
  "password",
  "password1",
  "password123",
  "changeme",
  "changeme123",
  "letmein",
  "admin123",
  "greekstack",
  "greekstack1",
]);

/**
 * Throw a descriptive Error unless `password` is an acceptable admin password:
 * a non-empty string of at least MIN_ADMIN_PASSWORD_LENGTH characters that is
 * not on the weak-password denylist. Centralizes the rule so provisionTenant and
 * any future programmatic caller (or test) share one definition.
 */
export function assertStrongAdminPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("An admin password is required to provision a chapter.");
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `Admin password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`,
    );
  }
  if (WEAK_ADMIN_PASSWORDS.has(password.trim().toLowerCase())) {
    throw new Error(
      "Admin password is too common / guessable — choose a stronger one.",
    );
  }
}

/**
 * Programmatically provisions a new chapter tenant:
 * 1. Validates the subdomain and check shape.
 * 2. Creates a record in the public "Tenant" table (central registry).
 * 3. Creates the target Postgres schema.
 * 4. Connects and runs DDL statements from lib/schema.sql.
 * 5. Seeds default SiteConfig settings + custom chapter inputs.
 * 6. Seeds standard OfficerPositions.
 * 7. Seeds the first admin Brother.
 *
 * Full CASCADE rollback is performed if any phase fails.
 */
export async function provisionTenant(input: ProvisioningInput) {
  const subdomain = normalizeSubdomain(input.subdomain);
  const rejectReason = checkSubdomainFormat(subdomain);
  if (rejectReason) {
    throw new Error(`Subdomain "${input.subdomain}" is ${rejectReason}`);
  }

  // Reject a missing/weak admin password BEFORE any DB write. This closes the
  // account-takeover vector where the old code silently fell back to the
  // publicly-known "Welcome123!" — every programmatically provisioned chapter
  // would have shared one guessable admin credential. Now a strong, caller-
  // supplied password is mandatory.
  assertStrongAdminPassword(input.adminPassword);

  // Validate the admin email so a programmatic caller can't seed an admin whose
  // only login address is malformed (which would also bounce every future
  // reset). Mirrors the conservative single-@ check the /onboard route uses.
  const adminEmail = String(input.adminEmail || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error("A valid admin email is required to provision a chapter.");
  }

  // Check if tenant already exists in registry
  const existing = await centralDb.tenant.findUnique({
    where: { subdomain },
  });
  if (existing) {
    throw new Error(`Subdomain "${subdomain}" is already registered`);
  }

  // Sanitize the subdomain into the schema-name suffix: ONLY [a-zA-Z0-9] survive;
  // every other char (notably the hyphen in a multi-word subdomain like
  // "phi-sig-usc") collapses to "_". This MUST match the identical transform in
  // getTenantClient()/the onboard path so the schema we CREATE here is the exact
  // schema those readers later resolve — otherwise a hyphenated subdomain provisions
  // into one schema name but every subsequent tenant query targets a different,
  // non-existent one (silent empty-tenant bug). Postgres also rejects a bare hyphen
  // in an unquoted identifier, so this is correctness + safety in one.
  const schemaName = `schema_${subdomain.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const baseUri = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  if (!baseUri) {
    throw new Error("Database connection URL is not configured (DATABASE_URL)");
  }
  const separator = baseUri.includes("?") ? "&" : "?";
  const tenantUrl = `${baseUri}${separator}schema=${schemaName}&options=-c%20search_path=${schemaName}`;

  // Read schema DDL
  const ddlPath = path.join(process.cwd(), "lib", "schema.sql");
  if (!fs.existsSync(ddlPath)) {
    throw new Error(`Schema file not found at: ${ddlPath}`);
  }
  const sqlContent = fs.readFileSync(ddlPath, "utf8");

  let tenantCreated = false;
  let schemaCreated = false;
  let tenantPrisma: PrismaClient | null = null;

  try {
    // 1. Create Tenant record in central registry
    // trialEndsAt = now + 30 days
    const trialDays = 30;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    await centralDb.tenant.create({
      data: {
        subdomain,
        name: input.name,
        school: input.school,
        isActive: true,
        plan: "monthly",
        subscriptionStatus: "trialing",
        trialEndsAt,
      },
    });
    tenantCreated = true;

    // 2. Create schema in target database
    await centralDb.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
    schemaCreated = true;

    // 3. Connect to schema via separate client and apply DDL. parseTenantDdl
    //    (shared with /api/onboard via applyTenantDdl) strips `--` comment lines
    //    BEFORE splitting on `;`, so a comment containing a mid-line semicolon
    //    can't corrupt the following statement and roll the whole tenant back.
    tenantPrisma = new PrismaClient({
      datasources: { db: { url: tenantUrl } },
    });

    await applyTenantDdl(tenantPrisma, sqlContent);

    // 4. Seed default configurations
    const configData: Array<{ key: string; value: string }> = [];

    // Base DEFAULTS from site-config
    for (const [k, v] of Object.entries(DEFAULTS)) {
      configData.push({ key: k, value: v });
    }

    // Map input updates
    const updates: Record<string, string> = {
      "chapter.fraternityName": input.name,
      "chapter.fraternityShort": input.name,
      "chapter.schoolName": input.school,
      "chapter.greekLetters": input.greekLetters || "",
      "contact.rushEmail": adminEmail.toLowerCase(),
    };

    if (input.orgType) {
      updates["chapter.orgType"] = input.orgType;
    }

    for (const [k, v] of Object.entries(updates)) {
      const idx = configData.findIndex((c) => c.key === k);
      if (idx !== -1) {
        configData[idx].value = v;
      } else {
        configData.push({ key: k, value: v });
      }
    }

    // Batch create SiteConfig in tenant schema
    await tenantPrisma.siteConfig.createMany({
      data: configData,
    });

    // 5. Seed standard OfficerPositions
    const positionsData = DEFAULT_OFFICER_CATALOG.map((officer) => ({
      title: officer.title,
      slug: officer.slug,
      description: officer.description,
      permissions: stringifyPermissions(officer.permissions),
      sortOrder: officer.sortOrder,
      active: true,
    }));

    await tenantPrisma.officerPosition.createMany({
      data: positionsData,
    });

    // Resolve President ID to assign the admin assignment
    const presidentPosition = await tenantPrisma.officerPosition.findUnique({
      where: { slug: "president" },
    });

    // 6. Create the first Admin Brother. The password was already validated as
    //    strong + non-default above (assertStrongAdminPassword), so there is no
    //    fallback credential here — we hash exactly what the caller supplied.
    const passwordHash = hashPassword(input.adminPassword);

    const adminBrother = await tenantPrisma.brother.create({
      data: {
        name: input.adminName,
        email: adminEmail.toLowerCase(),
        role: "ADMIN",
        passwordHash,
        status: "ACTIVE",
        position: "President",
      },
    });

    if (presidentPosition) {
      await tenantPrisma.officerAssignment.create({
        data: {
          brotherId: adminBrother.id,
          positionId: presidentPosition.id,
          termCode: `${new Date().getFullYear()}-full`,
          startDate: new Date(),
        },
      });
    }

    await tenantPrisma.$disconnect();
    return { subdomain, schemaName };
  } catch (err) {
    // Disconnect client if initialized
    if (tenantPrisma) {
      await tenantPrisma.$disconnect().catch(() => {});
    }

    // Rollback schema creation
    if (schemaCreated) {
      await centralDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`).catch(() => {});
    }

    // Rollback Tenant registry record
    if (tenantCreated) {
      await centralDb.tenant.delete({
        where: { subdomain },
      }).catch(() => {});
    }

    throw err;
  }
}
