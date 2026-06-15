-- APPLY TO PROD — OWNER/CONTROLLED STEP
-- =============================================================================
-- AuditLog hash-chain columns (tamper-evidence). Adds seq / prevHash / hash to
-- the per-tenant "AuditLog" table so lib/audit.ts can write a hash-linked chain
-- and verifyChain() can detect any edit/deletion/reorder of historical rows.
--
-- WHY THIS IS A MANUAL STEP:
--   Greek Stack is single-tenant-per-schema: every chapter lives in its own
--   Postgres schema (schema_<subdomain>). New tenants already get these columns
--   from lib/schema.sql at onboard time. EXISTING tenant schemas must be patched
--   by running this file once PER tenant schema. This was NOT applied to any live
--   DB by the automated fix wave (per the no-prod-migration constraint).
--
-- HOW TO APPLY (per existing tenant schema; repeat for each, plus "public" if it
-- holds a canonical AuditLog):
--     SET search_path TO "schema_<subdomain>";
--     \i prisma/manual-migrations/2026-06-15_auditlog_hashchain.sql
--   …or wrap in a DO block that loops over information_schema.schemata.
--
-- IDEMPOTENT: uses IF NOT EXISTS so re-running is safe.
-- BACKFILL NOTE: existing rows keep hash = NULL and are treated as "legacy"
--   (pre-chain) by verifyChain — they are reported but do not fail verification.
--   New rows written after this migration form the chain going forward.
-- =============================================================================

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "seq" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "prevHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "hash" TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_seq_idx" ON "AuditLog"("seq");
