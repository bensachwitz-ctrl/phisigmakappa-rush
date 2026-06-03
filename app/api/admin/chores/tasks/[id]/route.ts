import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  label: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  rotationOrder: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

/** PATCH /api/admin/chores/tasks/[id] */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await requireOfficerPermission("house", "write");

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.choreWheelTask.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const data: any = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.rotationOrder !== undefined) data.rotationOrder = parsed.data.rotationOrder;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  const updated = await prisma.choreWheelTask.update({
    where: { id: params.id },
    data,
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("chores.task_update", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "House Manager",
        role: "risk-manager",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChoreWheelTask",
        id: updated.id,
        name: updated.label,
      },
      payload: { before: existing, after: updated },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, task: updated });
}

/** DELETE /api/admin/chores/tasks/[id] */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await requireOfficerPermission("house", "write");

  const existing = await prisma.choreWheelTask.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  await prisma.choreWheelTask.delete({
    where: { id: params.id },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("chores.task_delete", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "House Manager",
        role: "risk-manager",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChoreWheelTask",
        id: params.id,
        name: existing.label,
      },
      payload: { deleted: existing },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
