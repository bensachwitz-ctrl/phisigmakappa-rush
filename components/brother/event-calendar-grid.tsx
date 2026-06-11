"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Users,
  Crown,
  PartyPopper,
  Calendar as CalendarIcon,
  CheckCircle2,
  HelpCircle,
  XCircle,
  MapPin,
  Loader2,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { EVENT_CATEGORIES } from "@/components/admin/events-manager";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";

import { IconSpark } from "@/components/brand/icons";
/**
 * Brother-only month-view calendar grid.
 *
 * Sits ABOVE the existing card list on /admin/events. Polls the same
 * /api/brother/events endpoint every 60s and on window focus so brothers
 * who tab away to schedule rides come back to fresh data without a hard
 * refresh. Clicking a day opens an inline panel (no modal — better mobile)
 * with each event's compact summary; clicking an event row scrolls to the
 * full RSVP card below.
 */

const DEFAULT_TZ = "America/New_York";

type RsvpStatus = "GOING" | "NOT_GOING" | "MAYBE";

type CalendarEvent = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  dressCode: string | null;
  startsAt: string;
  endsAt: string | null;
  isPrivate: boolean;
  category: string;
  counts: { GOING: number; NOT_GOING: number; MAYBE: number };
  mine: { status: RsvpStatus; note: string | null } | null;
};

type CategoryIcon = React.ComponentType<{ className?: string }>;

const CATEGORY_ICON: Record<string, CategoryIcon> = {
  RUSH: IconSpark,
  DATE: Heart,
  BROTHERHOOD: Users,
  CHAPTER: Crown,
  SOCIAL: PartyPopper,
  OTHER: CalendarIcon,
};

// Colors used for the per-event icon dots inside a cell. Keep these in sync
// with EVENT_CATEGORIES and the card list — but here we want a slightly
// brighter "dot" presentation rather than a stripe, so we use text-* tokens.
const CATEGORY_ICON_COLOR: Record<string, string> = {
  RUSH: "text-phisig-red",
  DATE: "text-pink-500",
  BROTHERHOOD: "text-blue-500",
  CHAPTER: "text-amber-500",
  SOCIAL: "text-emerald-500",
  OTHER: "text-zinc-500",
};

function categoryStripe(id: string): string {
  const meta = EVENT_CATEGORIES.find((c) => c.id === id);
  return meta?.stripe ?? "bg-zinc-500";
}

function categoryLabel(id: string): string {
  const meta = EVENT_CATEGORIES.find((c) => c.id === id);
  return meta?.label ?? "Event";
}

// ---- Date helpers, parameterized to custom timezone ------------------------

function partsInTZ(d: Date, timezone = DEFAULT_TZ): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  let y = 0;
  let m = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === "year") y = Number(p.value);
    else if (p.type === "month") m = Number(p.value);
    else if (p.type === "day") day = Number(p.value);
  }
  return { y, m, d: day };
}

function dateKey(d: Date, timezone = DEFAULT_TZ): string {
  const p = partsInTZ(d, timezone);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

// "Naive" Date carrying a year/month/day at local midnight — safe for grid
// math (adding days, comparing, etc.) because we never read its hours.
function naiveDate(y: number, mZeroBased: number, d: number): Date {
  return new Date(y, mZeroBased, d);
}

function naiveKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayInTZ(timezone = DEFAULT_TZ): Date {
  const p = partsInTZ(new Date(), timezone);
  return naiveDate(p.y, p.m - 1, p.d);
}

function startOfMonth(d: Date): Date {
  return naiveDate(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return naiveDate(d.getFullYear(), d.getMonth() + n, 1);
}

function addDays(d: Date, n: number): Date {
  return naiveDate(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function monthLabel(d: Date, timezone = DEFAULT_TZ): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: timezone });
}

function fullDayLabel(d: Date, timezone = DEFAULT_TZ): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
}

// Build a 6-week (42-cell) grid starting on the Sunday on/before the first
// day of the month. Cells outside the focused month are flagged so the UI
// can dim them.
function buildGrid(focused: Date): Date[] {
  const first = startOfMonth(focused);
  const startWeekday = first.getDay(); // 0 = Sun
  const start = addDays(first, -startWeekday);
  const out: Date[] = [];
  for (let i = 0; i < 42; i++) out.push(addDays(start, i));
  return out;
}

// ---- Component -------------------------------------------------------------

export function EventCalendarGrid({
  onEventClick,
}: {
  // Optional click handler — if provided, clicking an event row in the
  // day-panel opens this callback (intended to open the EventDetailsModal).
  // If absent, the legacy behavior is preserved: smooth-scroll to the
  // matching card in the list below.
  onEventClick?: (eventId: string) => void;
} = {}) {
  const { timeZone } = useChapterIdentity();
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const [now, setNow] = React.useState<number>(() => Date.now());

  const [focused, setFocused] = React.useState<Date>(() => todayInTZ(timeZone));
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [didCenterOnUpcoming, setDidCenterOnUpcoming] = React.useState(false);

  const today = React.useMemo(() => todayInTZ(timeZone), [timeZone]);
  const todayKey = React.useMemo(() => naiveKey(today), [today]);

  const gridRef = React.useRef<HTMLDivElement | null>(null);

  // ---- Fetch + auto-refresh ------------------------------------------------
  const fetchEvents = React.useCallback(async () => {
    try {
      const res = await fetch("/api/brother/events", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { events?: CalendarEvent[] };
      setEvents(json.events ?? []);
      setLastUpdated(Date.now());
    } catch {
      // Swallow — keep showing stale data. The card list owns the toast UX.
    } finally {
      setInitialLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 60s poll + window focus refetch.
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      fetchEvents();
    }, 60_000);
    const onFocus = () => fetchEvents();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchEvents]);

  // Tick a 1Hz clock for the "Updated 12s ago" line. Cheap and keeps the
  // staleness indicator honest without needing a re-render on each fetch.
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // After the FIRST successful load, jump to the month containing the next
  // upcoming event so a brother lands on something useful instead of an
  // empty current month. We only do this once.
  React.useEffect(() => {
    if (didCenterOnUpcoming) return;
    if (initialLoading) return;
    if (events.length === 0) {
      setDidCenterOnUpcoming(true);
      return;
    }
    const nowMs = Date.now();
    const upcoming = events.find((e) => new Date(e.startsAt).getTime() >= nowMs);
    if (upcoming) {
      const p = partsInTZ(new Date(upcoming.startsAt), timeZone);
      const target = naiveDate(p.y, p.m - 1, 1);
      // Only move if the upcoming event's month is different from current.
      if (target.getFullYear() !== focused.getFullYear() || target.getMonth() !== focused.getMonth()) {
        setFocused(target);
      }
    }
    setDidCenterOnUpcoming(true);
  }, [didCenterOnUpcoming, initialLoading, events, focused, timeZone]);

  // ---- Bucket events by day key (TZ-aware), once per events change --------
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = dateKey(new Date(e.startsAt), timeZone);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    // Sort each day's events by start time so the inline panel is chronological.
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return map;
  }, [events, timeZone]);

  const cells = React.useMemo(() => buildGrid(focused), [focused]);

  // Count events visible in the focused month — used for the empty-state
  // overlay so we don't show "no events" when the month genuinely has them
  // but the brother is just looking at a sparse week.
  const monthHasEvents = React.useMemo(() => {
    const fm = focused.getMonth();
    const fy = focused.getFullYear();
    for (const cell of cells) {
      if (cell.getMonth() !== fm || cell.getFullYear() !== fy) continue;
      if (eventsByDay.has(naiveKey(cell))) return true;
    }
    return false;
  }, [cells, eventsByDay, focused]);

  const selectedEvents = React.useMemo(() => {
    if (!selectedKey) return [];
    return eventsByDay.get(selectedKey) ?? [];
  }, [selectedKey, eventsByDay]);

  const selectedDate = React.useMemo(() => {
    if (!selectedKey) return null;
    const [y, m, d] = selectedKey.split("-").map(Number);
    return naiveDate(y, m - 1, d);
  }, [selectedKey]);

  // ---- Keyboard navigation: arrow keys move between cells -----------------
  const onCellKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = idx + 1;
    else if (e.key === "ArrowLeft") nextIdx = idx - 1;
    else if (e.key === "ArrowDown") nextIdx = idx + 7;
    else if (e.key === "ArrowUp") nextIdx = idx - 7;
    if (nextIdx === null) return;
    if (nextIdx < 0 || nextIdx >= cells.length) return;
    e.preventDefault();
    const root = gridRef.current;
    if (!root) return;
    const buttons = root.querySelectorAll<HTMLButtonElement>("[data-cell-idx]");
    const next = buttons[nextIdx];
    if (next) next.focus();
  };

  const handleSelectDay = (cell: Date) => {
    const key = naiveKey(cell);
    const has = eventsByDay.has(key);
    if (!has) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  const handleEventRowClick = (eventId: string) => {
    // Preferred: open the EventDetailsModal via the parent's callback so the
    // brother sees the full RSVP breakdown (Going / Maybe / Not going / No
    // response) without leaving the calendar.
    if (onEventClick) {
      onEventClick(eventId);
      return;
    }
    // Fallback (no parent handler wired): smooth-scroll to the card so the
    // legacy single-page behavior still works.
    if (typeof document === "undefined") return;
    const target = document.getElementById(`event-card-${eventId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-phisig-red", "ring-offset-2");
      window.setTimeout(() => {
        target.classList.remove("ring-2", "ring-phisig-red", "ring-offset-2");
      }, 1500);
    }
  };

  // ---- Render --------------------------------------------------------------

  if (initialLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm animate-soft-enter">
      {/* Header: prev / month label / next / today */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFocused((f) => addMonths(f, -1))}
            aria-label="Previous month"
            className="press inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setFocused(startOfMonth(today));
              setSelectedKey(null);
            }}
            className="press inline-flex h-9 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/40"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFocused((f) => addMonths(f, 1))}
            aria-label="Next month"
            className="press inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 text-center">
          {/* Static heading — does NOT use aria-live; the prev/next buttons
              below carry aria-label updates so screen readers announce the new
              month via the button's accessible name on click, not on every
              re-render of this heading (which would double-announce). */}
          <h3 className="text-base font-semibold tracking-tight sm:text-lg">
            {monthLabel(focused, timeZone)}
          </h3>
        </div>

        <div className="text-right text-[11px] text-muted-foreground tabular-nums">
          <UpdatedAgo lastUpdated={lastUpdated} now={now} />
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {DAY_NAMES.map((name, i) => (
          <div key={i} className="px-2 py-2 text-center">
            <span className="hidden sm:inline">{name.full}</span>
            <span className="sm:hidden">{name.short}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative" ref={gridRef}>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const key = naiveKey(cell);
            const inMonth =
              cell.getMonth() === focused.getMonth() &&
              cell.getFullYear() === focused.getFullYear();
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const dayEvents = inMonth ? eventsByDay.get(key) ?? [] : [];
            const dayNum = cell.getDate();

            return (
              <button
                key={key + "-" + idx}
                type="button"
                data-cell-idx={idx}
                onClick={() => handleSelectDay(cell)}
                onKeyDown={(e) => onCellKeyDown(e, idx)}
                aria-label={ariaForCell(cell, dayEvents, timeZone)}
                aria-pressed={isSelected}
                disabled={!inMonth}
                className={cn(
                  "group relative flex h-20 flex-col border-b border-r border-border p-1 text-left transition-colors sm:h-28 sm:p-1.5",
                  // Right edge: drop the right border on every 7th cell.
                  (idx + 1) % 7 === 0 && "border-r-0",
                  // Bottom edge: drop the bottom border on the last row.
                  idx >= 35 && "border-b-0",
                  inMonth
                    ? "bg-background hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-phisig-red/40"
                    : "bg-secondary/20 text-muted-foreground/40 cursor-default",
                  isToday && inMonth && "bg-phisig-red-soft/60 ring-1 ring-inset ring-phisig-red",
                  isSelected && inMonth && !isToday && "bg-secondary",
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "text-xs font-semibold sm:text-sm",
                      isToday && "text-phisig-red",
                      !inMonth && "text-muted-foreground/50",
                    )}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span
                      className="hidden text-[10px] font-medium text-muted-foreground sm:inline"
                      aria-hidden="true"
                    >
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {dayEvents.length > 0 && (
                  <DayIcons events={dayEvents} />
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Empty-state notice — rendered below the grid (not overlaid) so it never
          blocks taps on empty day cells. Brothers can still click a future day
          to view it in the day panel, even on a month with no events. */}
      {!monthHasEvents && (
        <div className="border-t border-border px-3 py-2.5 sm:px-4">
          <p className="text-center text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 ring-1 ring-border">
              No events scheduled this month
            </span>
          </p>
        </div>
      )}

      {/* Inline day panel */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="border-t border-border p-3 sm:p-4 animate-spring-in">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold tracking-tight">
              {fullDayLabel(selectedDate, timeZone)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {selectedEvents.length}{" "}
                {selectedEvents.length === 1 ? "event" : "events"}
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setSelectedKey(null)}
              className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              Close
            </button>
          </div>
          <ul className="space-y-1.5">
            {selectedEvents.map((e) => (
              <DayPanelRow
                key={e.id}
                event={e}
                onClick={() => handleEventRowClick(e.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Subcomponents ---------------------------------------------------------

function DayIcons({ events }: { events: CalendarEvent[] }) {
  // Cap visible icons at 3; show "+N" pill if there are more.
  const visible = events.slice(0, 3);
  const overflow = events.length - visible.length;
  return (
    <div className="mt-auto flex items-center gap-1 pt-1">
      {visible.map((e) => {
        const Icon = CATEGORY_ICON[e.category] ?? CATEGORY_ICON.OTHER;
        const color = CATEGORY_ICON_COLOR[e.category] ?? CATEGORY_ICON_COLOR.OTHER;
        return (
          <span
            key={e.id}
            className={cn(
              "inline-flex h-4 w-4 items-center justify-center sm:h-5 sm:w-5",
              color,
            )}
            aria-hidden="true"
            title={e.name}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="ml-0.5 inline-flex h-4 items-center rounded-full bg-secondary px-1.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border sm:h-5 sm:px-2 sm:text-[10px]"
          aria-hidden="true"
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

function DayPanelRow({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  const { timeZone } = useChapterIdentity();
  const stripe = categoryStripe(event.category);
  const label = categoryLabel(event.category);
  const Icon = CATEGORY_ICON[event.category] ?? CATEGORY_ICON.OTHER;
  const iconColor = CATEGORY_ICON_COLOR[event.category] ?? CATEGORY_ICON_COLOR.OTHER;
  const start = new Date(event.startsAt);

  let rsvpIcon: React.ReactNode = null;
  let rsvpLabel = "Not yet";
  if (event.mine) {
    if (event.mine.status === "GOING") {
      rsvpIcon = <CheckCircle2 className="h-3.5 w-3.5 text-phisig-red" />;
      rsvpLabel = "Going";
    } else if (event.mine.status === "MAYBE") {
      rsvpIcon = <HelpCircle className="h-3.5 w-3.5 text-amber-500" />;
      rsvpLabel = "Maybe";
    } else {
      rsvpIcon = <XCircle className="h-3.5 w-3.5 text-zinc-400" />;
      rsvpLabel = "Not going";
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="lift group flex w-full items-stretch gap-2 rounded-lg border border-border bg-background text-left hover:border-phisig-red/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/40"
      >
        <span aria-hidden="true" className={cn("w-1 shrink-0 self-stretch rounded-l-lg", stripe)} />
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-2 text-sm">
          <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md bg-secondary", iconColor)} aria-hidden="true">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-[5rem] text-xs font-medium tabular-nums text-muted-foreground">
            {formatTime(start, timeZone)}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{event.name}</span>
          {event.location && (
            <span className="hidden items-center gap-1 truncate text-xs text-muted-foreground sm:inline-flex">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-border">
            {label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={`Your RSVP: ${rsvpLabel}`}>
            {rsvpIcon}
            <span>{rsvpLabel}</span>
          </span>
        </div>
      </button>
    </li>
  );
}

function UpdatedAgo({
  lastUpdated,
  now,
}: {
  lastUpdated: number | null;
  now: number;
}) {
  if (lastUpdated === null) {
    return <span aria-live="polite">Updating…</span>;
  }
  const diffSec = Math.max(0, Math.floor((now - lastUpdated) / 1000));
  let label: string;
  if (diffSec < 5) label = "just now";
  else if (diffSec < 60) label = `${diffSec}s ago`;
  else if (diffSec < 3600) label = `${Math.floor(diffSec / 60)}m ago`;
  else label = `${Math.floor(diffSec / 3600)}h ago`;
  return (
    <span aria-live="polite" title={new Date(lastUpdated).toLocaleString()}>
      Updated {label}
    </span>
  );
}

function CalendarSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
        <div className="h-9 w-32 rounded-md bg-secondary/60 animate-pulse" />
        <div className="h-6 w-32 rounded-md bg-secondary/60 animate-pulse" />
        <div className="h-4 w-24 rounded-md bg-secondary/60 animate-pulse" />
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-2 py-2 text-center">
            <div className="mx-auto h-3 w-6 rounded bg-secondary/60 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-20 border-b border-r border-border bg-background sm:h-28",
              (i + 1) % 7 === 0 && "border-r-0",
              i >= 35 && "border-b-0",
            )}
          >
            <div className="m-1 h-3 w-4 rounded bg-secondary/50 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="p-4 text-center text-xs text-muted-foreground">
        <Loader2 className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin" />
        Loading the calendar grid…
      </div>
    </div>
  );
}

// ---- Static config ---------------------------------------------------------

const DAY_NAMES = [
  { full: "Sun", short: "S" },
  { full: "Mon", short: "M" },
  { full: "Tue", short: "T" },
  { full: "Wed", short: "W" },
  { full: "Thu", short: "T" },
  { full: "Fri", short: "F" },
  { full: "Sat", short: "S" },
];

function ariaForCell(cell: Date, events: CalendarEvent[], timeZone: string): string {
  const datePart = fullDayLabel(cell, timeZone);
  if (events.length === 0) return `${datePart}, no events`;
  if (events.length === 1) return `${datePart}, 1 event: ${events[0].name}`;
  const names = events.map((e) => e.name).join(", ");
  return `${datePart}, ${events.length} events: ${names}`;
}
