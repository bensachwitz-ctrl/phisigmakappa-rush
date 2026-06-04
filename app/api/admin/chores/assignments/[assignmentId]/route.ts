import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["assigned", "completed", "skipped", "graded"]),
  notes: z.string().max(1000).optional().nullable(),
});

/** PATCH /api/admin/chores/assignments/[assignmentId] */
export async function PATCH(
  req: Request,
  { params }: { params: { assignmentId: string } }
) {
  const denied = await guardOfficer("house", "write");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.choreWheelAssignment.findUnique({
    where: { id: params.assignmentId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const data: any = {
    status: parsed.data.status,
  };
  if (parsed.data.status === "completed" && existing.status !== "completed") {
    data.completedAt = new Date();
  }
  if (parsed.data.notes !== undefined) {
    data.notes = parsed.data.notes;
  }

  const updated = await prisma.choreWheelAssignment.update({
    where: { id: params.assignmentId },
    data,
    include: {
      task: true,
      member: { select: { name: true } },
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("chores.update", {
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
        name: `${updated.member.name} - ${updated.task.label}`,
      },
      payload: {
        before: { status: existing.status, notes: existing.notes },
        after: { status: updated.status, notes: updated.notes },
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, assignment: updated });
}

/** DELETE /api/admin/chores/assignments/[assignmentId] */
export async function DELETE(
  req: Request,
  { params }: { params: { assignmentId: string } }
) {
  const denied = await guardOfficer("house", "write");
  if (denied) return denied;

  const existing = await prisma.choreWheelAssignment.findUnique({
    where: { id: params.assignmentId },
    include: {
      task: true,
      member: { select: { name: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  await prisma.choreWheelAssignment.delete({
    where: { id: params.assignmentId },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("chores.delete", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "House Manager",
        role: "risk-manager",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChoreWheelAssignment",
        id: params.assignmentId,
        name: `${existing.member.name} - ${existing.task.label}`,
      },
      payload: { deleted: existing },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
