import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditAndNotify } from "@/lib/notify";
import { guardElectionRequest, electionActor } from "@/lib/elections-server";
import { canEditStructure, tallySeat, type SeatTally } from "@/lib/elections";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One election — manage surface.
 *
 * GET    — full detail: election + seats + candidates, and (for CLOSED/SEATED,
 *          or always for the admin tally view) per-seat tallies computed via
 *          lib/elections.tallySeat. SECRET BALLOT: ballots are read as
 *          `{ candidateId }` only — voterBrotherId is NEVER selected, so it
 *          cannot leak into the response.
 * PATCH  — edit title / termCode / anonymous (DRAFT only — the ballot is
 *          locked once voting opens).
 * DELETE — remove the election (cascades to seats/candidates/ballots).
 */

const PatchSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  termCode: z.string().trim().min(2).max(20).optional(),
  anonymous: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "read");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const election = await prisma.election.findUnique({
      where: { id: params.id },
      include: {
        seats: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            candidates: {
              orderBy: { createdAt: "asc" },
              select: { id: true, brotherId: true, name: true, statement: true },
            },
            // SECRET BALLOT: select ONLY the candidate id. Never voterBrotherId.
            ballots: { select: { candidateId: true } },
          },
        },
      },
    });
    if (!election) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }

    // Catalog of positions + roster for the seat/candidate pickers (DRAFT edit).
    const [positions, brothers] = await Promise.all([
      prisma.officerPosition.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, slug: true },
      }),
      prisma.brother.findMany({
        where: { status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const seats = election.seats.map((s) => {
      const tally: SeatTally = tallySeat(
        s.id,
        s.title,
        s.candidates.map((c) => ({ id: c.id, name: c.name })),
        s.ballots, // already { candidateId }
      );
      return {
        id: s.id,
        positionId: s.positionId,
        title: s.title,
        sortOrder: s.sortOrder,
        winnerCandidateId: s.winnerCandidateId,
        winnerBrotherId: s.winnerBrotherId,
        winnerName: s.winnerName,
        seatedAssignmentId: s.seatedAssignmentId,
        candidates: s.candidates,
        totalBallots: tally.totalBallots,
        tally, // per-seat aggregate results (no voter identity anywhere)
      };
    });

    return NextResponse.json({
      ok: true,
      election: {
        id: election.id,
        title: election.title,
        termCode: election.termCode,
        status: election.status,
        anonymous: election.anonymous,
        audience: election.audience,
        opensAt: election.opensAt ? election.opensAt.toISOString() : null,
        closesAt: election.closesAt ? election.closesAt.toISOString() : null,
        closedAt: election.closedAt ? election.closedAt.toISOString() : null,
        createdAt: election.createdAt.toISOString(),
        updatedAt: election.updatedAt.toISOString(),
        seats,
      },
      positions,
      brothers,
    });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]", method: "GET" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  try {
    const existing = await prisma.election.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, title: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }

    const editable = canEditStructure({ status: existing.status });
    if (!editable.ok) {
      return NextResponse.json({ ok: false, error: editable.reason }, { status: 409 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.termCode !== undefined) data.termCode = parsed.data.termCode;
    if (parsed.data.anonymous !== undefined) data.anonymous = parsed.data.anonymous;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.election.update({ where: { id: existing.id }, data });

    const actor = await electionActor(req);
    await auditAndNotify("election.update", {
      actor,
      entity: { type: "Election", id: updated.id, name: updated.title },
      payload: { after: data, changedKeys: Object.keys(data) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]", method: "PATCH" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const before = await prisma.election.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, status: true },
    });
    if (!before) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }

    // Cascade on the schema removes seats → candidates → ballots automatically.
    await prisma.election.delete({ where: { id: before.id } });

    const actor = await electionActor(req);
    await auditAndNotify("election.delete", {
      actor,
      entity: { type: "Election", id: before.id, name: before.title },
      payload: { before: { title: before.title, status: before.status } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]", method: "DELETE" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
