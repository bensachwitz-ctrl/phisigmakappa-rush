import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── MONEY INTEGRITY: manual-dues ledger (app/api/admin/brothers PATCH) ────────
// Previously every duesPaid->true flip minted a NEW MANUAL PAID DuesPayment with
// no dedup (re-marking double-counted dues collected), and duesPaid->false never
// reversed the ledger. The fix: dedup the MANUAL row by (brotherId, year, method)
// and, on un-mark, set the MANUAL PAID row(s) REFUNDED. These static assertions
// pin the behavior so a regression fails loudly.

const ROOT = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
const src = read("app/api/admin/brothers/route.ts");

describe("manual dues ledger integrity", () => {
  it("dedups the MANUAL ledger row by (brotherId, year, method) instead of blindly creating", () => {
    // A lookup for an existing MANUAL row for this (brother, year) must precede create.
    expect(src).toMatch(/findFirst\(\{\s*where:\s*\{\s*brotherId:\s*id,\s*year,\s*method:\s*["']MANUAL["']/);
    // And the path reuses it via update when present (no second PAID row).
    expect(src).toMatch(/existingManual\s*\?\s*[\s\S]*?duesPayment\.update/);
  });

  it("reverses the MANUAL PAID row(s) to REFUNDED when dues is un-marked (duesPaid:false)", () => {
    expect(src).toMatch(/data\.duesPaid\s*===\s*false/);
    expect(src).toMatch(/updateMany\(\{[\s\S]*?method:\s*["']MANUAL["'],\s*status:\s*["']PAID["'][\s\S]*?status:\s*["']REFUNDED["']/);
  });

  it("never reverses a STRIPE row on an admin un-mark (only MANUAL is touched)", () => {
    // The reversal where-clause is scoped to method:"MANUAL" — a STRIPE PAID row
    // is reversed exclusively by the refund webhook.
    const idx = src.indexOf("data.duesPaid === false");
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, idx + 800);
    expect(block).toContain('method: "MANUAL"');
    expect(block).not.toContain('method: "STRIPE"');
  });
});
