import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { parseSundayWeek } from "@/lib/chore-wheel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/chores/assignments?week=2026-W14 */
export async function GET(req: Request) {
  const denied = await guardOfficer("house", "read");
  if (denied) return denied;
  const url = new URL(req.url);
  const weekStr = url.searchParams.get("week");
  const where: any = {};
  if (weekStr) {
    const d = parseSundayWeek(weekStr);
    if (d) where.weekStarting = d;
  }
  const assignments = await prisma.choreWheelAssignment.findMany({
    where,
    orderBy: [{ weekStarting: "desc" }, { task: { rotationOrder: "asc" } }],
    include: {
      task: true,
      member: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ ok: true, assignments });
}
