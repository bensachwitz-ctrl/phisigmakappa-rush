import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";
import { serviceHoursToInt } from "@/lib/service-hours";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  reason: z.string().min(2).max(500),
});

/** POST /api/admin/service/hours/[id]/reject — philanthropy chair rejects with reason.
 *  Also handles un-approving: a previously-approved log can be rejected, which
 *  backs the credited hours out of the member's counter. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await guardOfficer("service", "write");
  if (denied) return denied;
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
  // Reject is valid from `submitted` (decline a pending request) or from
  // `approved` (un-approve a previously-credited log). Already-rejected logs
  // are a no-op error.
  if (existing.status !== "submitted" && existing.status !== "approved") {
    return NextResponse.json({ ok: false, error: "Already processed." }, { status: 400 });
  }

  // If this log was previously approved, its hours were already credited to
  // the member's denormalized counter — back them out using the SAME rounding
  // the approve path applied, so the counter nets to zero. A `submitted` log
  // was never counted, so there's nothing to decrement.
  const wasCounted = existing.status === "approved";
  const debit = wasCounted ? serviceHoursToInt(existing.hoursLogged) : 0;
  const writes: any[] = [
    prisma.serviceHourLog.update({
      where: { id: params.id },
      data: {
        status: "rejected",
        rejectionReason: parsed.data.reason,
        approvedById: me ?? null,
        approvedAt: new Date(),
      },
    }),
  ];
  if (debit > 0) {
    writes.push(
      prisma.brother.update({
        where: { id: existing.memberId },
        data: { serviceHours: { decrement: debit } },
      }),
    );
  }
  const [updated] = await prisma.$transaction(writes);

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
