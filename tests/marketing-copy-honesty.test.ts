import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Marketing copy honesty (anti-fabrication) ───────────────────────────────
// The treasury is a MANUAL budget + expense tracker; it does NOT reconcile
// against incoming dues automatically (lib/treasury.ts only exports
// currentPeriod(); BudgetLine.actualCents is a hand-entered field and the dues
// webhook never writes to it). Payment plans are explicitly NOT modeled
// (schema.prisma header lists PaymentPlan/PaymentPlanInstallment/
// MemberPaymentProfile as intentionally excluded). Dues reminders are a MANUAL
// officer-triggered broadcast (app/api/mobile/exec/dues-reminder/route.ts), not
// an automated cron. So the landing + feature previews must never claim any of:
//   • "self-reconciling" / "reconciled against ... dues automatically"
//   • "payment plan(s)"
//   • "automatic reminders" / "late tracking" / "then let it run"
// A future copy edit that reintroduces any of these fabricated capabilities must
// fail the gate. Static source-pin (matches the repo's other marketing tests).

const ROOT = resolve(__dirname, "..");
const FILES = [
  "components/site/marketing-landing.tsx",
  "components/site/feature-previews.tsx",
  // The in-app demo also advertises features; it must not claim the same
  // unbuilt dues/treasury capabilities the marketing page used to.
  "app/app/_demo/mock-data.ts",
];

// Each forbidden claim → the real reason it would be a fabrication.
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /self-reconcil/i, why: "treasury is a manual tracker, not self-reconciling" },
  { pattern: /reconcil\w*\s+(?:against|with)\s+(?:the\s+)?(?:incoming\s+)?dues/i, why: "no dues→treasury linkage exists" },
  { pattern: /reconciled against incoming dues/i, why: "no dues→treasury linkage exists" },
  { pattern: /auto-?reconcil/i, why: "no automatic reconciliation is implemented" },
  { pattern: /ledger reconciles itself/i, why: "the ledger does not reconcile itself" },
  { pattern: /payment plan/i, why: "PaymentPlan is intentionally not modeled (schema.prisma)" },
  { pattern: /automatic reminder/i, why: "dues reminders are manual officer-triggered, not automatic" },
  { pattern: /late tracking/i, why: "no member-dues overdue/late tracking is implemented" },
];

describe("marketing copy honesty — no fabricated dues/treasury capabilities", () => {
  for (const rel of FILES) {
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    for (const { pattern, why } of FORBIDDEN) {
      it(`${rel} does not claim /${pattern.source}/ (${why})`, () => {
        expect(pattern.test(src), `Found a forbidden claim matching ${pattern} in ${rel}: ${why}`).toBe(false);
      });
    }
  }
});

describe("marketing copy honesty — the honest replacements are present", () => {
  const landing = readFileSync(resolve(ROOT, "components/site/marketing-landing.tsx"), "utf8");

  it("dues card advertises one-tap reminders to unpaid members (the real feature)", () => {
    // app/api/mobile/exec/dues-reminder emails ONLY active members with duesPaid=false.
    expect(landing).toMatch(/one-tap reminders to members who haven't paid/i);
  });

  it("dues card advertises a live paid/unpaid ledger (no 'self-reconciling')", () => {
    expect(landing).toMatch(/live paid\/unpaid ledger/i);
  });

  it("comparison table lists the honest treasury capability", () => {
    expect(landing).toContain("Chapter treasury, budgets & expense tracking");
  });
});
