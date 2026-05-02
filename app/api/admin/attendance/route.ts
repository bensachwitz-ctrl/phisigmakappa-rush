import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({
  eventId: z.string().min(1),
  rushId: z.string().min(1),
  attended: z.boolean(),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const { eventId, rushId, attended } = parsed.data;

  if (!attended) {
    await prisma.attendance.deleteMany({ where: { eventId, rushId } });
    return NextResponse.json({ ok: true, attended: false });
  }

  await prisma.attendance.upsert({
    where: { rushId_eventId: { rushId, eventId } },
    update: { attended: true },
    create: { rushId, eventId, attended: true },
  });
  return NextResponse.json({ ok: true, attended: true });
}

export async function GET(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ ok: false }, { status: 400 });
  const attendances = await prisma.attendance.findMany({
    where: { eventId },
    include: { rush: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ attendances });
}
