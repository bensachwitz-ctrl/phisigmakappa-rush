import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditAndNotify } from "@/lib/notify";
import { guardElectionRequest, electionActor } from "@/lib/elections-server";
import { planSeatWinners, canSeatWinners, type PlannableSeat, type TallyBallot } from "@/lib/elections";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/elections/[id]/seat-winners — install the winners
 * (CLOSED → SEATED).
 *
 * For every seat that has a single clear winner (no tie, ≥1 ballot):
 *   1. If the seat maps to an OfficerPosition (positionId set), END the prior
 *      active holder for that positionId+termCode (endDate = now) — mirrors the
 *      officer-assignment lifecycle in app/api/admin/officers.
 *   2. CREATE a new OfficerAssignment (positionId, brotherId = winner,
 *      termCode = election.termCode, startDate = now). Custom-office seats
 *      (no positionId) can't create an assignment, so they only record the
 *      winner on the seat (winnerName/winnerBrotherId) without seating an
 *      officer row.
 *   3. Stamp seat.winnerCandidateId / winnerBrotherId / winnerName /
 *      seatedAssignmentId.
 * Finally flips the election to SEATED.
 *
 * Idempotency / safety: runs inside a single transaction. Ties and zero-ballot
 * seats are SKIPPED (reported back in `skipped`) — never force a winner.
 *
 * SECRET BALLOT: ballots are read as `{ candidateId }` only — voterBrotherId is
 * never selected, so seating can't expose who voted for whom.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const election = await prisma.election.findUnique({
      where: { id: params.id },
      include: {
        seats: {
          include: {
            candidates: { select: { id: true, brotherId: true, name: true } },
            ballots: { select: { candidateId: true } }, // NO voterBrotherId
          },
        },
      },
    });
    if (!election) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }

    // Plan winners from plain arrays (pure logic in lib/elections).
    const plannable: PlannableSeat[] = election.seats.map((s) => ({
      id: s.id,
      title: s.title,
      candidates: s.candidates.map((c) => ({ id: c.id, name: c.name })),
    }));
    const ballotsBySeat: Record<string, TallyBallot[]> = {};
    for (const s of election.seats) ballotsBySeat[s.id] = s.ballots;
    const plans = planSeatWinners(plannable, ballotsBySeat);

    const seatable = plans.filter((p) => p.seatable);
    const check = canSeatWinners({ status: election.status, seatableCount: seatable.length });
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.reason }, { status: 409 });
    }

    // Fast lookups: candidate → brotherId, seat → positionId.
    const candidateBrother = new Map<string, string>();
    const seatPosition = new Map<string, string | null>();
    for (const s of election.seats) {
      seatPosition.set(s.id, s.positionId);
      for (const c of s.candidates) candidateBrother.set(c.id, c.brotherId);
    }

    const now = new Date();
    const seatedSummaries: { seat: string; winner: string; assignmentId: string | null }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const plan of seatable) {
        if (!plan.winnerCandidateId) continue;
        const winnerBrotherId = candidateBrother.get(plan.winnerCandidateId) ?? null;
        const positionId = seatPosition.get(plan.seatId) ?? null;
        let assignmentId: string | null = null;

        if (positionId && winnerBrotherId) {
          // 1. End the prior active holder(s) for this position + term.
          await tx.officerAssignment.updateMany({
            where: {
              positionId,
              termCode: election.termCode,
              OR: [{ endDate: null }, { endDate: { gt: now } }],
            },
            data: { endDate: now },
          });
          // 2. Seat the winner as the new active assignment.
          const created = await tx.officerAssignment.create({
            data: {
              positionId,
              brotherId: winnerBrotherId,
              termCode: election.termCode,
              startDate: now,
              notes: `Seated from election "${election.title}"`,
            },
            select: { id: true },
          });
          assignmentId = created.id;
        }

        // 3. Record the winner on the seat (works for custom offices too).
        await tx.electionSeat.update({
          where: { id: plan.seatId },
          data: {
            winnerCandidateId: plan.winnerCandidateId,
            winnerBrotherId,
            winnerName: plan.winnerName,
            seatedAssignmentId: assignmentId,
          },
        });

        seatedSummaries.push({
          seat: plan.title,
          winner: plan.winnerName ?? "—",
          assignmentId,
        });
      }

      await tx.election.update({
        where: { id: election.id },
        data: { status: "SEATED" },
      });
    });

    const skipped = plans
      .filter((p) => !p.seatable)
      .map((p) => ({ seat: p.title, reason: p.tie ? "tie" : "no votes" }));

    const actor = await electionActor(req);
    await auditAndNotify("election.seat_winners", {
      actor,
      entity: { type: "Election", id: election.id, name: election.title },
      payload: { after: { status: "SEATED", seated: seatedSummaries, skipped } },
      details:
        seatedSummaries.length > 0
          ? `— seated ${seatedSummaries.length} ${seatedSummaries.length === 1 ? "officer" : "officers"} for ${election.termCode}`
          : undefined,
    });

    return NextResponse.json({ ok: true, seated: seatedSummaries, skipped });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]/seat-winners", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
