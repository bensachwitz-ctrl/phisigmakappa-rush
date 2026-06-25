import { prisma } from "@/lib/prisma";
import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";
import { MeetingsClient } from "./meetings-client";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  // Attendance/meeting management lives under the "brothers" domain — the same
  // gate the /api/admin/meetings routes enforce (read to view, write to mutate).
  // GATE-3 FIX 4: graceful read gate (card, not a thrown 403).
  const { allowed: canRead } = await checkOfficerPermission("brothers", "read");
  if (!canRead) return <OfficerAccessRequired title="Meetings" permission="Brothers" />;
  const { allowed: canWrite } = await checkOfficerPermission("brothers", "write");

  // Meeting list with attendance counts (mirrors GET /api/admin/meetings).
  const meetings = await prisma.chapterMeeting.findMany({
    orderBy: { scheduledAt: "desc" },
    include: { _count: { select: { attendance: true } } },
  });

  // Roster of members who can be marked. Matches the requiredFor default set
  // (active + initiate + pledge) used across the meeting routes.
  const brothers = await prisma.brother.findMany({
    where: {
      status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  });

  // Serialize Date fields to ISO strings for the client component.
  const serializedMeetings = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    scheduledAt: m.scheduledAt.toISOString(),
    duration: m.duration,
    location: m.location,
    notes: m.notes,
    status: m.status,
    requiredFor: Array.isArray(m.requiredFor) ? (m.requiredFor as string[]) : [],
    attendanceCount: m._count.attendance,
  }));

  return (
    <MeetingsClient
      initialMeetings={serializedMeetings}
      brothers={brothers}
      canWrite={canWrite}
    />
  );
}
