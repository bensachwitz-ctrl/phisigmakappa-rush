import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Brother-facing calendar feed.
 *
 * Returns ALL events (public + private) the logged-in brother can see,
 * sorted by start time ascending, in a -7d / +180d window. Includes the
 * per-event RSVP COUNTS and the current brother's own RSVP so the UI can
 * paint the correct highlighted button on first paint without an N+1 fetch
 * to /api/events/[id]/rsvp.
 *
 * Auth-gated: 401 if not logged in as a brother. The public marketing page
 * uses /api/events (which only returns isPrivate=false). This route is for
 * the internal brother calendar at /admin/events.
 */
type RsvpStatus = "GOING" | "NOT_GOING" | "MAYBE";

export async function GET() {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const start = new Date(now - 7 * day);
  const end = new Date(now + 180 * day);

  const events = await prisma.event.findMany({
    where: { startsAt: { gte: start, lte: end } },
    orderBy: { startsAt: "asc" },
    include: {
      rsvps: {
        select: {
          status: true,
          note: true,
          brotherId: true,
        },
      },
    },
  });

  const shaped = events.map((e) => {
    const counts = { GOING: 0, NOT_GOING: 0, MAYBE: 0 };
    let mine: { status: RsvpStatus; note: string | null } | null = null;
    for (const r of e.rsvps) {
      if (r.status === "GOING" || r.status === "NOT_GOING" || r.status === "MAYBE") {
        counts[r.status as RsvpStatus] += 1;
      }
      if (r.brotherId === brother.id) {
        mine = { status: r.status as RsvpStatus, note: r.note };
      }
    }
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      location: e.location,
      dressCode: e.dressCode,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      isPrivate: e.isPrivate,
      category: e.category,
      counts,
      mine,
    };
  });

  return NextResponse.json({ events: shaped });
}
