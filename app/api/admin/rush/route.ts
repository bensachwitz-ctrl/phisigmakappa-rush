import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { RUSH_STATUSES } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(RUSH_STATUSES).optional(),
  notes: z.string().max(4000).optional(),
});

const DeleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const rushes = await prisma.rush.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rushes });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Status changes (ACCEPTED / DROPPED / BID_EXTENDED) and notes are
  // chapter business decisions — admin-only. Members vote on rushees but
  // don't change their status.
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const data = PatchSchema.parse(body);
    const updated = await prisma.rush.update({
      where: { id: data.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(typeof data.notes === "string" ? { notes: data.notes } : {}),
      },
    });
    return NextResponse.json({ ok: true, rush: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    console.error("[/api/admin/rush PATCH]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id } = DeleteSchema.parse(body);
    await prisma.rush.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    console.error("[/api/admin/rush DELETE]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
