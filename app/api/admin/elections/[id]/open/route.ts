import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditAndNotify } from "@/lib/notify";
import { guardElectionRequest, electionActor } from "@/lib/elections-server";
import { canOpenElection } from "@/lib/elections";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/elections/[id]/open — open voting (DRAFT → OPEN).
 *
 * Refuses unless the election is a DRAFT with at least one seat and every seat
 * has at least one candidate (see lib/elections.canOpenElection). Sets opensAt
 * to now. Notifies the whole chapter (action "election.open" → audience ALL) so
 * members know to go vote.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const election = await prisma.election.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        status: true,
        seats: { select: { id: true, _count: { select: { candidates: true } } } },
      },
    });
    if (!election) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }

    const seatsWithNoCandidates = election.seats.filter((s) => s._count.candidates === 0).length;
    const check = canOpenElection({
      status: election.status,
      seatCount: election.seats.length,
      seatsWithNoCandidates,
    });
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.reason }, { status: 409 });
    }

    await prisma.election.update({
      where: { id: election.id },
      data: { status: "OPEN", opensAt: new Date() },
    });

    const actor = await electionActor(req);
    await auditAndNotify("election.open", {
      actor,
      entity: { type: "Election", id: election.id, name: election.title },
      payload: { after: { status: "OPEN" } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]/open", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
