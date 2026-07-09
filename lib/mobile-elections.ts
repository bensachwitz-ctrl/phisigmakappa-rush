// lib/mobile-elections.ts — shared, server-side builder for the MEMBER-facing
// election payload consumed by the mobile app's Vote/Elections spotlight.
//
// WHY THIS EXISTS
// ───────────────────────────────────────────────────────────────────────────
// The mobile data route (/api/mobile/data) and the cast-ballot route
// (/api/mobile/elections/vote) both need to return the SAME member-scoped view
// of the currently-open election so the client can render the ballot and the
// member's own already-cast choices. Centralizing the query + shaping here means
// the two routes can never drift apart.
//
// SECRET BALLOT: ballots are read as `{ candidateId }` for the live tally, and
// SEPARATELY the caller's OWN ballots are read by `voterBrotherId` ONLY to tell
// the client which seats this member already voted in (the `myBallot` map). A
// voter's identity is never paired with their candidate choice in the returned
// tally — the per-candidate counts are aggregate. The member's own choices are
// returned only to THAT member (they already know how they voted).

import type { PrismaClient } from "@prisma/client";
import { tallySeat, VOTING_ELIGIBLE_STATUSES } from "@/lib/elections";

/** A candidate as the mobile spotlight renders it. */
export interface MobileElectionCandidate {
  id: string;
  name: string;
  year: string;
  blurb: string;
  votes: number;
}

/** A seat (office) on the ballot. */
export interface MobileElectionSeat {
  id: string;
  title: string;
  candidates: MobileElectionCandidate[];
}

/** The whole member-facing election view (null when no election is open). */
export interface MobileElectionView {
  id: string;
  title: string;
  ballotsCast: number;
  totalEligible: number;
  seats: MobileElectionSeat[];
}

/**
 * Build the member-facing view of the single currently-OPEN election for a
 * chapter, plus the caller's own already-cast ballots.
 *
 * Returns `{ election: null, myBallot: {} }` when no election is open for this
 * member's audience — the client renders an explicit "No open elections" empty
 * state in that case (never a blank, data-less surface).
 *
 * SECRET-BALLOT / NO-INFLUENCE: while the election is OPEN, per-candidate running
 * vote counts are SUPPRESSED (returned as 0) for the member-facing view. Exposing
 * the live tally to every voter mid-election leaks who's winning and lets late
 * voters be swayed by (or pile onto) the current leader. Counts are only ever
 * revealed to an OFFICER viewing the admin tally — via `opts.includeCandidateVotes`
 * — or after the election is no longer OPEN. The aggregate participation headline
 * (`ballotsCast` / `totalEligible`) is NOT per-candidate and stays visible.
 *
 * @param db            tenant Prisma client (already bound to the chapter)
 * @param voterBrotherId the verified caller's Brother.id (for the myBallot map);
 *                       pass null for a member with no brother row (→ empty map)
 * @param role          the verified session role ("brother" | "alumni" | "pnm")
 * @param opts.includeCandidateVotes  reveal per-candidate counts — ONLY set true
 *                       for an officer/admin tally surface, NEVER a voter view.
 */
export async function buildMobileElectionView(
  db: PrismaClient,
  voterBrotherId: string | null,
  role: string,
  opts: { includeCandidateVotes?: boolean } = {},
): Promise<{ election: MobileElectionView | null; myBallot: Record<string, string> }> {
  // Only brother-role sessions vote (the audience is BROTHERS or ALL). Alumni /
  // PNM sessions never see a ballot.
  if (role !== "brother") return { election: null, myBallot: {} };

  // The single most-recently-opened election whose audience includes brothers.
  const election = await db.election.findFirst({
    where: { status: "OPEN", audience: { in: ["BROTHERS", "ALL"] } },
    orderBy: [{ opensAt: "desc" }, { createdAt: "desc" }],
    include: {
      seats: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          candidates: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, statement: true, brotherId: true },
          },
          // SECRET BALLOT: aggregate tally reads ONLY the candidate id.
          ballots: { select: { candidateId: true } },
        },
      },
    },
  });

  if (!election) return { election: null, myBallot: {} };

  // Total eligible voters = the active roster (the audience that may cast a
  // ballot). Real count, not a fabricated number. The eligible-status set is
  // single-sourced with the vote-cast gates (lib/elections VOTING_ELIGIBLE_STATUSES)
  // so "who may vote" and "how many may vote" can never drift apart.
  const totalEligible = await db.brother
    .count({ where: { status: { in: [...VOTING_ELIGIBLE_STATUSES] } } })
    .catch(() => 0);

  // Candidate display metadata (year) — denormalized name lives on the
  // candidate row; the brother row carries the class year shown in the ballot.
  const candidateBrotherIds = election.seats
    .flatMap((s) => s.candidates.map((c) => c.brotherId))
    .filter((x): x is string => !!x);
  const candidateBrothers = candidateBrotherIds.length
    ? await db.brother
        .findMany({
          where: { id: { in: candidateBrotherIds } },
          select: { id: true, year: true },
        })
        .catch(() => [] as { id: string; year: string | null }[])
    : [];
  const yearById = new Map(candidateBrothers.map((b) => [b.id, b.year || ""]));

  // The caller's OWN ballots (which seat → which candidate). Read by the
  // verified voter id only; returned only to that member so the UI can show
  // their "Voted" state. Never exposed for any other voter.
  const myBallot: Record<string, string> = {};
  if (voterBrotherId) {
    const seatIds = election.seats.map((s) => s.id);
    if (seatIds.length) {
      const mine = await db.electionBallot
        .findMany({
          where: { voterBrotherId, seatId: { in: seatIds } },
          select: { seatId: true, candidateId: true },
        })
        .catch(() => [] as { seatId: string; candidateId: string }[]);
      for (const b of mine) myBallot[b.seatId] = b.candidateId;
    }
  }

  // CHAPTER-WIDE PARTICIPATION HEADLINE — count DISTINCT voters, not the sum of
  // per-seat ballots. In a multi-seat election a member casts one ballot PER
  // seat, so summing per-seat totals over-counts a single voter as many times as
  // seats they voted on (a 3-seat ballot filled by 10 members would read "30
  // ballots cast"). The headline means "how many members have participated", so
  // we count distinct voterBrotherId across all of this election's seats. This
  // reads voterBrotherId for an AGGREGATE COUNT ONLY — it is never paired with a
  // candidate choice, so the secret ballot is preserved.
  const allSeatIds = election.seats.map((s) => s.id);
  const ballotsCast = allSeatIds.length
    ? await db.electionBallot
        .findMany({
          where: { seatId: { in: allSeatIds } },
          select: { voterBrotherId: true },
          distinct: ["voterBrotherId"],
        })
        .then((rows) => rows.length)
        .catch(() => 0)
    : 0;

  // The query above only ever returns an OPEN election, so per-candidate counts
  // are revealed ONLY when an officer explicitly opts in (admin tally). Every
  // voter-facing caller leaves this false → live standings stay hidden.
  const revealCandidateVotes = opts.includeCandidateVotes === true;

  const seats: MobileElectionSeat[] = election.seats.map((s) => {
    const tally = tallySeat(
      s.id,
      s.title,
      s.candidates.map((c) => ({ id: c.id, name: c.name })),
      s.ballots,
    );
    const votesById = new Map(tally.results.map((r) => [r.candidateId, r.votes]));
    return {
      id: s.id,
      title: s.title,
      candidates: s.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        year: c.brotherId ? yearById.get(c.brotherId) || "" : "",
        blurb: c.statement || "",
        // Suppressed (0) for the voter-facing OPEN-election view — see the
        // NO-INFLUENCE note on this function. Officers pass includeCandidateVotes.
        votes: revealCandidateVotes ? votesById.get(c.id) ?? 0 : 0,
      })),
    };
  });

  return {
    election: {
      id: election.id,
      title: election.title,
      ballotsCast,
      totalEligible,
      seats,
    },
    myBallot,
  };
}
