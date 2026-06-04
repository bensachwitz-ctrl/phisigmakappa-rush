import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/meetings/[id]/excuse/[memberId]/deny
 *
 * Secretary or president REJECTS a member's excused-absence request. The
 * row stays `status="absent"` (it was never approved) but we clear
 * `excuseReason` so the secretary dashboard's pending-queue removes the
 * row. The denial is captured in the audit log so the timeline reads
 * "Catherine just denied an excused absence for John Doe — reason:
 * insufficient documentation".
 *
 * Why we don't introduce a new `excuse_denied` enum value on
 * `status`: the existing schema treats `absent` as the canonical
 * unexcused-absence state. A denied excuse is, by definition, an
 * unexcused absence — adding a third terminal state would force every
 * downstream consumer (KPI math, HQ exports) to handle three cases
 * instead of two. The audit row preserves WHY the absence remained
 * unexcused without the schema sprawl.
 */
export async function POST(req: Request, { params }: { params: { id: string; memberId: string } }) {
  const denied = await guardOfficer("brothers", "write");
  if (denied) return denied;

  const row = await prisma.chapterMeetingAttendance.findUnique({
    where: { meetingId_memberId: { meetingId: params.id, memberId: params.memberId } },
  });
  if (!row) {
    return NextResponse.json({ ok: false, error: "No attendance record to deny" }, { status: 404 });
  }
  if (!row.excuseReason) {
    return NextResponse.json({ ok: false, error: "No excuse request pending — nothing to deny" }, { status: 400 });
  }

  // Optional denial note from the secretary, kept in audit payload only.
  let denialNote: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.note === "string" && body.note.trim().length > 0) {
      denialNote = body.note.trim().slice(0, 500);
    }
  } catch {
    // Empty body OK — denial without an inline note still works.
  }

  // Clear the excuseReason so the dashboard queue drops the row. status
  // stays 'absent'; excuseApprovedById stays null. The audit log holds
  // the reason that was rejected for a permanent forensic trail.
  const updated = await prisma.chapterMeetingAttendance.update({
    where: { id: row.id },
    data: {
      excuseReason: null,
    },
  });

  try {
    const actor = await getCurrentBrother();
    const member = await prisma.brother
      .findUnique({ where: { id: params.memberId }, select: { name: true } })
      .catch(() => null);
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("meeting.excuse_deny", {
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
      payload: {
        before: row,
        after: updated,
        meetingId: params.id,
        rejectedReason: row.excuseReason,
        denialNote,
      },
      details: denialNote ? `reason: ${denialNote}` : undefined,
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, attendance: updated });
}
