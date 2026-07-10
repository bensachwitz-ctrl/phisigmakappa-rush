// scripts/heal-tenant-schemas.mjs
//
// Apply the curated, idempotent manual migrations to EVERY existing tenant schema
// — CORRECTLY. Greek Stack is schema-per-tenant; the in-app applier
// (lib/tenant-migrations.ts) binds each tenant via getTenantClient, whose
// connection URL carries `?schema=schema_<sub>`. That param makes Prisma QUALIFY
// its own model queries, but it does NOT set the connection `search_path` (it stays
// `"$user", public`). So a raw, UNQUALIFIED migration statement runs against
// `public`, not the tenant schema — which is why PortalPasswordReset + the
// PortalUser.mustReset column never reached any chapter schema.
//
// This script fixes that by running each migration file's statements inside an
// INTERACTIVE TRANSACTION that first `SET search_path TO "<schema>", public` —
// interactive transactions hold ONE connection, so the SET persists across every
// statement in the file. Idempotent (every statement is IF NOT EXISTS / catalog-
// guarded), additive, data-safe. Run from the repo root:
//
//   node scripts/heal-tenant-schemas.mjs
//
// Reads the DB URL from local env at runtime (never printed/committed).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

for (const f of [".env.local", ".env.production.local", ".env"]) {
  if (existsSync(f)) loadEnv({ path: f, override: false });
}

// Keep this list in sync with lib/tenant-migrations.ts IDEMPOTENT_MANUAL_MIGRATIONS.
const MIGRATIONS = [
  "2026-06-15_auditlog_hashchain.sql",
  "2026-06-30_section_builder.sql",
  "2026-07-07_portal_password_reset.sql",
  "2026-07-10_portal_mustreset.sql",
];

// Split SQL into statements, respecting $$...$$ dollar-quoted blocks (so a DO $$
// ... $$ body with interior semicolons stays one statement). Mirrors the intent
// of lib/tenant-ddl.ts parseSqlStatementsDollarAware without importing TS.
function splitSql(sql) {
  // Strip line comments first, then scan char-by-char toggling in/out of $$ blocks
  // on each `$$`; only a top-level `;` (dollar-depth 0) ends a statement.
  const text = sql
    .split(/\r?\n/)
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
  const out = [];
  let buf = "";
  let inDollar = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "$" && text[i + 1] === "$") {
      inDollar = !inDollar;
      buf += "$$";
      i++;
      continue;
    }
    buf += text[i];
    if (text[i] === ";" && !inDollar) {
      const stmt = buf.trim();
      if (stmt && stmt !== ";") out.push(stmt);
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const base = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!base) {
  console.error("✗ No DATABASE_URL(_UNPOOLED) in env. Run from the repo root (.env.local).");
  process.exit(1);
}
const sep = base.includes("?") ? "&" : "?";
const dir = path.join(process.cwd(), "prisma", "manual-migrations");

async function listTenants() {
  const db = new PrismaClient({ datasources: { db: { url: `${base}${sep}schema=public` } } });
  try {
    const rows = await db.$queryRawUnsafe(`SELECT subdomain FROM "Tenant" ORDER BY subdomain`);
    return rows.map((r) => r.subdomain);
  } finally {
    await db.$disconnect();
  }
}

async function healOne(subdomain) {
  const schema = `schema_${String(subdomain).replace(/[^a-z0-9_]/gi, "_").toLowerCase()}`;
  const db = new PrismaClient({ datasources: { db: { url: `${base}${sep}schema=${schema}` } } });
  let applied = 0;
  try {
    for (const file of MIGRATIONS) {
      const p = path.join(dir, file);
      if (!existsSync(p)) continue;
      const stmts = splitSql(readFileSync(p, "utf8"));
      await db.$transaction(async (tx) => {
        // Pin the tenant schema for the life of this single-connection transaction
        // so the migration's unqualified identifiers resolve to THIS chapter.
        await tx.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
        for (const stmt of stmts) {
          try {
            await tx.$executeRawUnsafe(stmt);
          } catch (err) {
            if (!String(err?.message || "").includes("already exists")) throw err;
          }
        }
      }, { timeout: 60000 });
      applied++;
    }
    console.log(`  ✓ ${subdomain} (${schema}) — ${applied}/${MIGRATIONS.length} files applied`);
  } catch (err) {
    console.error(`  ✗ ${subdomain} (${schema}) — ${err?.message || err}`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const tenants = await listTenants();
  console.log(`Healing ${tenants.length} tenant schema(s):`, tenants.join(", "));
  for (const t of tenants) await healOne(t);
  console.log("Done.");
}

main().catch((e) => {
  console.error("✗ Heal failed:", e?.message || e);
  process.exit(1);
});
