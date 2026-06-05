import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditAndNotify } from "@/lib/notify";
import { guardElectionRequest, electionActor } from "@/lib/elections-server";
import { canEditStructure } from "@/lib/elections";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seats for one election (DRAFT only).
 *
 * POST   — add a seat. Either `positionId` (an OfficerPosition from the
 *          catalog — title is denormalized from it) OR a free-text `title`
 *          for a custom office. `sortOrder` optional.
 * DELETE — remove a seat (cascades to its candidates + any stray ballots).
 *
 * Both are blocked once the election leaves DRAFT so the ballot can't shift
 * under voters.
 */

const AddSchema = z
  .object({
    positionId: z.string().min(1).optional(),
    title: z.string().trim().min(2).max(120).optional(),
    sortOrder: z.number().int().nonnegative().max(100000).optional(),
  })
  .refine((v) => !!v.positionId || !!v.title, {
    message: "Pick a position or enter a custom title",
  });

async function loadDraft(id: string) {
  const election = await prisma.election.findUnique({
    where: { id },
    select: { id: true, status: true, title: true },
  });
  return election;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const election = await loadDraft(params.id);
    if (!election) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }
    const editable = canEditStructure({ status: election.status });
    if (!editable.ok) {
      return NextResponse.json({ ok: false, error: editable.reason }, { status: 409 });
    }

    // Resolve the denormalized title. A catalog position's title wins; else the
    // custom free-text title.
    let title = parsed.data.title?.trim() || "";
    let positionId: string | null = null;
    if (parsed.data.positionId) {
      const pos = await prisma.officerPosition.findUnique({
        where: { id: parsed.data.positionId },
        select: { id: true, title: true },
      });
      if (!pos) {
        return NextResponse.json({ ok: false, error: "Position not found" }, { status: 400 });
      }
      positionId = pos.id;
      if (!title) title = pos.title;
    }
    if (!title) {
      return NextResponse.json({ ok: false, error: "A seat needs a title" }, { status: 400 });
    }

    // Default sortOrder to push new seats to the end if not supplied.
    let sortOrder = parsed.data.sortOrder;
    if (sortOrder === undefined) {
      const max = await prisma.electionSeat.aggregate({
        where: { electionId: election.id },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? 0) + 10;
    }

    const seat = await prisma.electionSeat.create({
      data: { electionId: election.id, positionId, title, sortOrder },
      select: { id: true, positionId: true, title: true, sortOrder: true },
    });

    const actor = await electionActor(req);
    await auditAndNotify("election.seat.add", {
      actor,
      entity: { type: "ElectionSeat", id: seat.id, name: `${seat.title} (${election.title})` },
      payload: { after: { title: seat.title, positionId: seat.positionId } },
    });

    return NextResponse.json({ ok: true, seat });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]/seats", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { seatId } = await req.json().catch(() => ({ seatId: "" }));
  if (!seatId) return NextResponse.json({ ok: false, error: "Missing seatId" }, { status: 400 });

  try {
    const election = await loadDraft(params.id);
    if (!election) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }
    const editable = canEditStructure({ status: election.status });
    if (!editable.ok) {
      return NextResponse.json({ ok: false, error: editable.reason }, { status: 409 });
    }

    const seat = await prisma.electionSeat.findFirst({
      where: { id: seatId, electionId: election.id },
      select: { id: true, title: true },
    });
    if (!seat) {
      return NextResponse.json({ ok: false, error: "Seat not found" }, { status: 404 });
    }

    await prisma.electionSeat.delete({ where: { id: seat.id } });

    const actor = await electionActor(req);
    await auditAndNotify("election.seat.remove", {
      actor,
      entity: { type: "ElectionSeat", id: seat.id, name: `${seat.title} (${election.title})` },
      payload: { before: { title: seat.title } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]/seats", method: "DELETE" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
