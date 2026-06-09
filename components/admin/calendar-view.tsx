"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { IconCalendarTool } from "@/components/brand/icons/calendar-tool";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";

/**
 * Unified calendar item — the normalized shape the server page merges Events +
 * ChapterMeetings + the dues deadline into. READ-ONLY; clicking a chip just
 * routes to the source admin surface (no mutations here).
 */
export type CalendarItem = {
  id: string;
  title: string;
  /** ISO 8601 timestamp. */
  date: string;
  source: "event" | "meeting" | "dues";
  /** Where a click navigates (e.g. /admin/events, /admin/meetings, /admin/settings). */
  href: string;
  location?: string | null;
  /** Event category (RUSH | DATE | …) — only set for source "event". */
  category?: string | null;
};

// ── Source → chip styling ────────────────────────────────────────────────────
// events = chapter brand red (phisig-red), meetings = sky/secondary, dues =
// gold/amber. Kept as full class strings (not interpolated) so Tailwind's JIT
// always sees them.
const SOURCE_META: Record<
  CalendarItem["source"],
  {
    label: string;
    /** Solid dot used as the source marker. */
    dot: string;
    /** Month-grid chip surface (static base + hover). */
    chip: string;
    /** Agenda leading-tile surface (static, no hover — the row owns the hover). */
    tile: string;
    /** Agenda leading-tile ring. */
    agendaRing: string;
  }
> = {
  event: {
    label: "Event",
    dot: "bg-phisig-red",
    chip: "bg-phisig-red/10 text-phisig-red ring-1 ring-phisig-red/20 hover:bg-phisig-red/15",
    tile: "bg-phisig-red/10",
    agendaRing: "ring-phisig-red/30",
  },
  meeting: {
    label: "Meeting",
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20 hover:bg-sky-500/15",
    tile: "bg-sky-500/10",
    agendaRing: "ring-sky-500/30",
  },
  dues: {
    label: "Dues",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/25 hover:bg-amber-500/20",
    tile: "bg-amber-500/10",
    agendaRing: "ring-amber-500/30",
  },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Pure date helpers (local-time, no external libs) ─────────────────────────
function getPartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);

  const year = getPart("year");
  const month = getPart("month") - 1; // 0-indexed month
  const day = getPart("day");
  let hour = getPart("hour");
  if (parts.find(p => p.type === "hour")?.value === "24") hour = 0;
  const minute = getPart("minute");

  return { year, month, day, hour, minute };
}

function dayKey(d: Date, timeZone: string): string {
  const { year, month, day } = getPartsInTimeZone(d, timeZone);
  return `${year}-${month}-${day}`;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function startOfDayInTimeZone(d: Date, timeZone: string): Date {
  const { year, month, day } = getPartsInTimeZone(d, timeZone);
  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone,
  });
  const parts = formatter.formatToParts(utcDate);
  const getPart = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);

  const fYear = getPart("year");
  const fMonth = getPart("month");
  const fDay = getPart("day");
  let fHour = getPart("hour");
  if (parts.find(p => p.type === "hour")?.value === "24") fHour = 0;
  const fMinute = getPart("minute");

  const formattedUtcTime = Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute);
  const targetUtcTime = Date.UTC(year, month, day, 0, 0);

  const offsetMs = formattedUtcTime - targetUtcTime;
  return new Date(utcDate.getTime() - offsetMs);
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function timeLabel(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}

function fullDayLabel(d: Date, timeZone: string): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone });
}

/**
 * Build the 6×7 (42-cell) grid for a given month. Always starts on the Sunday
 * on/before the 1st and runs 42 cells so the grid height never jumps month to
 * month (correct week alignment + stable layout).
 */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = startOfMonth(year, month);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay()); // back up to Sunday
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function CalendarView({ items }: { items: CalendarItem[] }) {
  const router = useRouter();
  const { timeZone } = useChapterIdentity();

  // Guard against bad ISO strings up front so every downstream consumer is safe.
  const validItems = React.useMemo(
    () => items.filter((it) => !Number.isNaN(new Date(it.date).getTime())),
    [items]
  );

  // `today` is computed once on the client after mount. Rendering the grid only
  // after mount avoids any SSR/CSR "today" hydration mismatch and gives us a
  // clean first-paint loading state.
  const [today, setToday] = React.useState<Date | null>(null);
  const [view, setView] = React.useState<{ year: number; month: number } | null>(null);

  React.useEffect(() => {
    const now = new Date();
    setToday(now);
    const parts = getPartsInTimeZone(now, timeZone);
    setView({ year: parts.year, month: parts.month });
  }, [timeZone]);

  // Bucket every item by its local day key for O(1) cell lookups.
  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of validItems) {
      const k = dayKey(new Date(it.date), timeZone);
      const arr = map.get(k);
      if (arr) arr.push(it);
      else map.set(k, [it]);
    }
    // Stable per-day order: earliest time first.
    for (const arr of map.values()) {
      arr.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    }
    return map;
  }, [validItems, timeZone]);

  // Upcoming agenda: today (00:00) forward, grouped by day, soonest first.
  const agenda = React.useMemo(() => {
    if (!today) return [] as { key: string; date: Date; items: CalendarItem[] }[];
    const floor = startOfDayInTimeZone(today, timeZone).getTime();
    const upcoming = validItems
      .filter((it) => +new Date(it.date) >= floor)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const groups: { key: string; date: Date; items: CalendarItem[] }[] = [];
    const index = new Map<string, number>();
    for (const it of upcoming) {
      const d = new Date(it.date);
      const k = dayKey(d, timeZone);
      if (!index.has(k)) {
        index.set(k, groups.length);
        groups.push({ key: k, date: startOfDayInTimeZone(d, timeZone), items: [it] });
      } else {
        groups[index.get(k)!].items.push(it);
      }
    }
    return groups;
  }, [validItems, today, timeZone]);

  const grid = React.useMemo(
    () => (view ? buildMonthGrid(view.year, view.month) : []),
    [view]
  );
  const todayKey = today ? dayKey(today, timeZone) : "";

  function go(delta: number) {
    setView((v) => (v ? addMonths(v.year, v.month, delta) : v));
  }
  function goToday() {
    if (today) {
      const parts = getPartsInTimeZone(today, timeZone);
      setView({ year: parts.year, month: parts.month });
    }
  }
  function openItem(it: CalendarItem) {
    router.push(it.href);
  }

  const monthHasItems = React.useMemo(() => {
    if (!view) return false;
    return grid.some(
      (d) => d.getMonth() === view.month && (itemsByDay.get(dayKey(d, timeZone))?.length ?? 0) > 0
    );
  }, [grid, view, itemsByDay, timeZone]);

  // ── Loading state (pre-mount, before `today` resolves) ──────────────────────
  if (!view || !today) {
    return (
      <main className="container py-8">
        <CalendarHeader />
        <div
          className="mt-6 h-[28rem] animate-pulse rounded-2xl border bg-gradient-to-b from-muted/40 to-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p className="sr-only" role="status">
          Loading calendar…
        </p>
      </main>
    );
  }

  const monthTitle = `${MONTH_NAMES[view.month]} ${view.year}`;
  const currentMonthParts = today ? getPartsInTimeZone(today, timeZone) : null;
  const isCurrentMonth =
    !!(currentMonthParts && currentMonthParts.year === view.year && currentMonthParts.month === view.month);

  return (
    <main className="container py-8 space-y-6">
      <CalendarHeader />

      {/* Legend + month nav */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2" role="group" aria-label="Calendar month navigation">
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(-1)}
            aria-label={`Previous month, ${MONTH_NAMES[addMonths(view.year, view.month, -1).month]}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div
            className="min-w-[10.5rem] text-center text-lg font-semibold tracking-tight tabular-nums"
            aria-live="polite"
          >
            {monthTitle}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(1)}
            aria-label={`Next month, ${MONTH_NAMES[addMonths(view.year, view.month, 1).month]}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            disabled={isCurrentMonth}
            className="ml-1"
          >
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {(["event", "meeting", "dues"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", SOURCE_META[s].dot)} aria-hidden="true" />
              {SOURCE_META[s].label}s
            </span>
          ))}
        </div>
      </div>

      {/* ── MONTH GRID — hidden on mobile (agenda carries small screens) ──────── */}
      <section
        aria-label={`Month view, ${monthTitle}`}
        className="hidden gs-glass rounded-2xl p-3 sm:block sm:p-4"
      >
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1.5 pb-2">
          {WEEKDAY_SHORT.map((w) => (
            <div
              key={w}
              className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span aria-hidden="true">{w}</span>
            </div>
          ))}
        </div>

        {monthHasItems ? (
          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((d) => {
              const inMonth = d.getMonth() === view.month;
              const k = dayKey(d, timeZone);
              const dayItems = itemsByDay.get(k) ?? [];
              const isToday = k === todayKey;
              const MAX_CHIPS = 3;
              const shown = dayItems.slice(0, MAX_CHIPS);
              const overflow = dayItems.length - shown.length;
              return (
                <div
                  key={k}
                  className={cn(
                    "min-h-[5.5rem] rounded-xl border p-1.5 transition-colors lg:min-h-[6.5rem]",
                    inMonth ? "bg-card/70" : "bg-muted/20 text-muted-foreground/60",
                    isToday && "border-phisig-red/50 ring-1 ring-phisig-red/30 bg-phisig-red/[0.04]"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between px-0.5">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs tabular-nums",
                        isToday
                          ? "bg-phisig-red font-bold text-white"
                          : inMonth
                          ? "font-medium text-foreground"
                          : "text-muted-foreground/60"
                      )}
                      aria-label={isToday ? `${fullDayLabel(d, timeZone)} (today)` : undefined}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {shown.map((it) => {
                      const meta = SOURCE_META[it.source];
                      return (
                         <button
                          key={it.id}
                          type="button"
                          onClick={() => openItem(it)}
                          title={`${meta.label}: ${it.title}${it.location ? ` · ${it.location}` : ""}`}
                          aria-label={`${meta.label}: ${it.title}, ${timeLabel(it.date, timeZone)}${
                            it.location ? `, at ${it.location}` : ""
                          }. Opens ${it.href}`}
                          className={cn(
                            "flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            meta.chip
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden="true" />
                          <span className="truncate">{it.title}</span>
                        </button>
                      );
                    })}
                    {overflow > 0 && (
                      <div className="px-1.5 text-[10px] font-medium text-muted-foreground">
                        +{overflow} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Empty MONTH state (grid scaffold still shows the weekday header above).
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <IconChip icon={CalendarDays} tone="brand" size="lg" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Nothing scheduled in {monthTitle}</h3>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Events and meetings you add will appear here. Use the arrows to browse other
                months, or jump to upcoming items below.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── AGENDA — upcoming items grouped by date (the mobile-primary view) ─── */}
      <section aria-label="Upcoming agenda" className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-phisig-red" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">Upcoming</h2>
        </div>

        {agenda.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-gradient-to-b from-muted/30 to-transparent px-4 py-12 text-center">
            <IconChip icon={IconCalendarTool} tone="brand" size="lg" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">No upcoming items</h3>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Once you schedule events or chapter meetings, your unified timeline shows up
                here automatically.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/events")}>
                Add an event
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/meetings")}>
                Schedule a meeting
              </Button>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {agenda.map((group) => {
              const isToday = group.key === todayKey;
              return (
                <li key={group.key} className="rounded-2xl border bg-card/60 p-3 sm:p-4">
                  <div className="mb-2 flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold">
                      {isToday ? "Today" : fullDayLabel(group.date, timeZone)}
                    </h3>
                    {isToday && (
                      <span className="rounded-full bg-phisig-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-phisig-red ring-1 ring-phisig-red/20">
                        {fullDayLabel(group.date, timeZone)}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {group.items.map((it) => {
                      const meta = SOURCE_META[it.source];
                      return (
                        <li key={it.id}>
                          <button
                            type="button"
                            onClick={() => openItem(it)}
                            aria-label={`${meta.label}: ${it.title}, ${timeLabel(it.date, timeZone)}${
                              it.location ? `, at ${it.location}` : ""
                            }. Opens ${it.href}`}
                            className={cn(
                              "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ring-1 ring-transparent transition-colors hover:bg-secondary/60",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
                                meta.tile,
                                meta.agendaRing
                              )}
                              aria-hidden="true"
                            >
                              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{it.title}</span>
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {meta.label}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                                  {timeLabel(it.date, timeZone)}
                                </span>
                                {it.location && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" aria-hidden="true" />
                                    <span className="truncate">{it.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

/** Shared page header — chapter-branded icon chip + title (used in every state). */
function CalendarHeader() {
  return (
    <div className="flex items-start gap-4">
      <IconChip icon={IconCalendarTool} tone="brand" size="lg" className="hidden sm:inline-flex" />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One unified timeline — chapter events, meetings, and the dues deadline in a single
          month &amp; agenda view.
        </p>
      </div>
    </div>
  );
}
