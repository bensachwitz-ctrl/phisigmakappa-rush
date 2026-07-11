-- APPLY TO PROD — OWNER/CONTROLLED STEP
-- =============================================================================
-- PositionInterest — a non-exec brother's interest in running for / holding an
-- officer position (the member side of the officer-tools "run for a position"
-- feature, item 3).
--
-- The prisma model PositionInterest exists and the runtime reads/writes it
-- (app/api/portal + the officer-tools UI), and lib/schema.sql carries the table
-- so NEW tenants get it at onboard time. But schemas provisioned BEFORE that DDL
-- landed never ran it — so on those chapters every PositionInterest read/write
-- errors "relation \"PositionInterest\" does not exist", leaving the feature
-- fail-soft-forever instead of self-healing. This file brings existing schemas up
-- to date; it is fanned out per tenant schema by lib/tenant-migrations.ts (the
-- apply-tenant-migrations cron), exactly like the portal-reset heal.
--
-- HOW TO APPLY (per existing tenant schema; repeat for each):
--     SET search_path TO "schema_<subdomain>";
--     \i prisma/manual-migrations/2026-07-11_position_interest.sql
--
-- IDEMPOTENT: CREATE TABLE / INDEX IF NOT EXISTS — re-running is a clean no-op,
-- and nothing here drops or rewrites data (strictly additive). Cross-model ids
-- are plain TEXT (no FK to the large Brother table) so it is purely additive.
-- =============================================================================

-- CreateTable
CREATE TABLE IF NOT EXISTS "PositionInterest" (
    "id" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "brotherName" TEXT NOT NULL,
    "positionSlug" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PositionInterest_brotherId_idx" ON "PositionInterest"("brotherId");
CREATE INDEX IF NOT EXISTS "PositionInterest_positionSlug_idx" ON "PositionInterest"("positionSlug");
CREATE INDEX IF NOT EXISTS "PositionInterest_status_idx" ON "PositionInterest"("status");
