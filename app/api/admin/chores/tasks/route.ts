import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  label: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  rotationOrder: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

/** GET /api/admin/chores/tasks?active=1 */
export async function GET(req: Request) {
  const denied = await guardOfficer("house", "read");
  if (denied) return denied;
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "1";
  const tasks = await prisma.choreWheelTask.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: [{ rotationOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ ok: true, tasks });
}

/** POST /api/admin/chores/tasks — house manager only. */
export async function POST(req: Request) {
  const denied = await guardOfficer("house", "write");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  // If rotationOrder not supplied, place it at the end of the list.
  let order = parsed.data.rotationOrder;
  if (order === undefined) {
    const last = await prisma.choreWheelTask.findFirst({ orderBy: { rotationOrder: "desc" } });
    order = last ? last.rotationOrder + 10 : 10;
  }
  const created = await prisma.choreWheelTask.create({
    data: {
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      rotationOrder: order,
      active: parsed.data.active ?? true,
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("chores.task_create", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "House Manager",
        role: "risk-manager",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChoreWheelTask",
        id: created.id,
        name: created.label,
      },
      payload: { after: created },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, task: created });
}
