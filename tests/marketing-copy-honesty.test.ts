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

// ── round-4 (M2) ACADEMICS HONESTY — no per-member GPA / credit hours ────────
// The chapter stores per-member academicStanding (string) + studyHours (int)
// ONLY (prisma schema Brother model). There is NO per-member GPA field and NO
// credit-hour field, so the academic CSV export must NOT emit "Term GPA" /
// "Cumulative GPA" / "Credit Hours" columns, and academic-module copy must NOT
// promise GPA tracking the model can't deliver. (A single chapter-AGGREGATE
// stats.gpa marketing number IS stored in SiteConfig and is legitimate — that
// is NOT what these pins forbid; they target only the per-member academic
// surfaces below.) Non-vacuous: the old strings ("Term GPA", "GPA + study
// hours", "GPA & standing per member", "Track brother GPA rosters") would all
// have failed these; the honest replacements pass.
describe("academics honesty — no per-member GPA / credit-hours on surfaces that can't store them (M2)", () => {
  const ACADEMIC_SURFACES: { rel: string; forbid: RegExp[] }[] = [
    {
      rel: "lib/hq-exports.ts",
      // The buildAcademicExport header line must not name GPA / credit hours.
      forbid: [/Term GPA/i, /Cumulative GPA/i, /Credit Hours/i],
    },
    {
      rel: "app/api/admin/exports/run/route.ts",
      // The academic export case must not pass gpaTerm / gpaCumulative / creditHours.
      forbid: [/gpaTerm/, /gpaCumulative/, /creditHours/],
    },
    {
      rel: "app/admin/academic/academic-client.tsx",
      forbid: [/\bGPA\b/],
    },
    {
      rel: "app/admin/exports/exports-client.tsx",
      // The academic export option desc must not promise GPA per member.
      forbid: [/GPA (?:&|and) standing per member/i, /GPA per member/i],
    },
    {
      rel: "app/admin/officers/officers-client.tsx",
      // The academic DOMAIN hint must not say "GPA + study hours".
      forbid: [/GPA \+ study hours/i],
    },
    {
      rel: "components/admin/command-palette.tsx",
      // The academic nav synonyms must not advertise "gpa" / "grades".
      forbid: [/"gpa"/i, /"grades"/i],
    },
  ];

  for (const { rel, forbid } of ACADEMIC_SURFACES) {
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    for (const pattern of forbid) {
      it(`${rel} does not promise per-member GPA/credit-hours (/${pattern.source}/)`, () => {
        expect(
          pattern.test(src),
          `Found a per-member GPA/credit-hours promise matching ${pattern} in ${rel}; the model stores only academicStanding + studyHours.`,
        ).toBe(false);
      });
    }
  }

  it("the academic export header names the real columns (Academic Standing + Study Hours)", () => {
    const src = readFileSync(resolve(ROOT, "lib/hq-exports.ts"), "utf8");
    expect(src).toContain("Academic Standing");
    expect(src).toContain("Study Hours");
  });
});

// ── round-4 (low) "tutor matching" is unbuilt — no role advertises it ────────
// lib/officer-permissions.ts Scholarship Chair previously claimed "tutor
// matching"; no tutor/matching model or route exists. Forbid it across the
// permissions catalog so a copy edit can't reintroduce the unbuilt claim.
describe("officer-permissions honesty — no unbuilt 'tutor matching' (low)", () => {
  const perms = readFileSync(resolve(ROOT, "lib/officer-permissions.ts"), "utf8");
  it("no role description claims tutor matching", () => {
    expect(/tutor\s+match/i.test(perms)).toBe(false);
  });
});

// ── round-4 (M1) DEAD-CONTROL PIN — the mobile dues-reminder button is wired ──
// The shipped mobile binary (mobile-shell/index.html) had a button that fired a
// fake-success toast ("Dues reminders sent to all unpaid members.") with NO
// network call. It must instead POST to the real, officer-gated endpoint and
// report the server's honest result. Pin: the real path is called, and the old
// fabricated toast string is gone. Non-vacuous (the old string would fail #2).
describe("mobile dead-control honesty — dues-reminder button hits the real endpoint (M1)", () => {
  const shell = readFileSync(resolve(ROOT, "mobile-shell/index.html"), "utf8");

  it("the dues-reminder button POSTs to /api/mobile/exec/dues-reminder", () => {
    expect(shell).toContain('authPost("/api/mobile/exec/dues-reminder"');
  });

  it("no longer fires the fabricated 'sent to all unpaid members' toast", () => {
    expect(/Dues reminders sent to all unpaid members/i.test(shell)).toBe(false);
  });

  it("the real endpoint route still exists (the button is not wired to a ghost)", () => {
    // readFileSync throws if the route file is missing → the test fails loudly.
    const route = readFileSync(
      resolve(ROOT, "app/api/mobile/exec/dues-reminder/route.ts"),
      "utf8",
    );
    expect(route).toContain("export async function POST");
  });
});

// ── round-4 (M4) BLUE-REBRAND PIN — no maroon drop-shadows under blue UI ──────
// The portal dashboards + elections voter were rebranded maroon→blue (the
// maroon-*/cream-* Tailwind ramps are rebound to brand CSS vars), but their
// inline arbitrary box-shadows kept raw rgba(74,17,29,a) — a reddish-brown halo
// under blue elements. They were retinted to rgba(10,24,56,a) (deep navy).
// Guard every rebranded component so a maroon shadow can't creep back in.
describe("blue-rebrand honesty — no maroon (rgba(74,17,29)) shadows under blue-brand UI (M4)", () => {
  const REBRANDED = [
    "app/portal/alumni/dashboard/DashboardClient.tsx",
    "app/portal/brothers/dashboard/BrothersDashboardClient.tsx",
    "components/portal/elections-voter.tsx",
  ];
  for (const rel of REBRANDED) {
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    it(`${rel} has no hardcoded maroon rgba(74,17,29) shadow`, () => {
      expect(
        /rgba\(\s*74\s*,\s*17\s*,\s*29/.test(src),
        `Found a maroon rgba(74,17,29) shadow in ${rel}; retint to the blue brand (rgba(10,24,56,a)).`,
      ).toBe(false);
    });
  }
});
