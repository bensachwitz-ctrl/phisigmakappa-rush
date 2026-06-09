import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEventIcs } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single-event "Add to calendar" download.
 *
 * GET /api/events/{id}/ics → an .ics file for ONE chapter event so a brother /
 * rushee can add it straight to Apple/Google/Outlook calendar. Complements the
 * full webcal feed at /api/events.ics.
 *
 * Visibility: only public (`isPrivate: false`) events are downloadable without a
 * session — invite-only formals/bid-nights are hidden from the unauthenticated
 * download just like they're hidden from the public feed. (The brother-facing UI
 * can still link this for public events; private-event ICS could be gated behind
 * a session in a future iteration.)
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  const event = await prisma.event
    .findUnique({ where: { id } })
    .catch(() => null);

  if (!event || event.isPrivate) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  const host = new URL(_req.url).host;
  const origin = new URL(_req.url).origin;
  const ics = buildEventIcs(event, {
    host,
    url: `${origin}/#schedule`,
  });

  const filename = `${event.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "event"}.ics`;

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
