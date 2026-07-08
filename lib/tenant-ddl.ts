import type { PrismaClient } from "@prisma/client";

/**
 * Parse the per-tenant DDL script (lib/schema.sql) into individual executable
 * statements.
 *
 * ORDER IS LOAD-BEARING: strip full-line `--` comments BEFORE splitting on `;`.
 *
 * A comment line may itself contain a semicolon, e.g. schema.sql:
 *   "-- ...when rows exist; with zero rows it falls back byte-for-byte..."
 * If we split on `;` FIRST, the text after that comment-semicolon
 * ("with zero rows it falls back...") no longer starts with `--`, so a naive
 * per-line comment filter cannot recognise it. It survives as the HEAD of the
 * NEXT chunk and is prepended to the following `CREATE TABLE ...` as raw SQL.
 * Postgres then rejects that statement with a syntax error whose message does
 * NOT contain "already exists", so the provisioner rethrows and rolls the whole
 * tenant back — i.e. every provision via that path fails.
 *
 * This helper is the SINGLE parser shared by both provisioning paths
 * (lib/provision.ts and app/api/onboard/route.ts). They previously carried two
 * copies that drifted (provision = buggy split-first; onboard = fixed
 * strip-first); centralising the parser here means it can never drift again.
 */
export function parseTenantDdl(sqlContent: string): string[] {
  let content = sqlContent;
  // Strip a leading UTF-8 BOM if present (schema.sql is authored on Windows).
  if (content.startsWith("﻿")) {
    content = content.slice(1);
  }
  return content
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
}

/**
 * Split a SQL script into statements while RESPECTING dollar-quoted blocks
 * (`$$ … $$` / `$tag$ … $tag$`). Unlike parseTenantDdl (which is safe for
 * lib/schema.sql because that file has no dollar-quoted bodies), the manual
 * migration files under prisma/manual-migrations wrap their catalog-guarded
 * `ADD CONSTRAINT` in a `DO $$ BEGIN … END $$;` block whose body contains its own
 * semicolons. A naive split-on-`;` would shred that block into invalid fragments.
 *
 * Strategy: strip full-line `--` comments first (the migration files only ever
 * place `--` on their own header/annotation lines, never inside a `$$` body or a
 * string literal), then scan character-by-character tracking whether we're inside
 * a dollar-quoted block OR a single-quoted `'…'` string literal, and only treat
 * `;` as a statement terminator when we are inside NEITHER.
 *
 * SINGLE-QUOTE AWARENESS: a seeded value can legitimately contain a `;` or a `$`
 * (e.g. `INSERT … VALUES ('Hi; welcome to $tier$ plan')`). Without tracking string
 * state, the `;` would falsely terminate the statement, or the `$tier$` would be
 * mistaken for a dollar-quote opener and swallow everything up to a close tag that
 * never comes — either way shredding the script. Inside a `'…'` literal, `;` and
 * `$` are literal; a doubled `''` is an escaped quote that stays inside the string.
 * The dollar-block check runs FIRST, so a `'` inside a `$$ … $$` body (Postgres
 * allows unescaped quotes there) is consumed as body, never toggling string state.
 */
export function parseSqlStatementsDollarAware(sqlContent: string): string[] {
  let content = sqlContent;
  if (content.startsWith("﻿")) content = content.slice(1); // strip BOM
  content = content
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements: string[] = [];
  let current = "";
  let tag: string | null = null; // the open dollar-quote tag ("$$", "$foo$"), or null
  let inSingle = false; // inside a single-quoted '…' string literal
  let i = 0;
  while (i < content.length) {
    if (tag) {
      // Inside a dollar-quoted block — consume until the matching close tag. `'`,
      // `;`, and `$` are all literal here, so nothing else can toggle mid-body.
      if (content.startsWith(tag, i)) {
        current += tag;
        i += tag.length;
        tag = null;
        continue;
      }
      current += content[i];
      i += 1;
      continue;
    }
    if (inSingle) {
      // Inside a single-quoted string literal. A doubled `''` is an escaped quote
      // (stays in the string); a lone `'` closes it. `;`/`$` inside are literal.
      if (content[i] === "'") {
        if (content[i + 1] === "'") {
          current += "''";
          i += 2;
          continue;
        }
        current += "'";
        i += 1;
        inSingle = false;
        continue;
      }
      current += content[i];
      i += 1;
      continue;
    }
    // Not inside a block or a string literal — a `$tag$` here OPENS a block.
    const opener = /^\$[A-Za-z0-9_]*\$/.exec(content.slice(i));
    if (opener) {
      tag = opener[0];
      current += opener[0];
      i += opener[0].length;
      continue;
    }
    // A `'` here OPENS a single-quoted string literal.
    if (content[i] === "'") {
      inSingle = true;
      current += "'";
      i += 1;
      continue;
    }
    if (content[i] === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = "";
      i += 1;
      continue;
    }
    current += content[i];
    i += 1;
  }
  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

/** Minimal surface of a PrismaClient this helper needs — keeps it easy to test. */
type RawExecutor = Pick<PrismaClient, "$executeRawUnsafe">;

/**
 * Apply parsed tenant DDL to a schema-bound client. Each statement runs in turn;
 * only "already exists" errors are swallowed so a re-run against a partially
 * built schema stays idempotent (mirrors the ADD CONSTRAINT re-run pattern
 * documented in schema.sql). Any other error is rethrown so the caller can roll
 * the tenant back.
 */
export async function applyTenantDdl(
  client: RawExecutor,
  sqlContent: string,
): Promise<void> {
  const statements = parseTenantDdl(sqlContent);
  for (const stmt of statements) {
    try {
      await client.$executeRawUnsafe(stmt);
    } catch (err: any) {
      if (!err?.message?.includes("already exists")) {
        throw err;
      }
    }
  }
}
