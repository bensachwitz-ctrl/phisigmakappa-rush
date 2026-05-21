import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/service/hours/[id]/approve — philanthropy chair approves a submission. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireOfficerPermission("service", "write");
  const me = getCurrentBrotherId();
  const existing = await prisma.serviceHourLog.findUnique({
    where: { id: params.id },
    include: { member: { select: { id: true, name: true } } },
  });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (existing.status !== "submitted") {
    return NextResponse.json({ ok: false, error: "Already processed." }, { status: 400 });
  }
  const updated = await prisma.serviceHourLog.update({
    where: { id: params.id },
    data: {
      status: "approved",
      approvedById: me ?? null,
      approvedAt: new Date(),
    },
  });

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
