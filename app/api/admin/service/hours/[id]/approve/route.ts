import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";
import { serviceHoursToInt } from "@/lib/service-hours";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/service/hours/[id]/approve — philanthropy chair approves a submission. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await guardOfficer("service", "write");
  if (denied) return denied;
  const me = getCurrentBrotherId();
  const existing = await prisma.serviceHourLog.findUnique({
    where: { id: params.id },
    include: { member: { select: { id: true, name: true } } },
  });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (existing.status !== "submitted") {
    return NextResponse.json({ ok: false, error: "Already processed." }, { status: 400 });
  }

  // Flip the log to approved AND credit the member's denormalized
  // serviceHours counter in ONE transaction so the log status and the
  // counter can never drift. The reject/un-approve path decrements the
  // same rounded amount, so a submitted→approved→rejected round-trip nets
  // to zero. serviceHours is an Int; hoursLogged is Decimal(4,2) — round
  // once, consistently, in both directions.
  const credit = serviceHoursToInt(existing.hoursLogged);
  const [updated] = await prisma.$transaction([
    prisma.serviceHourLog.update({
      where: { id: params.id },
      data: {
        status: "approved",
        approvedById: me ?? null,
        approvedAt: new Date(),
      },
    }),
    prisma.brother.update({
      where: { id: existing.memberId },
      data: { serviceHours: { increment: credit } },
    }),
  ]);

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("service.hour_log.approve", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Service Chair",
        role: "service-chair",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ServiceHourLog",
        id: updated.id,
        name: existing.member?.name ?? existing.memberId,
      },
      payload: {
        hours: Number(updated.hoursLogged),
        before: { status: existing.status },
        after: { status: updated.status },
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, hours: updated });
}
