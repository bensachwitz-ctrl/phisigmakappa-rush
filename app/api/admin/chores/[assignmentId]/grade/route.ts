import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  grade: z.enum(["A", "B", "C", "D", "F"]),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/admin/chores/[assignmentId]/grade
 *
 * House manager rates a completed chore. Sets `status="graded"` so the
 * grid can show the chore as fully reviewed.
 */
export async function POST(req: Request, { params }: { params: { assignmentId: string } }) {
  const denied = await guardOfficer("house", "write");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const existing = await prisma.choreWheelAssignment.findUnique({ where: { id: params.assignmentId } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const updated = await prisma.choreWheelAssignment.update({
    where: { id: params.assignmentId },
    data: {
      grade: parsed.data.grade,
      notes: parsed.data.notes ?? existing.notes,
      status: "graded",
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("chores.grade", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "House Manager",
        role: "risk-manager",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChoreWheelAssignment",
        id: updated.id,
        name: `grade ${parsed.data.grade}`,
      },
      payload: { before: existing, after: updated, grade: parsed.data.grade },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, assignment: updated });
}
