import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_CATEGORIES = ["RUSH", "DATE", "BROTHERHOOD", "CHAPTER", "SOCIAL", "OTHER"] as const;

const EventSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  dressCode: z.string().max(120).optional().or(z.literal("")),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().or(z.literal("")),
  isPrivate: z.boolean().optional().default(false),
  category: z.enum(EVENT_CATEGORIES).optional().default("OTHER"),
  // Edit mode: when an `id` is supplied the route updates instead of creates,
  // so the admin "Edit" button on each event card can re-use this endpoint.
  id: z.string().optional(),
});

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Admin-only — only the rush chair / e-board should create or edit events.
  // Members see events through /api/brother/events (read-only).
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const data = EventSchema.parse(body);

    // If `id` is supplied, this is an edit — update the existing row instead of
    // creating a new one. Lets the admin Events panel reuse one POST endpoint
    // for both add + edit, with the form deciding which mode based on whether
    // an id is bound to the form state.
    if (data.id) {
      const updated = await prisma.event.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description || null,
          location: data.location || null,
          dressCode: data.dressCode || null,
          startsAt: new Date(data.startsAt),
          endsAt: data.endsAt ? new Date(data.endsAt) : null,
          isPrivate: !!data.isPrivate,
          category: data.category || "OTHER",
        },
      });
      return NextResponse.json({ ok: true, event: updated });
    }

    const created = await prisma.event.create({
      data: {
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        dressCode: data.dressCode || null,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isPrivate: !!data.isPrivate,
        category: data.category || "OTHER",
      },
    });
    return NextResponse.json({ ok: true, event: created });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
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
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
