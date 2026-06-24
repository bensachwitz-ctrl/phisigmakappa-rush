import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// ── Marketing copy honesty (anti-fabrication) ───────────────────────────────
// The treasury is a MANUAL budget + expense tracker; it does NOT reconcile
// against incoming dues automatically (lib/treasury.ts only exports
// currentPeriod(); BudgetLine.actualCents is a hand-entered field and the dues
// webhook never writes to it). Payment plans are explicitly NOT modeled
// (schema.prisma header lists PaymentPlan/PaymentPlanInstallment/
// MemberPaymentProfile as intentionally excluded). Dues reminders are a MANUAL
// officer-triggered broadcast (app/api/mobile/exec/dues-reminder/route.ts), not
// an automated cron. Officer-election SEATING is also a MANUAL action: closing
// an election (app/api/admin/elections/[id]/close) only sets status=CLOSED — a
// separate "Seat winners" officer action (app/api/admin/elections/[id]/
// seat-winners) is what creates the OfficerAssignment rows. NOTHING seats
// winners automatically "the moment voting closes"; the honest claim is the
// real one-tap flow ("after voting closes, one tap seats every winner"). So the
// landing + feature previews + in-app demo surfaces must never claim any of:
//   • "self-reconciling" / "reconciled against ... dues automatically"
//   • "reconciled ledger" / "tracks spend in real time" (treasury is hand-logged)
//   • "payment plan(s)"
//   • "automatic reminders" / "late tracking" / "then let it run"
//   • "auto-seat(ed) ... on close" / "seated ... automatically" / "the moment
//     voting closes ... seated" (election seating is a separate manual tap)
// A future copy edit that reintroduces any of these fabricated capabilities must
// fail the gate. Static source-pin (matches the repo's other marketing tests).

const ROOT = resolve(__dirname, "..");

// Every demo .tsx advertises features too; gate the WHOLE app/app/_demo tree
// (surfaces AND modals AND backdrops) so an overclaim added to any of them —
// not just SpotlightSurface — fails here. Recursive so a new subfolder of demo
// copy can't slip the net. (round-3 PIN-IT: the prior glob only covered
// _demo/surfaces/*.tsx; broaden to _demo/**/*.tsx.)
function walkTsx(relDir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(ROOT, relDir), { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walkTsx(rel));
    else if (entry.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}
const demoTsxFiles = walkTsx("app/app/_demo");

const FILES = [
  "components/site/marketing-landing.tsx",
  "components/site/feature-previews.tsx",
  // The in-app demo also advertises features; it must not claim the same
  // unbuilt dues/treasury/elections/donation capabilities the marketing page
  // used to. mock-data.ts carries the surface copy; every demo .tsx is pinned.
  "app/app/_demo/mock-data.ts",
  ...demoTsxFiles,
];

// Each forbidden claim → the real reason it would be a fabrication.
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /self-reconcil/i, why: "treasury is a manual tracker, not self-reconciling" },
  { pattern: /reconcil\w*\s+(?:against|with)\s+(?:the\s+)?(?:incoming\s+)?dues/i, why: "no dues→treasury linkage exists" },
  { pattern: /reconciled against incoming dues/i, why: "no dues→treasury linkage exists" },
  { pattern: /auto-?reconcil/i, why: "no automatic reconciliation is implemented" },
  { pattern: /ledger reconciles itself/i, why: "the ledger does not reconcile itself" },
  { pattern: /reconciled ledger/i, why: "the ledger is hand-logged; nothing reconciles it (M2)" },
  { pattern: /tracks spend in real time/i, why: "BudgetLine.actualCents is hand-entered; no real-time spend tracking (M2)" },
  { pattern: /payment plan/i, why: "PaymentPlan is intentionally not modeled (schema.prisma)" },
  { pattern: /automatic reminder/i, why: "dues reminders are manual officer-triggered, not automatic" },
  { pattern: /late tracking/i, why: "no member-dues overdue/late tracking is implemented" },
  // ── Election seating is a SEPARATE manual officer action (M1) ──────────────
  { pattern: /auto-?seat/i, why: "election seating is a separate manual 'Seat winners' tap, not automatic (M1)" },
  { pattern: /seated\s+(?:\w+\s+){0,4}automatically/i, why: "winners are not seated automatically; seating is a manual tap (M1)" },
  { pattern: /automatically\s+seat/i, why: "winners are not seated automatically; seating is a manual tap (M1)" },
  { pattern: /the moment voting closes[^.]*seat/i, why: "close only sets status=CLOSED; seating is a separate manual action (M1)" },
  { pattern: /seated[^.]*(?:on|upon)\s+(?:ballot\s+)?clos/i, why: "seating does not happen on close; it is a separate manual tap (M1)" },

  // ── round-3 (H/M1/L): donations are mode:"payment" one-time only and member
  //   dues are member-initiated one-time Checkout. NOTE the deliberate scoping:
  //   bare /recurring/ and /subscription/ are NOT forbidden — they are TRUE for
  //   the platform plan (chapters' real recurring Stripe subscription to
  //   Greekstack) and for TCPA SMS consent ("recurring … messages"). We forbid
  //   only the DONATION/DUES-recurring overclaims and the demo-only goal meter.
  { pattern: /recurring[\s-]*giving/i, why: "donations are one-time (mode:'payment'); no recurring giving (H)" },
  { pattern: /recurring base/i, why: "donations are one-time; alumni are not a 'recurring base' (H)" },
  // recurring/subscription used in DONATION or DUES context (not platform-plan):
  { pattern: /(?:recurring|subscription|subscri\w+)\s+(?:\w+\s+){0,3}(?:donation|giving|gift|dues)/i, why: "no recurring/subscription donation or dues exist (H/L)" },
  { pattern: /(?:donation|giving|gift|dues)\s+(?:\w+\s+){0,3}(?:recurring|subscription)/i, why: "no recurring/subscription donation or dues exist (H/L)" },
  { pattern: /live goal meter/i, why: "the giving goal meter is demo-only (goalCents lives only in _demo) (M1)" },
  { pattern: /goal meter/i, why: "AlumniDonation.campaign has no goal field; no goal meter is built (M1)" },
  { pattern: /collect dues automatically/i, why: "dues are member-initiated one-time Checkout, not auto-collected (L)" },
  { pattern: /automated dues/i, why: "dues are member-initiated one-time Checkout; nothing auto-bills members (L)" },
  { pattern: /auto-?billing/i, why: "no member dues/donation auto-billing is implemented (L)" },
];

describe("marketing copy honesty — no fabricated dues/treasury/elections capabilities", () => {
  for (const rel of FILES) {
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    for (const { pattern, why } of FORBIDDEN) {
      it(`${rel} does not claim /${pattern.source}/ (${why})`, () => {
        expect(pattern.test(src), `Found a forbidden claim matching ${pattern} in ${rel}: ${why}`).toBe(false);
      });
    }
  }
});

// ── H — the alumni "Donate & Support" panel must not claim a platform fee the
// checkout doesn't charge. app/api/alumni/donate/checkout/route.ts applies $0
// application_fee_amount by default (a positive fee is set ONLY when an admin
// configured dues.platformFeePct > 0 AND the chapter is Connect charges-ready),
// and the panel's "Total Charged" line shows exactly the donation amount with
// nothing added. A copy edit that re-asserts a fixed "5% platform fee" (or any
// "we take a __% platform fee") would contradict both the code and the adjacent
// Total-Charged line — pin it so it can't regress.
describe("donation panel honesty — no fee the checkout does not charge (H)", () => {
  const dash = readFileSync(
    resolve(ROOT, "app/portal/alumni/dashboard/DashboardClient.tsx"),
    "utf8",
  );

  it("does not claim a 5% platform fee", () => {
    expect(/5%\s*platform fee/i.test(dash)).toBe(false);
  });

  it("does not claim we 'take' any fixed-percent platform fee on donations", () => {
    // "we take a N% platform fee" / "take a 5 % platform fee" etc.
    expect(/take\s+a?\s*\d+\s*%?\s*platform fee/i.test(dash)).toBe(false);
  });

  it("the donation summary still shows a single Total Charged = donation amount (no added fee row)", () => {
    // The summary block charges exactly the donation amount; if a fee were ever
    // wired into THIS panel, this anchor + the claims above would need to change
    // together — keeping copy and charge in lockstep.
    expect(dash).toContain("Total Charged:");
  });
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
