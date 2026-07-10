// scripts/reconcile-tenant-schemas.mjs
//
// Comprehensively reconcile EVERY existing tenant schema against the canonical
// current DDL in lib/schema.sql, healing schema drift. Greek Stack is
// schema-per-tenant; chapters provisioned from an older schema.sql are missing
// tables/columns that newer Prisma-model changes added (e.g. Announcement.pollId,
// the Poll/PollVote tables, PortalUser.mustReset, the PortalPasswordReset table).
// Any Prisma query that reads a missing column/table throws P2022/P2021 -> a live
// 500 (e.g. /api/mobile/data was 500ing because Announcement.pollId was absent).
//
// This is ADDITIVE + NON-DESTRUCTIVE + IDEMPOTENT: it only CREATEs missing tables
// (CREATE TABLE IF NOT EXISTS, straight from schema.sql) and ADDs missing columns
// (ALTER TABLE ADD COLUMN IF NOT EXISTS). It NEVER drops or alters an existing
// column, and never touches data. A NOT NULL column with no DEFAULT is added as
// NULLABLE (adding NOT NULL to a populated table would fail) and flagged.
//
// Runs each tenant inside an interactive transaction that SETs search_path to the
// tenant schema first (getTenantClient's ?schema= param does NOT set search_path),
// so unqualified DDL lands in the right chapter schema.
//
// Run from repo root (reads DB URL from local env at runtime; never printed):
//   node scripts/reconcile-tenant-schemas.mjs           # apply
//   node scripts/reconcile-tenant-schemas.mjs --dry     # report only, no writes

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

for (const f of [".env.local", ".env.production.local", ".env"]) {
  if (existsSync(f)) loadEnv({ path: f, override: false });
}
const DRY = process.argv.includes("--dry");

// Parse lib/schema.sql -> { tableName: { create, cols: [{name, def, notNull, hasDefault}] } }
function parseSchema(sql) {
  const tables = {};
  const re = /CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"\s*\(([\s\S]*?)\n\);/g;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[1];
    const body = m[2];
    const cols = [];
    for (const raw of body.split("\n")) {
      const line = raw.trim().replace(/,\s*$/, "");
      if (!line || line.startsWith("--")) continue;
      if (/^(CONSTRAINT|PRIMARY KEY|UNIQUE|FOREIGN KEY|CHECK)\b/i.test(line)) continue;
      const cm = line.match(/^"([^"]+)"\s+(.+)$/);
      if (!cm) continue;
      const def = cm[2].trim();
      cols.push({ name: cm[1], def, notNull: /\bNOT NULL\b/i.test(def), hasDefault: /\bDEFAULT\b/i.test(def) });
    }
    // Force IF NOT EXISTS on the create statement for safety.
    const create = m[0].replace(/^CREATE TABLE (?:IF NOT EXISTS )?/i, "CREATE TABLE IF NOT EXISTS ");
    tables[name] = { create, cols };
  }
  return tables;
}

const base = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!base) { console.error("✗ No DATABASE_URL(_UNPOOLED) in env."); process.exit(1); }
const sep = base.includes("?") ? "&" : "?";
const schemaSql = readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf8");
const WANT = parseSchema(schemaSql);
const wantTables = Object.keys(WANT);
console.log(`Parsed ${wantTables.length} tables from lib/schema.sql. Mode: ${DRY ? "DRY-RUN" : "APPLY"}`);

async function listTenants() {
  const db = new PrismaClient({ datasources: { db: { url: `${base}${sep}schema=public` } } });
  try {
    const rows = await db.$queryRawUnsafe(`SELECT subdomain FROM "Tenant" ORDER BY subdomain`);
    return rows.map((r) => r.subdomain);
  } finally { await db.$disconnect(); }
}

async function reconcile(subdomain) {
  const schema = `schema_${String(subdomain).replace(/[^a-z0-9_]/gi, "_").toLowerCase()}`;
  const db = new PrismaClient({ datasources: { db: { url: `${base}${sep}schema=${schema}` } } });
  const added = { tables: [], cols: [], nullableFlags: [] };
  try {
    // What exists now in this tenant schema
    const existTbls = new Set((await db.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, schema)).map((r) => r.table_name));
    const existCols = {};
    for (const r of await db.$queryRawUnsafe(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1`, schema)) {
      (existCols[r.table_name] = existCols[r.table_name] || new Set()).add(r.column_name);
    }

    const stmts = [];
    for (const t of wantTables) {
      if (!existTbls.has(t)) {
        stmts.push(WANT[t].create);
        added.tables.push(t);
      } else {
        const have = existCols[t] || new Set();
        for (const c of WANT[t].cols) {
          if (!have.has(c.name)) {
            let def = c.def;
            if (c.notNull && !c.hasDefault) { def = def.replace(/\s*\bNOT NULL\b/i, ""); added.nullableFlags.push(`${t}.${c.name}`); }
            stmts.push(`ALTER TABLE "${schema}"."${t}" ADD COLUMN IF NOT EXISTS "${c.name}" ${def}`);
            added.cols.push(`${t}.${c.name}`);
          }
        }
      }
    }

    if (stmts.length && !DRY) {
      await db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
        for (const s of stmts) {
          try { await tx.$executeRawUnsafe(s); }
          catch (e) { if (!String(e?.message || "").includes("already exists")) throw e; }
        }
      }, { timeout: 120000 });
    }

    const tag = DRY ? "would add" : "added";
    console.log(`  ${stmts.length ? "✓" : "•"} ${subdomain} (${schema}) — ${tag}: ${added.tables.length} table(s), ${added.cols.length} column(s)`);
    if (added.tables.length) console.log(`      tables: ${added.tables.join(", ")}`);
    if (added.cols.length) console.log(`      columns: ${added.cols.join(", ")}`);
    if (added.nullableFlags.length) console.log(`      ⚠ added NULLABLE (schema wants NOT NULL, no default): ${added.nullableFlags.join(", ")}`);
  } catch (e) {
    console.error(`  ✗ ${subdomain} (${schema}) — ${e?.message || e}`);
  } finally { await db.$disconnect(); }
}

const tenants = await listTenants();
console.log(`Reconciling ${tenants.length} tenant schema(s): ${tenants.join(", ")}`);
for (const t of tenants) await reconcile(t);
console.log("Done.");
