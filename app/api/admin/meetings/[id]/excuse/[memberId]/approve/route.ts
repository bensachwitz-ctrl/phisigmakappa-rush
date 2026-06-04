import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/meetings/[id]/excuse/[memberId]/approve
 *
 * Secretary or president approves a member's excused-absence request. Sets
 * `status = "excused"` and records the approver. The original
 * `excuseReason` (submitted by the member) is preserved.
 */
export async function POST(req: Request, { params }: { params: { id: string; memberId: string } }) {
  const denied = await guardOfficer("brothers", "write");
  if (denied) return denied;
  const approverId = getCurrentBrotherId();

  const row = await prisma.chapterMeetingAttendance.findUnique({
    where: { meetingId_memberId: { meetingId: params.id, memberId: params.memberId } },
  });
  if (!row) return NextResponse.json({ ok: false, error: "No attendance record to approve" }, { status: 404 });

  const updated = await prisma.chapterMeetingAttendance.update({
    where: { id: row.id },
    data: {
      status: "excused",
      excuseApprovedById: approverId ?? null,
    },
  });

  try {
    const actor = await getCurrentBrother();
    const member = await prisma.brother
      .findUnique({ where: { id: params.memberId }, select: { name: true } })
      .catch(() => null);
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("meeting.excuse_approve", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChapterMeetingAttendance",
        id: updated.id,
        name: member?.name ?? params.memberId,
      },
      payload: { before: row, after: updated, meetingId: params.id },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, attendance: updated });
}
