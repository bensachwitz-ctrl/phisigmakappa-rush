import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditAndNotify } from "@/lib/notify";
import { guardElectionRequest, electionActor } from "@/lib/elections-server";
import { planSeatWinners, canSeatWinners, type PlannableSeat, type TallyBallot } from "@/lib/elections";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Thrown from inside the seating transaction when the atomic CLOSED→SEATED claim
 * update affects zero rows — meaning a concurrent request already seated this
 * election. Caught by the outer handler and surfaced as a clean 409, so a
 * double-submit never double-seats (see the TOCTOU note on POST).
 */
class ElectionAlreadySeatedError extends Error {
  constructor() {
    super("Election already seated");
    this.name = "ElectionAlreadySeatedError";
  }
}

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
 * CONCURRENCY (TOCTOU): the outer canSeatWinners() check reads election.status
 * OUTSIDE the transaction, so two near-simultaneous submits could both observe
 * CLOSED and both seat — double-seating every officer. To close that window the
 * transaction FIRST claims the CLOSED→SEATED transition with a CONDITIONAL update
 * (`updateMany where status='CLOSED'`) and asserts exactly one row changed; the
 * losing request's claim matches zero rows (the row is already SEATED, and the
 * winner holds the row lock until commit) → it aborts and rolls back before any
 * assignment is created, surfacing a clean 409. The outer check stays for a fast,
 * friendly fail on the common (non-concurrent) path.
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
      // ATOMIC CLAIM — flip CLOSED→SEATED conditionally FIRST, inside the txn, so
      // exactly one concurrent submit can proceed. The conditional update takes a
      // row lock on the election; a racing txn re-evaluates `status='CLOSED'`
      // after the winner commits, matches zero rows, and we abort before seating
      // anything (rolls back). This replaces the old trailing unconditional
      // status update that left the TOCTOU window open.
      const claim = await tx.election.updateMany({
        where: { id: election.id, status: "CLOSED" },
        data: { status: "SEATED" },
      });
      if (claim.count !== 1) throw new ElectionAlreadySeatedError();

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
      // NOTE: no trailing status update — the CLOSED→SEATED flip was already
      // claimed atomically at the top of this transaction.
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
    // A concurrent submit already seated this election — the atomic claim inside
    // the transaction rolled us back before any assignment was created. Surface a
    // clean 409 (not a 500) so the double-submit is a harmless no-op.
    if (err instanceof ElectionAlreadySeatedError) {
      return NextResponse.json(
        { ok: false, error: "This election was already seated." },
        { status: 409 },
      );
    }
    errorSink(err, { route: "/api/admin/elections/[id]/seat-winners", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
