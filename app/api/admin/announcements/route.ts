import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, getCurrentBrotherId } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// W4 — channels comma-list: any subset of inapp|sms|email, comma-separated.
// The default "inapp" preserves R41 behaviour (in-app card only).
const ChannelsRegex = /^(inapp|sms|email)(,(inapp|sms|email))*$/;

const Schema = z.object({
  title: z.string().min(2).max(160),
  body: z.string().min(2).max(8000),
  audience: z.enum(["ALL", "BROTHERS", "RUSHES", "EBOARD", "ALUMNI"]).default("ALL"),
  pinned: z.boolean().default(false),
  pollId: z.string().optional().nullable(),
  // ── W4 scheduled-send + multi-channel additions (optional, additive) ────
  scheduledFor: z.string().datetime().optional().nullable(),
  channels: z.string().regex(ChannelsRegex).default("inapp"),
});

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const brotherId = getCurrentBrotherId();
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });

  // W4 — derive status + sentAt from scheduledFor. A future scheduledFor flips
  // the row to status='scheduled' so the cron will pick it up; null or past
  // dates send immediately (status='sent'). Legacy callers omitting scheduledFor
  // get the R41 behaviour (immediate publish).
  const now = new Date();
  const scheduledForDate = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null;
  const isScheduled = scheduledForDate !== null && scheduledForDate.getTime() > now.getTime();
  const status = isScheduled ? "scheduled" : "sent";

  const created = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      audience: parsed.data.audience,
      pinned: parsed.data.pinned,
      pollId: parsed.data.pollId || undefined,
      authorId: brotherId || undefined,
      status,
      scheduledFor: scheduledForDate,
      sentAt: isScheduled ? null : now,
      channels: parsed.data.channels,
    },
    include: { author: { select: { id: true, name: true } } },
  });
  await audit({
    action: isScheduled ? "ANNOUNCEMENT_SCHEDULED" : "ANNOUNCEMENT_CREATED",
    subjectType: "Announcement",
    subjectId: created.id,
    subjectName: created.title,
    details:
      `audience: ${created.audience}${created.pinned ? " · pinned" : ""}` +
      (isScheduled && scheduledForDate ? ` · scheduled for ${scheduledForDate.toISOString()}` : "") +
      (parsed.data.channels !== "inapp" ? ` · channels: ${parsed.data.channels}` : ""),
    req,
  });
  return NextResponse.json({ ok: true, announcement: created });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const PatchSchema = Schema.partial().extend({ id: z.string().min(1) });
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const before = await prisma.announcement.findUnique({
    where: { id },
    select: { title: true, pinned: true },
  }).catch(() => null);
  const updated = await prisma.announcement.update({ where: { id }, data: rest });
  // Pin/unpin is the most-asked "who did that?" — log it distinctly.
  const action = before && typeof rest.pinned === "boolean" && before.pinned !== rest.pinned
    ? (rest.pinned ? "ANNOUNCEMENT_PINNED" : "ANNOUNCEMENT_UNPINNED")
    : "ANNOUNCEMENT_UPDATED";
  await audit({
    action,
    subjectType: "Announcement",
    subjectId: updated.id,
    subjectName: updated.title,
    details: `fields: ${Object.keys(rest).join(", ")}`,
    req,
  });
  return NextResponse.json({ ok: true, announcement: updated });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const victim = await prisma.announcement.findUnique({
    where: { id },
    select: { title: true, audience: true },
  }).catch(() => null);
  await prisma.announcement.delete({ where: { id } });
  await audit({
    action: "ANNOUNCEMENT_DELETED",
    subjectType: "Announcement",
    subjectId: id,
    subjectName: victim?.title || null,
    details: victim?.audience ? `audience: ${victim.audience}` : null,
    req,
  });
  return NextResponse.json({ ok: true });
}
