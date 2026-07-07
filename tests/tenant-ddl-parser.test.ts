import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { parseTenantDdl, applyTenantDdl } from "@/lib/tenant-ddl";

// ---------------------------------------------------------------------------
// lib/tenant-ddl.ts — the SINGLE shared per-tenant DDL parser used by both
// provisioning paths (lib/provision.ts + app/api/onboard/route.ts).
//
// REGRESSION under test: lib/provision.ts used to `content.split(";")` FIRST and
// only strip `--` comment lines per-chunk afterwards. lib/schema.sql has comment
// lines that themselves contain a semicolon (e.g. "-- ...when rows exist; with
// zero rows it falls back..."). Splitting on ";" first makes the post-semicolon
// fragment the HEAD of the next chunk; it no longer starts with "--", survives
// the per-line filter, and is prepended to the following CREATE TABLE as raw
// SQL — Postgres then rejects it with a syntax error (NOT "already exists"), so
// the provisioner rethrows and rolls the whole tenant back. Every provision via
// that path failed. The fix strips comment lines BEFORE the split.
// ---------------------------------------------------------------------------

// The exact failure-shaped fragment (mirrors lib/schema.sql): a SINGLE comment
// line with `--` and text on BOTH sides of a mid-line semicolon, sitting right
// before a CREATE TABLE. Splitting on ";" first severs "-- ...rows exist" (kept,
// filtered) from " with zero rows it falls back..." (survives — no leading `--`).
const FRAGMENT = `-- ADDITIVE + INERT: the landing page reads these tables only when rows exist; with zero rows it falls back byte-for-byte to the legacy render.
CREATE TABLE IF NOT EXISTS "Section" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Section_key_idx" ON "Section"("key");`;

// A reference implementation of the OLD buggy order (split-first) — kept only to
// PROVE the bug is real: on the same fragment it produces a corrupted statement.
function buggySplitFirst(sqlContent: string): string[] {
  return sqlContent
    .split(";")
    .map((stmt) =>
      stmt
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((stmt) => stmt.length > 0);
}

describe("parseTenantDdl — comment-semicolon robustness (red→green)", () => {
  it("RED: the old split-first order corrupts the statement after a comment-semicolon", () => {
    const bad = buggySplitFirst(FRAGMENT);
    // The comment fragment after "exist;" leaks into a statement as raw SQL and
    // is prepended to the CREATE TABLE — exactly the shape Postgres rejects.
    const create = bad.find((s) => s.includes('CREATE TABLE IF NOT EXISTS "Section"'));
    expect(create).toBeDefined();
    expect(create).toContain("with zero rows it falls back");
    expect(create!.startsWith("CREATE TABLE")).toBe(false);
  });

  it("GREEN: the shared parser strips comment lines first, so statements are clean", () => {
    const stmts = parseTenantDdl(FRAGMENT);
    // No parsed statement carries any comment prose.
    for (const s of stmts) {
      expect(s).not.toContain("with zero rows it falls back");
      expect(s).not.toMatch(/^--/);
    }
    const create = stmts.find((s) => s.includes('CREATE TABLE IF NOT EXISTS "Section"'));
    expect(create).toBeDefined();
    expect(create!.startsWith("CREATE TABLE")).toBe(true);
    // Exactly the CREATE TABLE + the CREATE INDEX survive as separate statements.
    expect(stmts).toHaveLength(2);
  });

  it("strips a leading UTF-8 BOM", () => {
    const stmts = parseTenantDdl("﻿" + `CREATE TABLE "X" ("id" TEXT);`);
    expect(stmts[0].startsWith("CREATE TABLE")).toBe(true);
  });

  it("parses the REAL lib/schema.sql into clean, comment-free statements", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "lib", "schema.sql"),
      "utf8",
    );
    const stmts = parseTenantDdl(sql);
    expect(stmts.length).toBeGreaterThan(40);
    // Every statement must begin with a real DDL keyword — never leftover
    // comment prose from a comment-semicolon line.
    for (const s of stmts) {
      expect(s).toMatch(/^(CREATE|ALTER|DROP|INSERT|DO|COMMENT|SET|GRANT)\b/i);
    }
  });
});

describe("applyTenantDdl — execution semantics", () => {
  it("runs every parsed statement in order", async () => {
    const calls: string[] = [];
    const client = {
      $executeRawUnsafe: vi.fn(async (s: string) => {
        calls.push(s);
        return 1;
      }),
    };
    await applyTenantDdl(client as any, FRAGMENT);
    expect(calls).toHaveLength(2);
    expect(calls[0].startsWith("CREATE TABLE")).toBe(true);
  });

  it("swallows only 'already exists' errors (idempotent re-run)", async () => {
    const client = {
      $executeRawUnsafe: vi.fn(async () => {
        throw new Error('relation "Section" already exists');
      }),
    };
    await expect(applyTenantDdl(client as any, FRAGMENT)).resolves.toBeUndefined();
  });

  it("rethrows any other error so the caller can roll the tenant back", async () => {
    const client = {
      $executeRawUnsafe: vi.fn(async () => {
        throw new Error('syntax error at or near "with"');
      }),
    };
    await expect(applyTenantDdl(client as any, FRAGMENT)).rejects.toThrow(/syntax error/);
  });
});
