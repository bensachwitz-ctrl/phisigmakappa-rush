import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  reason: z.string().min(2).max(500),
});

/** POST /api/admin/service/hours/[id]/reject — philanthropy chair rejects with reason. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireOfficerPermission("service", "write");
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
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
      status: "rejected",
      rejectionReason: parsed.data.reason,
      approvedById: me ?? null,
      approvedAt: new Date(),
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("service.hour_log.reject", {
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
        reason: parsed.data.reason,
        before: { status: existing.status },
        after: { status: updated.status },
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, hours: updated });
}
