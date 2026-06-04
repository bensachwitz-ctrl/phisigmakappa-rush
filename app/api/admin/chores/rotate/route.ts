import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { computeChoreRotation, parseSundayWeek } from "@/lib/chore-wheel";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  week: z.string().min(4).optional(), // ISO Sunday-week string OR a parseable date
});

/**
 * POST /api/admin/chores/rotate?week=2026-W14
 *
 * Idempotent — re-running for the same week wipes existing assignments and
 * re-applies the fairness algorithm (round-robin starting from the least-
 * recently-assigned member). House manager-only.
 *
 * Fairness rule lives in lib/chore-wheel.ts so it can be unit-tested without
 * touching the database.
 */
export async function POST(req: Request) {
  const denied = await guardOfficer("house", "write");
  if (denied) return denied;

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("week");
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body || {});
  const weekStr = (parsed.success && parsed.data.week) || fromQuery || "";

  const weekStarting = parseSundayWeek(weekStr);
  if (!weekStarting) {
    return NextResponse.json({ ok: false, error: "Invalid or missing week param." }, { status: 400 });
  }

  const tasks = await prisma.choreWheelTask.findMany({
    where: { active: true },
    orderBy: [{ rotationOrder: "asc" }, { id: "asc" }],
  });
  if (tasks.length === 0) {
    return NextResponse.json({ ok: false, error: "No active chore tasks." }, { status: 400 });
  }

  const members = await prisma.brother.findMany({
    where: { status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] } },
    orderBy: { name: "asc" },
    include: {
      chores: {
        orderBy: { weekStarting: "desc" },
        take: 1,
        select: { weekStarting: true },
      },
    },
  });
  if (members.length === 0) {
    return NextResponse.json({ ok: false, error: "No eligible members." }, { status: 400 });
  }

  const rotMembers = members.map((m) => ({
    id: m.id,
    lastAssignedAt: m.chores[0]?.weekStarting ?? null,
  }));

  const { assignments } = computeChoreRotation(
    tasks.map((t) => ({ id: t.id, rotationOrder: t.rotationOrder })),
    rotMembers
  );

  // Idempotent: wipe this week's prior assignments, then re-insert.
  await prisma.choreWheelAssignment.deleteMany({ where: { weekStarting } });

  const created = await prisma.$transaction(
    assignments.map((a) =>
      prisma.choreWheelAssignment.create({
        data: {
          taskId: a.taskId,
          memberId: a.memberId,
          weekStarting,
          status: "assigned",
        },
      })
    )
  );

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("chores.rotate", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "House Manager",
        role: "risk-manager",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChoreWheelAssignment",
        id: null,
        name: `week of ${weekStarting.toISOString().slice(0, 10)}`,
      },
      payload: {
        weekStarting: weekStarting.toISOString(),
        count: created.length,
        taskCount: tasks.length,
        memberCount: members.length,
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, weekStarting, count: created.length, assignments: created });
}
