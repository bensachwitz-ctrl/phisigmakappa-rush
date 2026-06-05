import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditAndNotify } from "@/lib/notify";
import { guardElectionRequest, electionActor } from "@/lib/elections-server";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Officer-elections admin collection.
 *
 * GET  — officer-gated (admin OR elections:write). Lists every election with a
 *        status badge, term, seat count, and total ballots cast.
 * POST — create a DRAFT election (title + termCode [+ optional anonymous/
 *        audience]). Seats + candidates are added afterwards via the nested
 *        routes while still in DRAFT.
 *
 * Every mutation writes one audit row + one timeline message via auditAndNotify.
 */

const CreateSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(160),
  termCode: z.string().trim().min(2, "Term code is too short").max(20),
  anonymous: z.boolean().optional(),
  audience: z.enum(["BROTHERS", "ALL"]).optional(),
});

export async function GET(req: Request) {
  const gate = await guardElectionRequest(req, "read");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const elections = await prisma.election.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        seats: {
          select: { id: true, _count: { select: { ballots: true } } },
        },
      },
    });

    const shaped = elections.map((e) => ({
      id: e.id,
      title: e.title,
      termCode: e.termCode,
      status: e.status,
      anonymous: e.anonymous,
      audience: e.audience,
      seatCount: e.seats.length,
      totalBallots: e.seats.reduce((sum, s) => sum + s._count.ballots, 0),
      opensAt: e.opensAt ? e.opensAt.toISOString() : null,
      closesAt: e.closesAt ? e.closesAt.toISOString() : null,
      closedAt: e.closedAt ? e.closedAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, elections: shaped });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections", method: "GET" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await guardElectionRequest(req, "write");
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const actor = await electionActor(req);
    const election = await prisma.election.create({
      data: {
        title: parsed.data.title,
        termCode: parsed.data.termCode,
        anonymous: parsed.data.anonymous ?? true,
        audience: parsed.data.audience ?? "BROTHERS",
        status: "DRAFT",
        createdById: actor.brotherId,
      },
    });

    await auditAndNotify("election.create", {
      actor,
      entity: { type: "Election", id: election.id, name: election.title },
      payload: { after: { title: election.title, termCode: election.termCode } },
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
        seatCount: 0,
        totalBallots: 0,
        opensAt: null,
        closesAt: null,
        closedAt: null,
        createdAt: election.createdAt.toISOString(),
        updatedAt: election.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    errorSink(err, { route: "/api/admin/elections", method: "POST" });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
