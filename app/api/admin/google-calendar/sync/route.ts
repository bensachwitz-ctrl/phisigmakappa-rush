import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import {
  isGoogleCalendarConfigured,
  pushEvent,
  refreshAccessToken,
} from "@/lib/google-calendar";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/google-calendar/sync
 *
 * Pushes the chapter's recent + upcoming public events to every brother who
 * has linked their Google account AND has syncEnabled=true.
 *
 * Per-brother failures are isolated — one expired refresh token doesn't block
 * other brothers' syncs. Returns a summary `{ pushed, failed, skipped }`.
 */
export async function POST() {
  try {
    await requireOfficerPermission("events", "write");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "Google Calendar not configured" });
  }

  const links = await prisma.googleCalendarLink
    .findMany({ where: { syncEnabled: true } })
    .catch(() => []);

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const until = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  const events = await prisma.event
    .findMany({
      where: {
        isPrivate: false,
        startsAt: { gte: since, lte: until },
      },
      orderBy: { startsAt: "asc" },
    })
    .catch(() => []);

  let pushed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const link of links) {
    const refresh = await refreshAccessToken(link.refreshToken);
    if (!refresh.ok) {
      failed++;
      errors.push(`${link.brotherId}: token refresh failed (${refresh.error})`);
      continue;
    }
    for (const ev of events) {
      const res = await pushEvent({
        accessToken: refresh.accessToken,
        calendarId: link.calendarId || undefined,
        event: {
          sourceId: ev.id,
          summary: ev.name,
          description: ev.description || undefined,
          location: ev.location || undefined,
          start: ev.startsAt,
          end: ev.endsAt ?? new Date(ev.startsAt.getTime() + 2 * 60 * 60 * 1000),
        },
      });
      if (res.ok) pushed++;
      else {
        failed++;
        errors.push(`${link.brotherId} ev=${ev.id}: ${res.error}`);
      }
    }
    await prisma.googleCalendarLink.update({
      where: { id: link.id },
      data: { lastSyncedAt: new Date() },
    });
  }
  if (links.length === 0) skipped = 1;

  try {
    const actor = await getCurrentBrother();
    await auditAndNotify("calendar.sync.run", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Officer",
        role: "super-admin",
      },
      entity: {
        type: "GoogleCalendarSync",
        id: null,
        name: `${links.length} brother(s)`,
      },
      payload: {
        pushed,
        failed,
        skipped,
        linkCount: links.length,
        eventCount: events.length,
      },
      details: `(${pushed} pushed / ${failed} failed)`,
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, pushed, failed, skipped, errors: errors.slice(0, 20) });
}
