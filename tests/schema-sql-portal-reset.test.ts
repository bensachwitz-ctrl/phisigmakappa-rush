import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Schema-consistency guard for lib/schema.sql (the per-tenant DDL applied at
// provision time). Two drifts are pinned here:
//
//  1. PortalPasswordReset MUST exist. The prisma model + the portal OTP reset
//     routes (app/api/portal/reset/*) write/read this table, but it was absent
//     from schema.sql, so every provisioned tenant lacked it and password reset
//     silently no-op'd. This guard fails if the CREATE TABLE / indexes / FK ever
//     go missing again.
//
//  2. The central "Tenant" registry table MUST NOT be created per-tenant. It
//     lives only in the public schema; a per-tenant copy was dead + confusing.
// ---------------------------------------------------------------------------

const SCHEMA_SQL = fs.readFileSync(
  path.join(process.cwd(), "lib", "schema.sql"),
  "utf8",
);

describe("lib/schema.sql — PortalPasswordReset table present", () => {
  it("declares the PortalPasswordReset table", () => {
    expect(SCHEMA_SQL).toMatch(
      /CREATE TABLE (IF NOT EXISTS )?"PortalPasswordReset"/,
    );
  });

  it("mirrors the prisma model columns", () => {
    for (const col of [
      '"portalUserId" TEXT NOT NULL',
      '"codeHash" TEXT NOT NULL',
      '"email" TEXT NOT NULL',
      '"role" TEXT NOT NULL',
      '"expiresAt" TIMESTAMP(3) NOT NULL',
      '"usedAt" TIMESTAMP(3)',
      '"requestIp" TEXT',
      '"attempts" INTEGER NOT NULL DEFAULT 0',
    ]) {
      expect(SCHEMA_SQL).toContain(col);
    }
  });

  it("declares the three @@index indexes from the prisma model", () => {
    expect(SCHEMA_SQL).toMatch(
      /"PortalPasswordReset_portalUserId_createdAt_idx"/,
    );
    expect(SCHEMA_SQL).toMatch(/"PortalPasswordReset_email_role_idx"/);
    expect(SCHEMA_SQL).toMatch(/"PortalPasswordReset_expiresAt_idx"/);
  });

  it("wires the cascade FK to PortalUser", () => {
    expect(SCHEMA_SQL).toMatch(
      /ALTER TABLE "PortalPasswordReset" ADD CONSTRAINT "PortalPasswordReset_portalUserId_fkey" FOREIGN KEY \("portalUserId"\) REFERENCES "PortalUser"\("id"\) ON DELETE CASCADE/,
    );
  });

  it("ships a manual-migration to backfill existing tenant schemas", () => {
    const migPath = path.join(
      process.cwd(),
      "prisma",
      "manual-migrations",
      "2026-07-07_portal_password_reset.sql",
    );
    expect(fs.existsSync(migPath)).toBe(true);
    const mig = fs.readFileSync(migPath, "utf8");
    expect(mig).toMatch(/CREATE TABLE IF NOT EXISTS "PortalPasswordReset"/);
  });
});

describe("lib/schema.sql — central Tenant table not created per-tenant", () => {
  it("does not CREATE TABLE \"Tenant\" in the per-tenant DDL", () => {
    expect(SCHEMA_SQL).not.toMatch(/CREATE TABLE (IF NOT EXISTS )?"Tenant"/);
  });

  it("does not create the Tenant unique indexes per-tenant", () => {
    expect(SCHEMA_SQL).not.toContain('"Tenant_subdomain_key"');
    expect(SCHEMA_SQL).not.toContain('"Tenant_domain_key"');
  });
});
