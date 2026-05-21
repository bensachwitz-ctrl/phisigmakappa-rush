import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrotherId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/account/chores/[assignmentId]/complete
 *
 * A member marks their own chore as completed. Cannot complete someone else's
 * chore; cannot re-complete a graded chore (the house manager has reviewed it
 * already, status no longer mutable from the member side).
 */
export async function POST(req: Request, { params }: { params: { assignmentId: string } }) {
  const me = getCurrentBrotherId();
  if (!me) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body || {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const row = await prisma.choreWheelAssignment.findUnique({ where: { id: params.assignmentId } });
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (row.memberId !== me) {
    return NextResponse.json({ ok: false, error: "Not your chore." }, { status: 403 });
  }
  if (row.status === "graded") {
    return NextResponse.json({ ok: false, error: "Already graded by house manager." }, { status: 400 });
  }
  const updated = await prisma.choreWheelAssignment.update({
    where: { id: params.assignmentId },
    data: {
      status: "completed",
      completedAt: new Date(),
      notes: parsed.data.notes ?? row.notes,
    },
  });
  return NextResponse.json({ ok: true, assignment: updated });
}
