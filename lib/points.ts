// Engagement Points / Good-Standing — PURE compute engine (no Prisma, no I/O).
//
// This is the single biggest retention flywheel in the product: it folds five
// otherwise-disconnected modules (dues, chapter-meeting attendance, approved
// service hours, study hours, chore completion) into ONE motivating
// "good standing" number with near-zero new data entry.
//
// CRITICAL ARCHITECTURE NOTE — NO NEW DB TABLES. The score is COMPUTED on the
// fly from data the app already collects. Admin-tunable weights/thresholds live
// in the EXISTING SiteConfig key/value table under the single key
// `points.config` (see lib/points-server.ts). Nothing here touches the DB.
//
// Everything in this file is deterministic and framework-free so it can be
// imported from Node, the Edge runtime, route handlers, server components, and
// React client components alike — and unit-tested in isolation.

// ── Config shape ─────────────────────────────────────────────────────────────

/** The five scoreable dimensions. Stable string keys — they appear in the
 *  breakdown rows and (lightly) in copy, so don't rename without a migration of
 *  the stored config. */
export type PointsDimension =
  | "dues"
  | "meetings"
  | "service"
  | "study"
  | "chores";

export interface PointsConfig {
  /** Max points awarded for paying dues (binary: paid → full, else 0). */
  duesWeight: number;
  /** Max points for chapter-meeting attendance (scaled by attended %). */
  meetingsWeight: number;
  /** Max points for approved service hours (scaled to serviceHoursTarget). */
  serviceWeight: number;
  /** Max points for study hours (scaled to studyHoursTarget). */
  studyWeight: number;
  /** Max points for chore completion (scaled by completed-or-graded %). */
  choresWeight: number;

  /** Approved service hours that earn the FULL serviceWeight. */
  serviceHoursTarget: number;
  /** Study hours that earn the FULL studyWeight. */
  studyHoursTarget: number;

  /** pct >= goodThreshold → "good" standing. (0–100) */
  goodThreshold: number;
  /** pct >= watchThreshold (and < good) → "watch"; below → "risk". (0–100) */
  watchThreshold: number;
}

/**
 * DEFAULT weights + thresholds. Tuned so a member who pays dues, shows up to
 * meetings, and does the bare minimum service/study/chores lands comfortably in
 * "good standing", while a no-show with unpaid dues falls into "risk".
 *
 * Weights sum to 100 by default so a raw score reads naturally as a percentage,
 * but the engine NEVER assumes that — `max` is always summed from the live
 * weights, so an admin can re-weight freely (e.g. 0 out a dimension the chapter
 * doesn't track) and the math stays correct.
 */
export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  duesWeight: 25,
  meetingsWeight: 30,
  serviceWeight: 20,
  studyWeight: 15,
  choresWeight: 10,

  serviceHoursTarget: 15,
  studyHoursTarget: 20,

  goodThreshold: 80,
  watchThreshold: 60,
};

// ── Signal shape ─────────────────────────────────────────────────────────────

/**
 * Per-member raw signals — all sourced from EXISTING columns/tables. The server
 * loader (lib/points-server.ts) aggregates these; the engine just scores them.
 * Every field is optional/defaulted so a partially-onboarded chapter (e.g. no
 * meetings recorded yet) scores cleanly instead of throwing.
 */
export interface MemberSignals {
  /** Brother.duesPaid — the canonical paid boolean. */
  duesPaid?: boolean;

  /** Count of meetings the member was PRESENT or TARDY for (counts as showed). */
  meetingsAttended?: number;
  /** Count of meetings the member was EXCUSED for — excluded from the denominator. */
  meetingsExcused?: number;
  /** Total meetings the member had an attendance row for (any status). */
  meetingsTotal?: number;

  /** Sum of APPROVED service hours (ServiceHourLog.status === "approved"). */
  approvedServiceHours?: number;

  /** Study hours (Brother.studyHours). */
  studyHours?: number;

  /** Chore assignments completed or graded. */
  choresCompleted?: number;
  /** Total chore assignments handed to the member. */
  choresTotal?: number;
}

// ── Result shape ─────────────────────────────────────────────────────────────

export type Standing = "good" | "watch" | "risk";

export interface BreakdownRow {
  key: PointsDimension;
  label: string;
  /** Points earned on this dimension (rounded, clamped to [0, max]). */
  points: number;
  /** Max points available on this dimension (the live weight). */
  max: number;
  /** Short human detail, e.g. "12 / 15 hrs" or "Paid". Display-only. */
  detail: string;
}

export interface StandingResult {
  /** Total points earned across all dimensions (sum of breakdown.points). */
  score: number;
  /** Total points available (sum of the live weights). */
  max: number;
  /** score / max as a 0–100 integer. 0 when max is 0 (no weighted dimensions). */
  pct: number;
  standing: Standing;
  breakdown: BreakdownRow[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Clamp to [0, 1]. */
function ratio01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 1 ? 1 : n;
}

const DIMENSION_LABELS: Record<PointsDimension, string> = {
  dues: "Dues paid",
  meetings: "Meeting attendance",
  service: "Service hours",
  study: "Study hours",
  chores: "Chore completion",
};

/**
 * Coerce an arbitrary (possibly partial / DB-sourced) object into a valid
 * PointsConfig, falling back to DEFAULT_POINTS_CONFIG per-field. Negative
 * weights/targets are floored to 0; thresholds are clamped to 0–100. This is
 * the ONE place malformed stored config is sanitized, so both the API and the
 * server loader get identical, safe behavior.
 */
export function normalizePointsConfig(raw: unknown): PointsConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const w = (key: keyof PointsConfig) =>
    Math.max(0, num(r[key], DEFAULT_POINTS_CONFIG[key]));
  const pct = (key: keyof PointsConfig) => {
    const v = num(r[key], DEFAULT_POINTS_CONFIG[key]);
    return Math.min(100, Math.max(0, v));
  };
  // Targets must be at least 1 so we never divide by zero downstream.
  const target = (key: keyof PointsConfig) =>
    Math.max(1, num(r[key], DEFAULT_POINTS_CONFIG[key]));

  return {
    duesWeight: w("duesWeight"),
    meetingsWeight: w("meetingsWeight"),
    serviceWeight: w("serviceWeight"),
    studyWeight: w("studyWeight"),
    choresWeight: w("choresWeight"),
    serviceHoursTarget: target("serviceHoursTarget"),
    studyHoursTarget: target("studyHoursTarget"),
    goodThreshold: pct("goodThreshold"),
    watchThreshold: pct("watchThreshold"),
  };
}

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Compute a member's good-standing score from raw signals + a (already-merged)
 * config. Pure + deterministic. Each dimension earns `weight * ratio` where
 * ratio ∈ [0,1]:
 *
 *   • dues      — 1 if duesPaid else 0 (binary).
 *   • meetings  — attended / (total − excused). Excused absences don't hurt.
 *                 No meetings yet → full credit (benefit of the doubt, avoids a
 *                 brand-new chapter showing everyone in "risk").
 *   • service   — approvedServiceHours / serviceHoursTarget (capped at 1).
 *   • study     — studyHours / studyHoursTarget (capped at 1).
 *   • chores    — completed / total. No chores assigned → full credit.
 *
 * Standing band: pct >= goodThreshold → good; >= watchThreshold → watch; else
 * risk. watchThreshold is clamped to never exceed goodThreshold so the bands
 * stay ordered even under odd admin input.
 */
export function computeStanding(
  signals: MemberSignals,
  config: PointsConfig = DEFAULT_POINTS_CONFIG
): StandingResult {
  const cfg = normalizePointsConfig(config);

  // ── dues (binary) ──
  const duesPaid = !!signals.duesPaid;
  const duesRatio = duesPaid ? 1 : 0;

  // ── meetings (attended / eligible) ──
  const mAttended = Math.max(0, num(signals.meetingsAttended));
  const mExcused = Math.max(0, num(signals.meetingsExcused));
  const mTotal = Math.max(0, num(signals.meetingsTotal));
  const mEligible = Math.max(0, mTotal - mExcused);
  const meetingsRatio = mEligible <= 0 ? 1 : ratio01(mAttended / mEligible);
  const meetingsDetail =
    mTotal <= 0
      ? "No meetings yet"
      : `${mAttended} / ${mEligible} attended${mExcused > 0 ? ` (${mExcused} excused)` : ""}`;

  // ── service hours (toward target) ──
  const svcHours = Math.max(0, num(signals.approvedServiceHours));
  const serviceRatio = ratio01(svcHours / cfg.serviceHoursTarget);

  // ── study hours (toward target) ──
  const studyHours = Math.max(0, num(signals.studyHours));
  const studyRatio = ratio01(studyHours / cfg.studyHoursTarget);

  // ── chores (completed / assigned) ──
  const cDone = Math.max(0, num(signals.choresCompleted));
  const cTotal = Math.max(0, num(signals.choresTotal));
  const choresRatio = cTotal <= 0 ? 1 : ratio01(cDone / cTotal);
  const choresDetail = cTotal <= 0 ? "None assigned" : `${cDone} / ${cTotal} done`;

  const rows: Array<{ key: PointsDimension; max: number; ratio: number; detail: string }> = [
    { key: "dues", max: cfg.duesWeight, ratio: duesRatio, detail: duesPaid ? "Paid" : "Unpaid" },
    { key: "meetings", max: cfg.meetingsWeight, ratio: meetingsRatio, detail: meetingsDetail },
    {
      key: "service",
      max: cfg.serviceWeight,
      ratio: serviceRatio,
      detail: `${round1(svcHours)} / ${cfg.serviceHoursTarget} hrs`,
    },
    {
      key: "study",
      max: cfg.studyWeight,
      ratio: studyRatio,
      detail: `${round1(studyHours)} / ${cfg.studyHoursTarget} hrs`,
    },
    { key: "chores", max: cfg.choresWeight, ratio: choresRatio, detail: choresDetail },
  ];

  const breakdown: BreakdownRow[] = rows.map((r) => {
    const points = Math.round(r.max * r.ratio);
    return {
      key: r.key,
      label: DIMENSION_LABELS[r.key],
      points: Math.max(0, Math.min(r.max, points)),
      max: r.max,
      detail: r.detail,
    };
  });

  const score = breakdown.reduce((s, r) => s + r.points, 0);
  const max = breakdown.reduce((s, r) => s + r.max, 0);
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;

  const good = cfg.goodThreshold;
  // Keep bands ordered even if an admin sets watch above good.
  const watch = Math.min(cfg.watchThreshold, good);
  let standing: Standing;
  if (pct >= good) standing = "good";
  else if (pct >= watch) standing = "watch";
  else standing = "risk";

  return { score, max, pct, standing, breakdown };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Display helpers (pure; safe in client components) ────────────────────────

/** Human label for a standing band. White-label / neutral copy. */
export function standingLabel(standing: Standing): string {
  switch (standing) {
    case "good":
      return "Good standing";
    case "watch":
      return "Needs attention";
    case "risk":
      return "At risk";
  }
}

/**
 * Tailwind tone tokens per standing for badges/bars. Kept palette-neutral
 * (emerald / amber / rose) so it reads correctly in BOTH the admin (brand-red)
 * and portal (maroon/cream) surfaces without clashing.
 */
export function standingTone(standing: Standing): {
  text: string;
  bg: string;
  ring: string;
  bar: string;
  dot: string;
} {
  switch (standing) {
    case "good":
      return {
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        ring: "ring-emerald-200",
        bar: "bg-emerald-500",
        dot: "bg-emerald-500",
      };
    case "watch":
      return {
        text: "text-amber-700",
        bg: "bg-amber-50",
        ring: "ring-amber-200",
        bar: "bg-amber-500",
        dot: "bg-amber-500",
      };
    case "risk":
      return {
        text: "text-rose-700",
        bg: "bg-rose-50",
        ring: "ring-rose-200",
        bar: "bg-rose-500",
        dot: "bg-rose-500",
      };
  }
}
