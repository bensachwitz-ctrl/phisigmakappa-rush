import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { summariseDonationsByCampaign } from "@/lib/alumni";

// ── MONEY INTEGRITY: donations "raised" must only count PAID rows ────────────
// A manually-logged donation is money the chapter already collected, so the
// create route stamps status:"PAID" (parallel to manual dues). Every aggregation
// — dashboard total, recent list, and the pure campaign summary — must exclude
// PENDING / FAILED / REFUNDED so the chapter never overstates donations raised.

const ROOT = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("summariseDonationsByCampaign — PAID-only", () => {
  it("excludes non-PAID rows when a status field is present", () => {
    const rows = [
      { campaign: "Annual", amountCents: 10000, status: "PAID" },
      { campaign: "Annual", amountCents: 5000, status: "PENDING" },
      { campaign: "Annual", amountCents: 5000, status: "FAILED" },
      { campaign: "Annual", amountCents: 5000, status: "REFUNDED" },
      { campaign: "Scholarship", amountCents: 20000, status: "PAID" },
    ];
    const out = summariseDonationsByCampaign(rows);
    const annual = out.find((c) => c.campaign === "Annual")!;
    const scholarship = out.find((c) => c.campaign === "Scholarship")!;
    // Only the single PAID Annual row counts.
    expect(annual.totalCents).toBe(10000);
    expect(annual.count).toBe(1);
    expect(scholarship.totalCents).toBe(20000);
    // Grand total never includes the 15000 of non-PAID money.
    expect(out.reduce((s, c) => s + c.totalCents, 0)).toBe(30000);
  });

  it("counts rows that carry no status (caller pre-filtered to PAID) — back-compat", () => {
    const out = summariseDonationsByCampaign([
      { campaign: "General", amountCents: 7500 },
      { campaign: "General", amountCents: 2500 },
    ]);
    expect(out[0].totalCents).toBe(10000);
    expect(out[0].count).toBe(2);
  });
});

describe("donation aggregations are status-gated at the source", () => {
  it("the manual-donation create route stamps status:'PAID'", () => {
    const src = read("app/api/admin/alumni/[id]/donations/route.ts");
    // The create payload must set PAID (so it isn't stuck PENDING forever).
    expect(src).toMatch(/status:\s*["']PAID["']/);
  });

  it("the admin dashboard sums + lists ONLY PAID donations", () => {
    const src = read("app/admin/page.tsx");
    // aggregate + findMany both carry where:{ status: "PAID" }.
    expect(src).toMatch(/aggregate\(\{[\s\S]*?where:\s*\{\s*status:\s*["']PAID["']\s*\}/);
    expect(src).toMatch(/findMany\(\{[\s\S]*?where:\s*\{\s*status:\s*["']PAID["']\s*\}/);
  });
});
