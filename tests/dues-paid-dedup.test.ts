import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dedupePaidByBrotherYear } from "@/lib/hq-exports";

// ── MONEY INTEGRITY (council HIGH #4): no double-counted PAID dues ────────────
// Two halves:
//   (a) SOURCE: the manual-dues toggle (app/api/admin/brothers PATCH) must guard
//       on ANY existing PAID DuesPayment for (brother, year) — regardless of
//       method — before minting a MANUAL PAID row, so a Stripe-paid brother who
//       is toggled OFF (reverses MANUAL only → STRIPE PAID survives) then ON
//       does NOT get a second PAID row.
//   (b) EXPORT: even if a duplicate PAID row exists historically, the financial
//       + annual exports dedup to ONE PAID row per (brother, year) before summing,
//       so dues-collected is never doubled.
// Together: a Stripe-paid brother toggled off→on yields neither 2 PAID rows nor
// a doubled export figure.

const ROOT = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

type Row = {
  id: string;
  brotherId: string;
  year: string;
  status: string;
  method: string;
  createdAt: Date;
  amountCents: number;
};

const row = (o: Partial<Row> & { id: string }): Row => ({
  brotherId: "b1",
  year: "2026-fall",
  status: "PAID",
  method: "STRIPE",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  amountCents: 15000,
  ...o,
});

describe("(b) export dedup — dedupePaidByBrotherYear", () => {
  it("collapses two PAID rows for the same (brother, year) to a single counted id", () => {
    const stripe = row({ id: "stripe1", method: "STRIPE", createdAt: new Date("2026-09-01T00:00:00Z") });
    const manual = row({ id: "manual1", method: "MANUAL", createdAt: new Date("2026-09-05T00:00:00Z") });
    const keep = dedupePaidByBrotherYear([stripe, manual]);
    expect(keep.size).toBe(1);
    // Earlier payment wins (the real Stripe charge).
    expect(keep.has("stripe1")).toBe(true);
    expect(keep.has("manual1")).toBe(false);

    // Summing only the kept rows yields ONE assessment, not double.
    const collected = [stripe, manual]
      .filter((r) => keep.has(r.id))
      .reduce((s, r) => s + r.amountCents, 0);
    expect(collected).toBe(15000);
  });

  it("prefers the STRIPE row over MANUAL on a createdAt tie", () => {
    const t = new Date("2026-09-01T00:00:00Z");
    const manual = row({ id: "m", method: "MANUAL", createdAt: t });
    const stripe = row({ id: "s", method: "STRIPE", createdAt: t });
    // Order shouldn't matter — STRIPE wins either way.
    expect([...dedupePaidByBrotherYear([manual, stripe])]).toEqual(["s"]);
    expect([...dedupePaidByBrotherYear([stripe, manual])]).toEqual(["s"]);
  });

  it("keeps distinct (brother, year) buckets separate and ignores non-PAID rows", () => {
    const rows = [
      row({ id: "a", brotherId: "b1", year: "2026-fall", status: "PAID" }),
      row({ id: "b", brotherId: "b2", year: "2026-fall", status: "PAID" }),
      row({ id: "c", brotherId: "b1", year: "2025-fall", status: "PAID" }),
      row({ id: "d", brotherId: "b1", year: "2026-fall", status: "PENDING" }),
      row({ id: "e", brotherId: "b1", year: "2026-fall", status: "REFUNDED" }),
    ];
    const keep = dedupePaidByBrotherYear(rows);
    expect(keep).toEqual(new Set(["a", "b", "c"]));
  });

  it("returns an empty set when there are no PAID rows", () => {
    expect(dedupePaidByBrotherYear([row({ id: "x", status: "PENDING" })]).size).toBe(0);
  });
});

describe("(a) source toggle — guards on ANY existing PAID row before minting MANUAL", () => {
  const src = read("app/api/admin/brothers/route.ts");

  it("looks up ANY PAID row for (brother, year) regardless of method FIRST", () => {
    expect(src).toMatch(
      /findFirst\(\{\s*where:\s*\{\s*brotherId:\s*id,\s*year,\s*status:\s*["']PAID["']/,
    );
  });

  it("only creates a MANUAL PAID row inside the no-existing-PAID branch", () => {
    // The MANUAL create must be guarded by the existingPaid check (else branch).
    expect(src).toMatch(/if\s*\(existingPaid\)\s*\{/);
    const idx = src.indexOf("if (existingPaid)");
    expect(idx).toBeGreaterThan(-1);
    // Within the if-branch (already paid) we re-sync the mirror but never create.
    const elseIdx = src.indexOf("} else {", idx);
    expect(elseIdx).toBeGreaterThan(idx);
    const ifBranch = src.slice(idx, elseIdx);
    expect(ifBranch).not.toContain("duesPayment.create");
  });
});

describe("(b) exports wire dedup before summing PAID amounts", () => {
  const src = read("app/api/admin/exports/run/route.ts");

  it("financial export counts amountPaid from the deduped set, not every PAID row", () => {
    expect(src).toContain("dedupePaidByBrotherYear(payments)");
    expect(src).toMatch(/if\s*\(dedupedPaid\.has\(p\.id\)\)\s*slot\.amountPaidCents/);
  });

  it("annual report sums dues collected from the deduped set", () => {
    expect(src).toMatch(/annualDedupedPaid\.has\(p\.id\)/);
  });
});
