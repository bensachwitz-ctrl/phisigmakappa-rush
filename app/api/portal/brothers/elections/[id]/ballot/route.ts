import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother, isSameOrigin } from "@/lib/auth";
import { isVotingOpen, isVoterEligible } from "@/lib/elections";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/portal/brothers/elections/[id]/ballot — cast ballot(s).
 *
 * Brother-session-gated, same-origin. Body accepts EITHER a single choice
 * `{ seatId, candidateId }` or a batch `{ ballots: [{ seatId, candidateId }] }`
 * so a member can submit all their seat choices in one request.
 *
 * SECRET BALLOT + double-vote prevention:
 *   • Each ballot row stores voterBrotherId solely to enforce the DB
 *     Unique(seatId, voterBrotherId). It is NEVER returned anywhere.
 *   • A second vote on a seat the brother already voted on hits the unique
 *     constraint (P2002) → we treat it as "already voted" (idempotent skip),
 *     NOT an error and NOT a vote change. One member, one ballot per seat,
 *     permanent once cast.
 *   • Voting is rejected unless the election.status === OPEN (and within the
 *     opens/closes window).
 *
 * We intentionally do NOT write an auditAndNotify timeline message here — a
 * per-vote system announcement would leak voter turnout patterns and spam the
 * feed. The act of voting is private by design.
 */

const SingleSchema = z.object({
  seatId: z.string().min(1),
  candidateId: z.string().min(1),
});
const BatchSchema = z.object({
  ballots: z.array(SingleSchema).min(1).max(50),
});

type Choice = { seatId: string; candidateId: string };

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Cross-origin request blocked" }, { status: 403 });
  }

  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }
  // VOTER ELIGIBILITY — a signed-in session is NOT enough. Only a currently-
  // active, fully-initiated member (Brother.status in {ACTIVE, INITIATE}) may
  // cast a COUNTED ballot; an expelled/inactive/alumnus member (or an admin
  // resolved to such a Brother row) is rejected here BEFORE any ballot is
  // written. Single-sourced with the eligible-roster count (isVoterEligible).
  if (!isVoterEligible(brother.status)) {
    return NextResponse.json(
      { ok: false, error: "Only active members can vote." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  // Accept single or batch shape.
  let choices: Choice[];
  const batch = BatchSchema.safeParse(body);
  if (batch.success) {
    choices = batch.data.ballots;
  } else {
    const single = SingleSchema.safeParse(body);
    if (!single.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    choices = [single.data];
  }

  try {
    // Load the election + its seats/candidates so we can validate every choice
    // against THIS election (prevents voting on another election's seat ids).
    const election = await prisma.election.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        audience: true,
        opensAt: true,
        closesAt: true,
        seats: {
          select: {
            id: true,
            candidates: { select: { id: true } },
          },
        },
      },
    });
    if (!election) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }

    // Audience gate — brothers may only vote on BROTHERS/ALL elections.
    if (election.audience !== "BROTHERS" && election.audience !== "ALL") {
      return NextResponse.json(
        { ok: false, error: "This election isn't open to your group." },
        { status: 403 },
      );
    }

    if (!isVotingOpen({ status: election.status, opensAt: election.opensAt, closesAt: election.closesAt })) {
      return NextResponse.json({ ok: false, error: "Voting is closed for this election." }, { status: 409 });
    }

    // Build seat → valid candidate id set for O(1) validation.
    const seatCandidates = new Map<string, Set<string>>();
    for (const s of election.seats) {
      seatCandidates.set(s.id, new Set(s.candidates.map((c) => c.id)));
    }

    // Validate every choice up front so a bad one fails the whole request
    // (rather than silently casting a partial set).
    const seen = new Set<string>();
    for (const ch of choices) {
      const valid = seatCandidates.get(ch.seatId);
      if (!valid) {
        return NextResponse.json({ ok: false, error: "That seat isn't part of this election." }, { status: 400 });
      }
      if (!valid.has(ch.candidateId)) {
        return NextResponse.json({ ok: false, error: "That candidate isn't on the ballot for this seat." }, { status: 400 });
      }
      if (seen.has(ch.seatId)) {
        return NextResponse.json({ ok: false, error: "Only one choice per seat." }, { status: 400 });
      }
      seen.add(ch.seatId);
    }

    // Cast each ballot. A duplicate (seat already voted by this brother) trips
    // the unique constraint → counted as "already voted", not an error.
    const recorded: string[] = [];
    const alreadyVoted: string[] = [];
    for (const ch of choices) {
      try {
        await prisma.electionBallot.create({
          data: {
            seatId: ch.seatId,
            candidateId: ch.candidateId,
            voterBrotherId: brother.id, // dedup ONLY — never exposed
          },
        });
        recorded.push(ch.seatId);
      } catch (e: any) {
        if (e?.code === "P2002") {
          alreadyVoted.push(ch.seatId);
          continue; // one ballot per seat, permanent — ignore the re-submit
        }
        throw e;
      }
    }

    return NextResponse.json({
      ok: true,
      recordedSeatIds: recorded,
      alreadyVotedSeatIds: alreadyVoted,
    });
  } catch (err) {
    errorSink(err, { route: "/api/portal/brothers/elections/[id]/ballot", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
