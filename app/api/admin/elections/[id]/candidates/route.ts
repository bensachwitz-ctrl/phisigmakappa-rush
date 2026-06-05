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
 * Candidates for a seat (DRAFT only).
 *
 * POST   — nominate a brother for a seat. Body: { seatId, brotherId,
 *          statement? }. The brother's display name is denormalized from the
 *          roster. Duplicate nomination (same brother, same seat) is blocked
 *          by the DB Unique(seatId, brotherId) → surfaced as a friendly 409.
 * DELETE — withdraw a candidate. Body: { candidateId }.
 */

const AddSchema = z.object({
  seatId: z.string().min(1),
  brotherId: z.string().min(1),
  statement: z.string().trim().max(1000).optional().or(z.literal("")),
});

async function loadDraft(id: string) {
  return prisma.election.findUnique({
    where: { id },
    select: { id: true, status: true, title: true },
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
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

    // Seat must belong to this election (prevents cross-election seat targeting).
    const seat = await prisma.electionSeat.findFirst({
      where: { id: parsed.data.seatId, electionId: election.id },
      select: { id: true, title: true },
    });
    if (!seat) {
      return NextResponse.json({ ok: false, error: "Seat not found" }, { status: 404 });
    }

    // Resolve + denormalize the candidate's name from the roster.
    const brother = await prisma.brother.findUnique({
      where: { id: parsed.data.brotherId },
      select: { id: true, name: true },
    });
    if (!brother) {
      return NextResponse.json({ ok: false, error: "Member not found" }, { status: 400 });
    }

    let candidate;
    try {
      candidate = await prisma.electionCandidate.create({
        data: {
          seatId: seat.id,
          brotherId: brother.id,
          name: brother.name,
          statement: parsed.data.statement ? parsed.data.statement : null,
        },
        select: { id: true, seatId: true, brotherId: true, name: true, statement: true },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json(
          { ok: false, error: `${brother.name} is already a candidate for ${seat.title}.` },
          { status: 409 },
        );
      }
      throw e;
    }

    const actor = await electionActor(req);
    await auditAndNotify("election.candidate.add", {
      actor,
      entity: { type: "ElectionCandidate", id: candidate.id, name: candidate.name },
      payload: { after: { name: candidate.name, seat: seat.title } },
    });

    return NextResponse.json({ ok: true, candidate });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]/candidates", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { candidateId } = await req.json().catch(() => ({ candidateId: "" }));
  if (!candidateId) {
    return NextResponse.json({ ok: false, error: "Missing candidateId" }, { status: 400 });
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

    // Confirm the candidate belongs to a seat under this election.
    const candidate = await prisma.electionCandidate.findFirst({
      where: { id: candidateId, seat: { electionId: election.id } },
      select: { id: true, name: true },
    });
    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    await prisma.electionCandidate.delete({ where: { id: candidate.id } });

    const actor = await electionActor(req);
    await auditAndNotify("election.candidate.remove", {
      actor,
      entity: { type: "ElectionCandidate", id: candidate.id, name: candidate.name },
      payload: { before: { name: candidate.name } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]/candidates", method: "DELETE" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
