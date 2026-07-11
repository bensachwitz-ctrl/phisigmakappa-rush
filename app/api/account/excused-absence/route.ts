import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrotherIdAsync } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  meetingId: z.string().min(1),
  reason: z.string().min(2).max(500),
});

/**
 * POST /api/account/excused-absence
 *
 * A member submits a request to be excused from a chapter meeting. Writes
 * an attendance row with `status="excused"` and `excuseReason` set; the
 * `excuseApprovedById` stays null until a secretary approves.
 *
 * The row counts as a "pending excused absence" until approved. A second
 * submission for the same meeting overwrites the reason (no duplicates).
 */
export async function POST(req: Request) {
  const me = await getCurrentBrotherIdAsync();
  if (!me) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const meeting = await prisma.chapterMeeting.findUnique({ where: { id: parsed.data.meetingId } });
  if (!meeting) return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 });
  if (meeting.status === "completed" || meeting.status === "canceled") {
    return NextResponse.json(
      { ok: false, error: "Cannot request excuse for a completed or canceled meeting." },
      { status: 400 }
    );
  }

  const row = await prisma.chapterMeetingAttendance.upsert({
    where: { meetingId_memberId: { meetingId: parsed.data.meetingId, memberId: me } },
    create: {
      meetingId: parsed.data.meetingId,
      memberId: me,
      status: "excused",
      excuseReason: parsed.data.reason,
    },
    update: {
      status: "excused",
      excuseReason: parsed.data.reason,
      excuseApprovedById: null, // re-submission resets approval
    },
  });
  return NextResponse.json({ ok: true, attendance: row });
}
