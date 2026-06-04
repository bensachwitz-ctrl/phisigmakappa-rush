import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/meetings/[id]/check-in/[memberId] — kiosk / QR style check-in. */
export async function POST(req: Request, { params }: { params: { id: string; memberId: string } }) {
  const denied = await guardOfficer("brothers", "write");
  if (denied) return denied;
  const meeting = await prisma.chapterMeeting.findUnique({ where: { id: params.id } });
  if (!meeting) return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 });
  const member = await prisma.brother.findUnique({ where: { id: params.memberId } });
  if (!member) return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });

  const now = new Date();
  // Tardy heuristic: more than 10 minutes after scheduled start is "tardy".
  const minsLate = (now.getTime() - meeting.scheduledAt.getTime()) / (60 * 1000);
  const status = minsLate > 10 ? "tardy" : "present";

  const row = await prisma.chapterMeetingAttendance.upsert({
    where: { meetingId_memberId: { meetingId: params.id, memberId: params.memberId } },
    create: {
      meetingId: params.id,
      memberId: params.memberId,
      status,
      checkedInAt: now,
    },
    update: {
      status,
      checkedInAt: now,
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("meeting.checkin", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Officer",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChapterMeetingAttendance",
        id: row.id,
        name: `${member.name} → ${meeting.title}`,
      },
      payload: { status, minsLate: Math.round(minsLate), meetingId: meeting.id },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, attendance: row });
}
