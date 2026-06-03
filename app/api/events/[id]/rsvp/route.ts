import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Brother RSVP for a chapter event.
 *
 * GET   — returns the current brother's RSVP for this event (or null) PLUS
 *         the aggregated headcount + per-status roster of who else is going.
 *         Auth-gated: any logged-in brother can read; the public API doesn't
 *         expose brother phone numbers / emails.
 *
 * POST  — upserts the current brother's RSVP. Body: { status, note? }.
 *         status must be GOING | NOT_GOING | MAYBE. Composite-unique on
 *         (eventId, brotherId) means re-submission updates instead of creating.
 */
const RSVP_STATUS = ["GOING", "NOT_GOING", "MAYBE"] as const;
const RsvpSchema = z.object({
  status: z.enum(RSVP_STATUS),
  note: z.string().max(280).optional().or(z.literal("")),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }
  const eventId = params.id;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, name: true, startsAt: true, endsAt: true,
      location: true, dressCode: true, category: true,
      description: true, isPrivate: true,
    },
  });
  if (!event) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  // The current brother's own RSVP (or null if they haven't clicked yet).
  const mine = await prisma.brotherRSVP.findUnique({
    where: { eventId_brotherId: { eventId, brotherId: brother.id } },
  });

  // Roster — who else is going? Sorted by status then alphabetical name.
  // Only expose name + position + headshot — never email/phone (those are
  // brother-private even to other brothers).
  const roster = await prisma.brotherRSVP.findMany({
    where: { eventId },
    orderBy: [{ status: "asc" }, { brother: { name: "asc" } }],
    select: {
      status: true, note: true, updatedAt: true,
      brother: { select: { id: true, name: true, position: true, headshotUrl: true } },
    },
  });

  // Active-brother "no-response" chase list — fully-onboarded brothers (have
  // a password hash, i.e. completed the invite flow) who haven't RSVP'd.
  const allActive = await prisma.brother.findMany({
    where: { passwordHash: { not: null } },
    select: { id: true, name: true, position: true, headshotUrl: true },
    orderBy: { name: "asc" },
  });
  const respondedIds = new Set(roster.map((r) => r.brother.id));
  const noResponse = allActive.filter((b) => !respondedIds.has(b.id));

  // Total brothers shown in the modal footer = anyone who's RSVP'd OR
  // anyone fully onboarded who hasn't. The shared admin record (no
  // passwordHash) wouldn't otherwise count, but if the admin RSVPs we
  // want to count them — so union the two sets. Math: total = roster +
  // noResponse, since rosters only contain brothers who clicked an
  // RSVP button and noResponse contains every other active brother.
  const totalBrothers = roster.length + noResponse.length;

  const counts = {
    GOING: roster.filter((r) => r.status === "GOING").length,
    NOT_GOING: roster.filter((r) => r.status === "NOT_GOING").length,
    MAYBE: roster.filter((r) => r.status === "MAYBE").length,
    NO_RESPONSE: noResponse.length,
    TOTAL_BROTHERS: totalBrothers,
  };

  return NextResponse.json({ ok: true, event, mine, roster, noResponse, counts });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const eventId = params.id;
  const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  const rsvp = await prisma.brotherRSVP.upsert({
    where: { eventId_brotherId: { eventId, brotherId: brother.id } },
    update: { status: parsed.data.status, note: parsed.data.note || null },
    create: {
      eventId,
      brotherId: brother.id,
      status: parsed.data.status,
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({ ok: true, rsvp });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }
  const eventId = params.id;
  await prisma.brotherRSVP
    .delete({ where: { eventId_brotherId: { eventId, brotherId: brother.id } } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
