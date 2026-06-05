import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";
import { isVotingOpen, tallySeat } from "@/lib/elections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Member-facing elections feed (brothers portal).
 *
 * GET — brother-session-gated. Returns:
 *   • OPEN elections the brother is eligible for (audience BROTHERS or ALL),
 *     each with its seats + candidates (+ statements) and, per seat, whether
 *     THIS brother has already cast a ballot — WITHOUT revealing the choice of
 *     anyone else. We expose `myCandidateId` for the current voter only (so the
 *     UI can show their selection), plus aggregate `totalBallots` per seat.
 *   • Recently-SEATED/CLOSED elections for this term so members can see the
 *     outcome. For closed/seated elections we include the per-seat tally
 *     (aggregate counts only).
 *
 * SECRET BALLOT: the ONLY per-voter datum returned is the current viewer's own
 * choice (resolved from their own ballot row). voterBrotherId is never selected
 * for anyone else — per-candidate counts are aggregates.
 */

const RECENT_CLOSED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET() {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RECENT_CLOSED_WINDOW_MS);

  const elections = await prisma.election.findMany({
    where: {
      audience: { in: ["BROTHERS", "ALL"] },
      OR: [
        { status: "OPEN" },
        // Recently concluded so members can see results.
        { status: { in: ["CLOSED", "SEATED"] }, closedAt: { gte: cutoff } },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      seats: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          candidates: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, statement: true },
          },
          // Pull only what we need: the candidate chosen + the voter id so we
          // can find THIS brother's own ballot. We DO NOT return other voters'
          // ids to the client — see the mapping below.
          ballots: { select: { candidateId: true, voterBrotherId: true } },
        },
      },
    },
  });

  const shaped = elections.map((e) => {
    const open = isVotingOpen({
      status: e.status,
      opensAt: e.opensAt,
      closesAt: e.closesAt,
    });
    const concluded = e.status === "CLOSED" || e.status === "SEATED";

    const seats = e.seats.map((s) => {
      // The current viewer's own ballot (if any) — the only per-voter datum
      // we ever surface. Everyone else's voterBrotherId is dropped here.
      const myBallot = s.ballots.find((b) => b.voterBrotherId === brother.id);

      // Aggregate tally — only revealed once the election has concluded.
      const tally = concluded
        ? tallySeat(
            s.id,
            s.title,
            s.candidates.map((c) => ({ id: c.id, name: c.name })),
            s.ballots.map((b) => ({ candidateId: b.candidateId })),
          )
        : null;

      return {
        id: s.id,
        title: s.title,
        candidates: s.candidates, // { id, name, statement }
        myCandidateId: myBallot?.candidateId ?? null,
        hasVoted: !!myBallot,
        totalBallots: s.ballots.length,
        winnerName: s.winnerName,
        winnerCandidateId: s.winnerCandidateId,
        // Aggregate results (counts/pct) — present only when concluded.
        results: tally ? tally.results : null,
      };
    });

    return {
      id: e.id,
      title: e.title,
      termCode: e.termCode,
      status: e.status,
      anonymous: e.anonymous,
      open,
      concluded,
      opensAt: e.opensAt ? e.opensAt.toISOString() : null,
      closesAt: e.closesAt ? e.closesAt.toISOString() : null,
      closedAt: e.closedAt ? e.closedAt.toISOString() : null,
      seats,
      // Convenience flags for the UI.
      seatCount: seats.length,
      votedSeatCount: seats.filter((s) => s.hasVoted).length,
    };
  });

  return NextResponse.json({ ok: true, elections: shaped });
}
