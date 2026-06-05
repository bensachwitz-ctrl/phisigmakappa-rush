import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditAndNotify } from "@/lib/notify";
import { guardElectionRequest, electionActor } from "@/lib/elections-server";
import { canCloseElection } from "@/lib/elections";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/elections/[id]/close — close voting (OPEN → CLOSED).
 *
 * Only an OPEN election can be closed. Stamps closedAt (and closesAt to match,
 * so the member-side "voting is closed" check is consistent). After this the
 * admin can review the tally and seat winners.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const election = await prisma.election.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, status: true },
    });
    if (!election) {
      return NextResponse.json({ ok: false, error: "Election not found" }, { status: 404 });
    }

    const check = canCloseElection({ status: election.status });
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.reason }, { status: 409 });
    }

    const now = new Date();
    await prisma.election.update({
      where: { id: election.id },
      data: { status: "CLOSED", closedAt: now, closesAt: now },
    });

    const actor = await electionActor(req);
    await auditAndNotify("election.close", {
      actor,
      entity: { type: "Election", id: election.id, name: election.title },
      payload: { after: { status: "CLOSED" } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections/[id]/close", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
