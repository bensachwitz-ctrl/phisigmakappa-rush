-- APPLY TO PROD — OWNER/CONTROLLED STEP
-- =============================================================================
-- Section-builder foundation: Section + SectionContent per-tenant tables.
--
-- These back the structured chapter-site section layout + per-section content
-- overrides (the typed successor to cfg["website.sections"] + the *.json
-- repeaters in SiteConfig). They are ADDITIVE and INERT: the public landing page
-- (components/site/chapter-landing.tsx) reads them ONLY when rows exist, and
-- falls back byte-for-byte to the legacy SiteConfig render when they don't — so a
-- tenant schema that has NOT yet had this migration applied is pixel-identical to
-- before, and the public site cannot 500 on the missing table (every read is
-- wrapped in try/catch).
--
-- WHY THIS IS A MANUAL STEP:
--   Greek Stack is single-tenant-per-schema: every chapter lives in its own
--   Postgres schema (schema_<subdomain>). New tenants already get these tables
--   from lib/schema.sql at onboard time. EXISTING tenant schemas are patched by
--   running this file once PER tenant schema. Additionally, the
--   /api/admin/website/[section] route self-heals the tables on first admin save
--   (CREATE TABLE IF NOT EXISTS), so applying this manually is belt-and-suspenders.
--
-- HOW TO APPLY (per existing tenant schema; repeat for each):
--     SET search_path TO "schema_<subdomain>";
--     \i prisma/manual-migrations/2026-06-30_section_builder.sql
--
-- IDEMPOTENT: uses IF NOT EXISTS everywhere so re-running is safe.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Section" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SectionContent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Section_key_key" ON "Section"("key");
CREATE INDEX IF NOT EXISTS "Section_sortOrder_idx" ON "Section"("sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "SectionContent_sectionId_field_key" ON "SectionContent"("sectionId", "field");
CREATE INDEX IF NOT EXISTS "SectionContent_sectionId_idx" ON "SectionContent"("sectionId");

-- ADD CONSTRAINT has no IF NOT EXISTS in Postgres; guard via catalog lookup so a
-- re-run is a clean no-op.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SectionContent_sectionId_fkey'
    ) THEN
        ALTER TABLE "SectionContent"
            ADD CONSTRAINT "SectionContent_sectionId_fkey"
            FOREIGN KEY ("sectionId") REFERENCES "Section"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
