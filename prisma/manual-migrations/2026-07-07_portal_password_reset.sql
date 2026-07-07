-- APPLY TO PROD — OWNER/CONTROLLED STEP
-- =============================================================================
-- Portal password reset (OTP flow): the PortalPasswordReset per-tenant table.
--
-- This table backs the member-portal one-time-code password reset
-- (app/api/portal/reset/request | verify | complete). The prisma model
-- PortalPasswordReset (prisma/schema.prisma) and the runtime writes have existed
-- for a while, but the table was MISSING from lib/schema.sql — so every tenant
-- provisioned from that DDL lacked it. /api/portal/reset/request wraps the
-- persist in try/catch and still returns the neutral "check your email" message,
-- so the OTP was never stored, no code was emailed, reset/verify found no row,
-- and portal password reset silently could never complete.
--
-- New tenants now get this table from lib/schema.sql at onboard time. EXISTING
-- tenant schemas are patched by running this file once PER tenant schema.
--
-- HOW TO APPLY (per existing tenant schema; repeat for each):
--     SET search_path TO "schema_<subdomain>";
--     \i prisma/manual-migrations/2026-07-07_portal_password_reset.sql
--
-- IDEMPOTENT: uses IF NOT EXISTS everywhere + a catalog-guarded ADD CONSTRAINT,
-- so re-running is a clean no-op.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "PortalPasswordReset" (
    "id" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalPasswordReset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PortalPasswordReset_portalUserId_createdAt_idx" ON "PortalPasswordReset"("portalUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "PortalPasswordReset_email_role_idx" ON "PortalPasswordReset"("email", "role");
CREATE INDEX IF NOT EXISTS "PortalPasswordReset_expiresAt_idx" ON "PortalPasswordReset"("expiresAt");

-- ADD CONSTRAINT has no IF NOT EXISTS in Postgres; guard via catalog lookup so a
-- re-run is a clean no-op.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PortalPasswordReset_portalUserId_fkey'
    ) THEN
        ALTER TABLE "PortalPasswordReset"
            ADD CONSTRAINT "PortalPasswordReset_portalUserId_fkey"
            FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
