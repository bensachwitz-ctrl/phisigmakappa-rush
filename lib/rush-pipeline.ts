// Rush pipeline staging.
//
// PNMs (rushees) flow through these stages during a recruitment cycle. Each
// stage maps to a combination of the existing `Rush.status` enum + a derived
// "voted" / "vetted" flag we compute from related models (Vote, enrichmentData).
//
// We deliberately reuse the existing RUSH_STATUSES enum (ACTIVE | DROPPED |
// BID_EXTENDED | ACCEPTED | DECLINED) so this works without a schema change.
// The "stage" is computed read-only.
//
// Vote threshold math lives here so it's testable in isolation.

export const PIPELINE_STAGES = [
  "SUBMITTED",   // Rush.status = ACTIVE, no votes yet, no enrichmentData
  "VETTED",      // Rush.status = ACTIVE, enrichmentData populated OR has notes
  "VOTED",       // Rush.status = ACTIVE, has at least one Vote row
  "BID_EXTENDED",// Rush.status = BID_EXTENDED
  "ACCEPTED",    // Rush.status = ACCEPTED
  "DECLINED",    // Rush.status = DECLINED (rushee said no to bid)
  "DROPPED",     // Rush.status = DROPPED
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  SUBMITTED: "Submitted",
  VETTED: "Vetted",
  VOTED: "Voted on",
  BID_EXTENDED: "Bid extended",
  ACCEPTED: "Accepted bid",
  DECLINED: "Declined bid",
  DROPPED: "Dropped",
};

export const STAGE_TONES: Record<PipelineStage, string> = {
  SUBMITTED: "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200",
  VETTED: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
  VOTED: "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
  BID_EXTENDED: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
  DECLINED: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200",
  DROPPED: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 line-through",
};

export type RushForStaging = {
  status: string;
  enrichmentData: string | null;
  notes: string | null;
  votes: { value: number }[];
};

/**
 * Derive the pipeline stage from a rush + its votes. Pure function — no DB.
 * Used by both server pages and the test suite.
 */
export function stageOf(r: RushForStaging): PipelineStage {
  if (r.status === "BID_EXTENDED") return "BID_EXTENDED";
  if (r.status === "ACCEPTED") return "ACCEPTED";
  if (r.status === "DECLINED") return "DECLINED";
  if (r.status === "DROPPED") return "DROPPED";
  // ACTIVE — sub-stage by vetting + voting
  if (r.votes && r.votes.length > 0) return "VOTED";
  if ((r.enrichmentData && r.enrichmentData.length > 4) || (r.notes && r.notes.length > 0)) return "VETTED";
  return "SUBMITTED";
}

/**
 * Aggregate vote tally. Treats votes as:
 *   value > 0 → yes
 *   value = 0 → abstain
 *   value < 0 → no
 *
 * Note: abstains DO NOT count toward the threshold denominator (only yes+no).
 * This matches the "2/3 of voting brothers" rule most chapters use.
 */
export function voteTally(votes: { value: number }[]) {
  let yes = 0, no = 0, abstain = 0;
  for (const v of votes) {
    if (v.value > 0) yes++;
    else if (v.value < 0) no++;
    else abstain++;
  }
  return { yes, no, abstain, total: yes + no + abstain, decisive: yes + no };
}

/**
 * Compute whether the current tally meets the bid-extension threshold.
 *   ratio    — e.g. 2/3 majority → 0.6667
 *
 * "decisive" denominator excludes abstains. If no decisive votes yet, returns
 * { ok: false, reason: "no-votes" } so the UI can show a friendly message.
 */
export function meetsThreshold(
  votes: { value: number }[],
  ratio = 2 / 3
): { ok: boolean; yes: number; no: number; abstain: number; needed: number; shortBy: number } {
  const { yes, no, abstain, decisive } = voteTally(votes);
  if (decisive === 0) {
    return { ok: false, yes, no, abstain, needed: 0, shortBy: 0 };
  }
  // Need ceil(ratio * decisive) yes votes
  const needed = Math.ceil(ratio * decisive);
  const shortBy = Math.max(0, needed - yes);
  return { ok: yes >= needed, yes, no, abstain, needed, shortBy };
}

/**
 * Stage-transition guard: returns the legal target stages from a current stage.
 * Used by the dropdown UI. Server still accepts any value (super-admin
 * override path), so this is purely a UX guardrail.
 */
export function allowedStageTransitions(from: PipelineStage): PipelineStage[] {
  switch (from) {
    case "SUBMITTED":
      return ["VETTED", "VOTED", "DROPPED"];
    case "VETTED":
      return ["VOTED", "DROPPED"];
    case "VOTED":
      return ["BID_EXTENDED", "DROPPED"];
    case "BID_EXTENDED":
      return ["ACCEPTED", "DECLINED", "DROPPED"];
    case "ACCEPTED":
      return ["DROPPED"]; // accepted PNMs become brothers via separate flow
    case "DECLINED":
      return ["DROPPED", "VOTED"]; // can re-engage if they change their mind
    case "DROPPED":
      return ["SUBMITTED"]; // revert if dropped in error
    default:
      return [...PIPELINE_STAGES];
  }
}

/**
 * Map a target stage to the rush.status value the API expects.
 * SUBMITTED / VETTED / VOTED all stay as "ACTIVE" — they're sub-stages.
 */
export function stageToRushStatus(stage: PipelineStage): string {
  if (stage === "BID_EXTENDED") return "BID_EXTENDED";
  if (stage === "ACCEPTED") return "ACCEPTED";
  if (stage === "DECLINED") return "DECLINED";
  if (stage === "DROPPED") return "DROPPED";
  return "ACTIVE";
}

export const DROP_REASONS = [
  "Not a fit",
  "Withdrew",
  "Failed vote",
  "Compliance / risk",
  "Other",
] as const;
export type DropReason = (typeof DROP_REASONS)[number];
