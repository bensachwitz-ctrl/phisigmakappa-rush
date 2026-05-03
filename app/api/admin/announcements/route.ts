import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, getCurrentBrotherId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  title: z.string().min(2).max(160),
  body: z.string().min(2).max(8000),
  audience: z.enum(["ALL", "BROTHERS", "RUSHES", "EBOARD"]).default("ALL"),
  pinned: z.boolean().default(false),
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
  const brotherId = getCurrentBrotherId();
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });

  const created = await prisma.announcement.create({
    data: {
      ...parsed.data,
      authorId: brotherId || undefined,
    },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ok: true, announcement: created });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => null);
  const PatchSchema = Schema.partial().extend({ id: z.string().min(1) });
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const updated = await prisma.announcement.update({ where: { id }, data: rest });
  return NextResponse.json({ ok: true, announcement: updated });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
