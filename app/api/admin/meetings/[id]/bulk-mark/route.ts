import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  marks: z.array(
    z.object({
      memberId: z.string().min(1),
      status: z.enum(["present", "absent", "excused", "tardy"]),
      excuseReason: z.string().max(500).optional().nullable(),
      notes: z.string().max(500).optional().nullable(),
    })
  ).max(500),
});

/**
 * POST /api/admin/meetings/[id]/bulk-mark
 * Body: { marks: [{ memberId, status, excuseReason?, notes? }] }
 *
 * Used by the secretary after the meeting to mark dozens of brothers at once
 * via the roster grid. Upserts each row so re-running is idempotent.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await guardOfficer("brothers", "write");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const meeting = await prisma.chapterMeeting.findUnique({ where: { id: params.id } });
  if (!meeting) return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 });

  const results: any[] = [];
  for (const m of parsed.data.marks) {
    const row = await prisma.chapterMeetingAttendance.upsert({
      where: { meetingId_memberId: { meetingId: params.id, memberId: m.memberId } },
      create: {
        meetingId: params.id,
        memberId: m.memberId,
        status: m.status,
        excuseReason: m.status === "excused" ? (m.excuseReason ?? null) : null,
        notes: m.notes ?? null,
        checkedInAt: m.status === "present" || m.status === "tardy" ? new Date() : null,
      },
      update: {
        status: m.status,
        excuseReason: m.status === "excused" ? (m.excuseReason ?? null) : null,
        notes: m.notes ?? null,
        checkedInAt: m.status === "present" || m.status === "tardy" ? new Date() : null,
      },
    });
    results.push(row);
  }

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("meeting.bulk_mark", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChapterMeeting",
        id: meeting.id,
        name: meeting.title,
      },
      payload: { updated: results.length, marks: parsed.data.marks.length },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, updated: results.length });
}
