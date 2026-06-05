// Officer-elections shared logic — PURE functions only (no Prisma, no Next).
//
// Mirrors the lib/poll-options.ts pattern: the security/integrity-critical
// rules (tallying ballots, picking winners, deciding which lifecycle
// transitions are legal) live here as framework-free, unit-testable
// functions. The API routes import these so the boolean/arithmetic logic is
// single-sourced and never re-derived inline.
//
// SECRET-BALLOT NOTE: nothing in this file ever takes a voterBrotherId. A
// "ballot" at this layer is just `{ candidateId }` — the identity column is
// stripped by the caller before tallies are computed, so it is structurally
// impossible to leak who voted for whom through any of these helpers.

export type ElectionStatus = "DRAFT" | "OPEN" | "CLOSED" | "SEATED";

/** The four legal lifecycle states, in order. Exported for select options. */
export const ELECTION_STATUSES: ElectionStatus[] = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "SEATED",
];

/** Minimal candidate shape the tally needs (id + denormalized display name). */
export interface TallyCandidate {
  id: string;
  name: string;
}

/** Minimal ballot shape — ONLY the chosen candidate. NEVER a voter id. */
export interface TallyBallot {
  candidateId: string;
}

export interface SeatResult {
  candidateId: string;
  name: string;
  votes: number;
  isWinner: boolean;
  /** Whole-percent share of the seat's ballots (0 when no ballots cast). */
  pct: number;
}

export interface SeatTally {
  seatId: string;
  title: string;
  totalBallots: number;
  results: SeatResult[];
  /** The winning candidate id, or null when there are no ballots / a tie. */
  winnerCandidateId: string | null;
  /** True when two-or-more candidates share the top vote count. */
  tie: boolean;
}

/**
 * Tally one seat. Pure: counts ballots per candidate, marks the single
 * highest as the winner, and flags `tie` when the top count is shared.
 *
 * Behaviour contract:
 *   • Only ballots whose candidateId is in `candidates` are counted (a ballot
 *     for a removed candidate is ignored, never crashes).
 *   • `pct` is rounded to a whole number against totalBallots.
 *   • On a tie for the top spot, `winnerCandidateId` is null and NO result is
 *     marked `isWinner` — the admin must break the tie before seating.
 *   • Results are sorted by votes desc, then by name asc for stable display.
 */
export function tallySeat(
  seatId: string,
  title: string,
  candidates: TallyCandidate[],
  ballots: TallyBallot[],
): SeatTally {
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c.id, 0);

  let totalBallots = 0;
  for (const b of ballots) {
    if (!counts.has(b.candidateId)) continue; // ignore orphan ballots
    counts.set(b.candidateId, (counts.get(b.candidateId) ?? 0) + 1);
    totalBallots += 1;
  }

  const denom = totalBallots > 0 ? totalBallots : 1;
  let maxVotes = 0;
  for (const c of candidates) {
    const v = counts.get(c.id) ?? 0;
    if (v > maxVotes) maxVotes = v;
  }

  // How many candidates share the top count? (>1 ⇒ tie; only meaningful when
  // at least one ballot was cast.)
  const topCount = candidates.filter((c) => (counts.get(c.id) ?? 0) === maxVotes).length;
  const tie = totalBallots > 0 && maxVotes > 0 && topCount > 1;
  const winnerCandidateId =
    totalBallots > 0 && maxVotes > 0 && !tie
      ? candidates.find((c) => (counts.get(c.id) ?? 0) === maxVotes)?.id ?? null
      : null;

  const results: SeatResult[] = candidates
    .map((c) => {
      const votes = counts.get(c.id) ?? 0;
      return {
        candidateId: c.id,
        name: c.name,
        votes,
        isWinner: winnerCandidateId === c.id,
        pct: Math.round((votes / denom) * 100),
      };
    })
    .sort((a, b) => (b.votes - a.votes) || a.name.localeCompare(b.name));

  return { seatId, title, totalBallots, results, winnerCandidateId, tie };
}

/** A seat as needed for planning winners across an election. */
export interface PlannableSeat {
  id: string;
  title: string;
  candidates: TallyCandidate[];
}

/** Per-seat resolved winner (or the reason there isn't one yet). */
export interface SeatWinnerPlan {
  seatId: string;
  title: string;
  winnerCandidateId: string | null;
  winnerName: string | null;
  totalBallots: number;
  tie: boolean;
  /** True when this seat is ready to be seated (has a single clear winner). */
  seatable: boolean;
}

/**
 * Plan winners for every seat in an election from a ballots-by-seat map.
 * Used by the tally view AND the seat-winners action. Pure — the route does
 * the DB reads, hands us plain arrays, and we return the decision per seat.
 *
 * `ballotsBySeat` maps seatId → ballots[] (already stripped of voter ids).
 */
export function planSeatWinners(
  seats: PlannableSeat[],
  ballotsBySeat: Record<string, TallyBallot[]>,
): SeatWinnerPlan[] {
  return seats.map((seat) => {
    const tally = tallySeat(
      seat.id,
      seat.title,
      seat.candidates,
      ballotsBySeat[seat.id] ?? [],
    );
    const winner = tally.winnerCandidateId
      ? seat.candidates.find((c) => c.id === tally.winnerCandidateId) ?? null
      : null;
    return {
      seatId: seat.id,
      title: seat.title,
      winnerCandidateId: tally.winnerCandidateId,
      winnerName: winner?.name ?? null,
      totalBallots: tally.totalBallots,
      tie: tally.tie,
      seatable: tally.winnerCandidateId !== null,
    };
  });
}

// ── Lifecycle validators ─────────────────────────────────────────────────────
// Each returns a discriminated result so the route can surface a precise 4xx
// reason instead of a generic "bad request". `seatCount` / `everySeatHasN`
// guards keep the admin from opening an empty ballot or seating nothing.

export interface TransitionCheck {
  ok: boolean;
  /** Human-readable reason when ok === false. */
  reason?: string;
}

/** DRAFT → OPEN. Requires at least one seat, and every seat to have ≥1
 *  candidate (you can't open a ballot with an empty race). */
export function canOpenElection(input: {
  status: string;
  seatCount: number;
  seatsWithNoCandidates: number;
}): TransitionCheck {
  if (input.status !== "DRAFT") {
    return { ok: false, reason: "Only a draft election can be opened for voting." };
  }
  if (input.seatCount < 1) {
    return { ok: false, reason: "Add at least one seat before opening voting." };
  }
  if (input.seatsWithNoCandidates > 0) {
    return {
      ok: false,
      reason: "Every seat needs at least one candidate before voting can open.",
    };
  }
  return { ok: true };
}

/** OPEN → CLOSED. Only an open election can be closed. */
export function canCloseElection(input: { status: string }): TransitionCheck {
  if (input.status !== "OPEN") {
    return { ok: false, reason: "Only an open election can be closed." };
  }
  return { ok: true };
}

/** CLOSED → SEATED. Requires the election to be CLOSED and at least one seat
 *  to have a clear (non-tie) winner to install. */
export function canSeatWinners(input: {
  status: string;
  seatableCount: number;
}): TransitionCheck {
  if (input.status !== "CLOSED") {
    return { ok: false, reason: "Close voting before seating winners." };
  }
  if (input.seatableCount < 1) {
    return {
      ok: false,
      reason: "No seat has a clear winner yet — resolve ties or collect votes first.",
    };
  }
  return { ok: true };
}

/** Editing title/term/anonymity/seats/candidates is only allowed while DRAFT,
 *  so the ballot can't change underneath voters once it's live. */
export function canEditStructure(input: { status: string }): TransitionCheck {
  if (input.status !== "DRAFT") {
    return {
      ok: false,
      reason: "The election is locked — you can only edit it while it's a draft.",
    };
  }
  return { ok: true };
}

/** Whether members may cast/replace a ballot right now. */
export function isVotingOpen(input: {
  status: string;
  opensAt?: Date | null;
  closesAt?: Date | null;
  now?: Date;
}): boolean {
  if (input.status !== "OPEN") return false;
  const now = input.now ?? new Date();
  if (input.opensAt && input.opensAt.getTime() > now.getTime()) return false;
  if (input.closesAt && input.closesAt.getTime() <= now.getTime()) return false;
  return true;
}
