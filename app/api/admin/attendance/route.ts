import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { guardOfficer, guardOfficerOrAdmin } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  eventId: z.string().min(1),
  rushId: z.string().min(1),
  attended: z.boolean(),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const denied = await guardOfficer("events", "write");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const { eventId, rushId, attended } = parsed.data;

  // Resolve names once so the audit row reads "Marked Alex Kim present at
  // Cookout" rather than opaque cuids. Best-effort — a lookup miss just
  // falls back to the id, and audit() itself never throws.
  const [rush, event] = await Promise.all([
    prisma.rush.findUnique({ where: { id: rushId }, select: { name: true } }).catch(() => null),
    prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }).catch(() => null),
  ]);
  const rushName = rush?.name || rushId;
  const eventName = event?.name || eventId;

  if (!attended) {
    await prisma.attendance.deleteMany({ where: { eventId, rushId } });
    await audit({
      action: "ATTENDANCE_MARKED",
      subjectType: "Rush",
      subjectId: rushId,
      subjectName: rushName,
      details: `Cleared attendance — ${eventName}`,
      req,
    });
    return NextResponse.json({ ok: true, attended: false });
  }

  await prisma.attendance.upsert({
    where: { rushId_eventId: { rushId, eventId } },
    update: { attended: true },
    create: { rushId, eventId, attended: true },
  });
  await audit({
    action: "ATTENDANCE_MARKED",
    subjectType: "Rush",
    subjectId: rushId,
    subjectName: rushName,
    details: `Marked present — ${eventName}`,
    req,
  });
  return NextResponse.json({ ok: true, attended: true });
}

export async function GET(req: Request) {
  // Returns PNM names + emails per event — officer/admin floor (API twin of the
  // /admin layout boundary), not isAdminAuthed() alone.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ ok: false }, { status: 400 });
  const attendances = await prisma.attendance.findMany({
    where: { eventId },
    include: { rush: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ attendances });
}
