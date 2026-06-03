import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { isGoogleCalendarConfigured, type GoogleCalendarStatus } from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/google-calendar/status — whether the current brother has linked. */
export async function GET() {
  const configured = isGoogleCalendarConfigured();
  const session = await getCurrentSession();
  if (!session) {
    const payload: GoogleCalendarStatus = { configured, linked: false };
    return NextResponse.json({ ok: true, status: payload });
  }
  const link = await prisma.googleCalendarLink
    .findUnique({ where: { brotherId: session.brother.id } })
    .catch(() => null);
  const payload: GoogleCalendarStatus = {
    configured,
    linked: !!link,
    googleEmail: link?.googleEmail,
    lastSyncedAt: link?.lastSyncedAt?.toISOString(),
    syncEnabled: link?.syncEnabled,
  };
  return NextResponse.json({ ok: true, status: payload });
}
