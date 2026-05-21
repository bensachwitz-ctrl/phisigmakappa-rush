// W4 — structured drop-reason categories for MemberStatusChange.
//
// Single source of truth shared between the brothers PATCH route's zod
// validator and the secretary's UI dropdown. Keeping this list in a
// dedicated `lib/` module (not co-located with the route) so:
//
//   1. The route file can stay a pure Next.js handler module without
//      Next's type-checker complaining about non-route exports
//      (it only allows GET/POST/PATCH/DELETE/dynamic/runtime/etc.).
//   2. Client components that render the dropdown can import the same
//      list without dragging in the route's prisma deps.
//
// When a brother's status transitions to EXPELLED, INACTIVE, or ALUMNUS,
// the secretary's form requires a category from this list AND a free-text
// reason. The pair is captured in MemberStatusChange.reasonCategory +
// MemberStatusChange.reason, indexed on (toStatus, reasonCategory) so the
// "academic drops this term" KPI is one IndexScan away.

export const STATUS_CHANGE_REASON_CATEGORIES = [
  "academic",
  "financial",
  "conduct",
  "voluntary",
  "transferred",
  "medical",
  "graduation",
  "inactive_status_only",
  "other",
] as const;

export type StatusChangeReasonCategory = (typeof STATUS_CHANGE_REASON_CATEGORIES)[number];

// Human-readable labels for the secretary's dropdown. Order matches the
// expected frequency of use (most-common first) — academic and financial
// are the dominant drop reasons in chapter-life data.
export const STATUS_CHANGE_REASON_LABELS: Record<StatusChangeReasonCategory, string> = {
  academic: "Academic ineligibility",
  financial: "Financial — dues delinquency",
  conduct: "Conduct / standards violation",
  voluntary: "Voluntary withdrawal",
  transferred: "Transferred schools",
  medical: "Medical leave",
  graduation: "Graduated",
  inactive_status_only: "Going inactive (no separation)",
  other: "Other (see free-text reason)",
};

// Which toStatus values REQUIRE a category? When set, the UI surfaces the
// dropdown as required. For all other transitions (PROSPECT → PLEDGE,
// PLEDGE → INITIATE), the category stays optional and the dropdown isn't
// surfaced.
export const TO_STATUS_REQUIRES_REASON = new Set<string>(["EXPELLED", "INACTIVE", "ALUMNUS"]);
