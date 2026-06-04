import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { CalendarView, type CalendarItem } from "@/components/admin/calendar-view";

export const dynamic = "force-dynamic";

/**
 * Unified Chapter Calendar — a READ-ONLY aggregation surface.
 *
 * Merges three existing data sources for THIS chapter (per-tenant schema via the
 * Host-proxy `prisma`) into one timeline — no new tables, no mutations:
 *   1. Event           → source "event"   → href /admin/events
 *   2. ChapterMeeting  → source "meeting"  → href /admin/meetings
 *   3. the dues deadline from SiteConfig   → source "dues"    → href /admin/settings
 *
 * Auth is gated EXACTLY like the events/meetings admin pages: the meetings page
 * calls `requireOfficerPermission("brothers", "read")`; this calendar's primary
 * payload is the chapter's events, so it gates on the semantically-aligned
 * "events" domain (SUPER_ADMIN passes via the same helper). The throw is
 * wrap-safe — Next renders the standard 403 boundary, identical to /admin/meetings.
 *
 * Every DB read is wrapped so a transient blip degrades to an empty timeline
 * (the client renders its empty-state) instead of a 500.
 */
export default async function AdminCalendarPage() {
  // Gate first — mirrors the events/meetings server-page auth pattern.
  await requireOfficerPermission("events", "read");

  const items: CalendarItem[] = [];

  // ── 1) Events ──────────────────────────────────────────────────────────────
  try {
    const events = await prisma.event.findMany({
      orderBy: { startsAt: "asc" },
      select: { id: true, name: true, startsAt: true, location: true, category: true },
    });
    for (const e of events) {
      items.push({
        id: `event:${e.id}`,
        title: e.name,
        date: e.startsAt.toISOString(),
        source: "event",
        href: "/admin/events",
        location: e.location ?? null,
        category: e.category ?? null,
      });
    }
  } catch {
    // swallow — leave events out of the timeline rather than 500
  }

  // ── 2) Chapter meetings ─────────────────────────────────────────────────────
  try {
    const meetings = await prisma.chapterMeeting.findMany({
      orderBy: { scheduledAt: "asc" },
      select: { id: true, title: true, scheduledAt: true, location: true },
    });
    for (const m of meetings) {
      items.push({
        id: `meeting:${m.id}`,
        title: m.title,
        date: m.scheduledAt.toISOString(),
        source: "meeting",
        href: "/admin/meetings",
        location: m.location ?? null,
        category: null,
      });
    }
  } catch {
    // swallow — leave meetings out of the timeline rather than 500
  }

  // ── 3) Dues deadline (SiteConfig — optional) ────────────────────────────────
  // Only surface a dues chip when online dues are enabled AND we can resolve a
  // concrete deadline date. A chapter may set an explicit `dues.dueDate`
  // (ISO date, e.g. "2026-09-15"); if absent we derive a sensible deadline from
  // the academic period in `dues.year` ("YYYY-fall" / "YYYY-spring"). If neither
  // yields a valid date, no dues item is added (calendar stays clean).
  try {
    const cfgRows = await prisma.siteConfig.findMany({
      where: { key: { in: ["dues.enabled", "dues.dueDate", "dues.year", "dues.label"] } },
      select: { key: true, value: true },
    });
    const cfg: Record<string, string> = {};
    for (const r of cfgRows) cfg[r.key] = r.value;

    if (cfg["dues.enabled"] === "true") {
      const dueDate = resolveDuesDeadline(cfg["dues.dueDate"], cfg["dues.year"]);
      if (dueDate) {
        const label = (cfg["dues.label"] || "").trim() || "Chapter dues deadline";
        items.push({
          id: "dues:deadline",
          title: label,
          date: dueDate.toISOString(),
          source: "dues",
          href: "/admin/settings",
          location: null,
          category: null,
        });
      }
    }
  } catch {
    // swallow — dues chip is best-effort
  }

  return <CalendarView items={items} />;
}

/**
 * Resolve a dues deadline Date (or null) from an explicit ISO date string or,
 * failing that, an academic-period label like "2026-fall" / "2026-spring".
 * Pure + side-effect-free so the page stays trivially correct.
 *
 *   • explicit "2026-09-15"  → that exact day (local noon to dodge TZ edges)
 *   • "2026-fall"            → Sep 15 of that year (start-of-term dues window)
 *   • "2026-spring"         → Feb 1 of that year
 *   • anything unparseable   → null (no dues chip)
 */
function resolveDuesDeadline(explicit?: string, year?: string): Date | null {
  const raw = (explicit || "").trim();
  if (raw) {
    // Accept YYYY-MM-DD (anchor to local noon so the calendar-cell date is stable
    // regardless of the viewer's timezone).
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const term = (year || "").trim().toLowerCase();
  const ym = /^(\d{4})[-_ ]?(fall|spring|summer|winter)?/.exec(term);
  if (ym) {
    const y = Number(ym[1]);
    const season = ym[2];
    if (y >= 2000 && y <= 2100) {
      // Month anchors per season (local noon). Fall is the default if unlabeled.
      const monthBySeason: Record<string, number> = { spring: 1, summer: 5, fall: 8, winter: 11 };
      const month = season ? monthBySeason[season] : 8; // 0-indexed: 8 = September
      return new Date(y, month, 15, 12, 0, 0, 0);
    }
  }
  return null;
}
