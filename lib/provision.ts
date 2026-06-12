import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { centralDb, getTenantClient } from "./prisma";
import { hashPassword } from "./password";
import { checkSubdomainFormat, normalizeSubdomain } from "./reserved-subdomains";
import { DEFAULT_OFFICER_CATALOG, stringifyPermissions } from "./officer-permissions";
import { DEFAULTS } from "./site-config";

export interface ProvisioningInput {
  subdomain: string;
  name: string;
  school: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  greekLetters?: string;
  orgType?: "fraternity" | "sorority";
}

/**
 * Parses raw DDL script by stripping comments and splitting into statements.
 */
function parseDdl(sqlContent: string): string[] {
  let content = sqlContent;
  if (content.startsWith("\uFEFF")) {
    content = content.slice(1);
  }
  return content
    .split(";")
    .map((stmt) => {
      return stmt
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();
    })
    .filter((stmt) => stmt.length > 0);
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

  // Check if tenant already exists in registry
  const existing = await centralDb.tenant.findUnique({
    where: { subdomain },
  });
  if (existing) {
    throw new Error(`Subdomain "${subdomain}" is already registered`);
  }

  const schemaName = `schema_${subdomain}`;
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
  const statements = parseDdl(sqlContent);

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

    // 3. Connect to schema via separate client and apply DDL
    tenantPrisma = new PrismaClient({
      datasources: { db: { url: tenantUrl } },
    });

    for (const stmt of statements) {
      try {
        await tenantPrisma.$executeRawUnsafe(stmt);
      } catch (err: any) {
        // Ignore "already exists" errors (e.g. from idempotent runs)
        if (!err.message?.includes("already exists")) {
          throw err;
        }
      }
    }

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
      "contact.rushEmail": input.adminEmail,
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

    // 6. Create the first Admin Brother
    const adminPassword = input.adminPassword || "Welcome123!";
    const passwordHash = hashPassword(adminPassword);

    const adminBrother = await tenantPrisma.brother.create({
      data: {
        name: input.adminName,
        email: input.adminEmail,
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
