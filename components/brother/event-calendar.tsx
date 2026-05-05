"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  CalendarDays,
  MapPin,
  Lock,
  Globe,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shirt,
  Sparkles,
} from "lucide-react";

type RsvpStatus = "GOING" | "NOT_GOING" | "MAYBE";

type RosterEntry = {
  status: RsvpStatus;
  note: string | null;
  brother: {
    id: string;
    name: string;
    position: string | null;
    headshotUrl: string | null;
  };
};

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

type CategoryStyle = {
  label: string;
  stripe: string; // tailwind bg color for the left edge
  badge: string; // tailwind classes for the category badge
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  RUSH: {
    label: "Rush",
    stripe: "bg-phisig-red",
    badge: "bg-phisig-red-soft text-phisig-red ring-1 ring-phisig-red/20",
  },
  DATE: {
    label: "Date",
    stripe: "bg-pink-400",
    badge: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  },
  BROTHERHOOD: {
    label: "Brotherhood",
    stripe: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  },
  CHAPTER: {
    label: "Chapter",
    stripe: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  },
  SOCIAL: {
    label: "Social",
    stripe: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  OTHER: {
    label: "Other",
    stripe: "bg-zinc-500",
    badge: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  },
};

function styleFor(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.OTHER;
}

export function EventCalendar({
  onEventClick,
}: {
  // Optional: lets the parent page open an EventDetailsModal when the card
  // header is clicked. If not supplied, cards still expand inline.
  onEventClick?: (eventId: string) => void;
} = {}) {
  const { push } = useToast();
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/brother/events", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: { events?: CalendarEvent[] }) => {
        if (cancelled) return;
        setEvents(j.events || []);
      })
      .catch(() => {
        if (cancelled) return;
        push({ title: "Couldn't load the calendar", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [push]);

  const onRsvpChange = React.useCallback(
    (eventId: string, next: CalendarEvent) => {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? next : e)));
    },
    [],
  );

  if (loading) {
    return (
      <Card className="border-phisig-red/10">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
          Loading the calendar…
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/40 to-white animate-soft-enter">
        <CardContent className="py-12 px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            Nothing on the calendar yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The e-board is finalizing rush week. Check back soon — when events
            drop they'll show up here with one-tap RSVP.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {events.map((e, i) => (
        <EventCard
          key={e.id}
          event={e}
          // Stagger the entry animation so the calendar paints in like a
          // native iOS list — small delay per item, but capped so a long
          // calendar doesn't take 2s to settle.
          delayMs={Math.min(i * 40, 320)}
          onChange={(next) => onRsvpChange(e.id, next)}
          onOpenDetails={onEventClick ? () => onEventClick(e.id) : undefined}
        />
      ))}
    </div>
  );
}

function EventCard({
  event,
  onChange,
  delayMs,
  onOpenDetails,
}: {
  event: CalendarEvent;
  onChange: (next: CalendarEvent) => void;
  delayMs: number;
  // When supplied, the card title becomes a button that opens the
  // EventDetailsModal — letting brothers see the full RSVP breakdown
  // (Going / Maybe / Not going / No response) without leaving the page.
  onOpenDetails?: () => void;
}) {
  const { push } = useToast();
  const cat = styleFor(event.category);
  const start = new Date(event.startsAt);
  const isPast = start.getTime() < Date.now() - 1000 * 60 * 60 * 24;

  const [busy, setBusy] = React.useState<RsvpStatus | null>(null);
  const [expandedRoster, setExpandedRoster] = React.useState(false);
  const [expandedDesc, setExpandedDesc] = React.useState(false);
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);
  const [rosterLoading, setRosterLoading] = React.useState(false);
  const [showNote, setShowNote] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState(event.mine?.note || "");
  const [savingNote, setSavingNote] = React.useState(false);

  // Keep local note draft in sync if the parent state changes (e.g. another
  // tab updated the RSVP — unlikely but cheap to handle).
  React.useEffect(() => {
    setNoteDraft(event.mine?.note || "");
  }, [event.mine?.note]);

  const desc = event.description || "";
  const descIsLong = desc.length > 180;
  const visibleDesc = expandedDesc || !descIsLong ? desc : desc.slice(0, 180).trimEnd() + "…";

  async function fetchRoster() {
    setRosterLoading(true);
    try {
      const r = await fetch(`/api/events/${event.id}/rsvp`, { credentials: "same-origin" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: { roster?: RosterEntry[] } = await r.json();
      setRoster(j.roster || []);
    } catch {
      push({ title: "Couldn't load the roster", variant: "destructive" });
    } finally {
      setRosterLoading(false);
    }
  }

  async function toggleRoster() {
    const next = !expandedRoster;
    setExpandedRoster(next);
    if (next && roster === null) {
      await fetchRoster();
    }
  }

  async function setStatus(status: RsvpStatus) {
    if (busy) return;
    setBusy(status);
    // Optimistic update — adjust counts and mine immediately.
    const prevMine = event.mine;
    const nextCounts = { ...event.counts };
    if (prevMine) nextCounts[prevMine.status] = Math.max(0, nextCounts[prevMine.status] - 1);
    nextCounts[status] += 1;
    onChange({
      ...event,
      counts: nextCounts,
      mine: { status, note: prevMine?.note ?? null },
    });
    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note: prevMine?.note || "" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      // Show the note input automatically after marking GOING / MAYBE so the
      // brother can drop a quick "running 5min late" without hunting for it.
      if (status !== "NOT_GOING" && !prevMine?.note) {
        setShowNote(true);
      }
      // Bust the roster cache — they may be on the list now.
      if (expandedRoster) await fetchRoster();
      else setRoster(null);
      push({
        title:
          status === "GOING"
            ? "You're going"
            : status === "MAYBE"
              ? "Marked as maybe"
              : "Marked as not going",
        variant: "success",
      });
    } catch (err) {
      // Revert optimistic update on failure.
      onChange(event);
      push({
        title: "Couldn't save your RSVP",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function saveNote() {
    if (!event.mine) return; // can only attach a note to an active RSVP
    setSavingNote(true);
    const trimmed = noteDraft.trim();
    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: event.mine.status, note: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || `HTTP ${res.status}`);
      onChange({ ...event, mine: { status: event.mine.status, note: trimmed || null } });
      push({ title: trimmed ? "Note saved" : "Note cleared", variant: "success" });
      if (!trimmed) setShowNote(false);
    } catch (err) {
      push({
        title: "Couldn't save the note",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSavingNote(false);
    }
  }

  const total = event.counts.GOING + event.counts.MAYBE + event.counts.NOT_GOING;

  return (
    <Card
      id={`event-card-${event.id}`}
      className={cn(
        "lift overflow-hidden animate-soft-enter scroll-mt-24 transition-shadow",
        isPast && "opacity-85",
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Category color stripe */}
          <div
            aria-hidden="true"
            className={cn("w-1.5 shrink-0 self-stretch", cat.stripe)}
          />
          <div className="flex-1 min-w-0 p-4 sm:p-5">
            {/* Header row: date block + title block */}
            <div className="flex items-start gap-4">
              <DateBlock date={start} stripe={cat.stripe} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className={cat.badge}>{cat.label}</Badge>
                  {event.isPrivate ? (
                    <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
                      <Lock className="mr-1 h-3 w-3" /> Private
                    </Badge>
                  ) : (
                    <Badge className="bg-secondary text-muted-foreground ring-1 ring-border">
                      <Globe className="mr-1 h-3 w-3" /> Public
                    </Badge>
                  )}
                  {isPast && (
                    <Badge className="bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
                      Past
                    </Badge>
                  )}
                </div>
                <h3 className="mt-2 text-base font-semibold tracking-tight leading-snug">
                  {onOpenDetails ? (
                    <button
                      type="button"
                      onClick={onOpenDetails}
                      className="press text-left hover:text-phisig-red transition-colors underline-offset-4 hover:underline"
                      aria-label={`See full RSVP breakdown for ${event.name}`}
                    >
                      {event.name}
                    </button>
                  ) : (
                    event.name
                  )}
                </h3>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(start)} · {formatTime(start)}
                  </span>
                  {event.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </span>
                  )}
                  {event.dressCode && (
                    <span className="inline-flex items-center gap-1.5">
                      <Shirt className="h-3.5 w-3.5" />
                      {event.dressCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {desc && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {visibleDesc}
                {descIsLong && (
                  <button
                    type="button"
                    onClick={() => setExpandedDesc((v) => !v)}
                    className="ml-1 inline text-phisig-red hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {expandedDesc ? "show less" : "read more"}
                  </button>
                )}
              </p>
            )}

            {/* RSVP buttons */}
            <div
              role="group"
              aria-label={`RSVP for ${event.name}`}
              className="mt-4 grid grid-cols-3 gap-2"
            >
              <RsvpButton
                label="Going"
                icon={<CheckCircle2 className="h-4 w-4" />}
                active={event.mine?.status === "GOING"}
                loading={busy === "GOING"}
                disabled={busy !== null}
                activeClass="bg-phisig-red text-white hover:bg-phisig-red-dark border-transparent"
                onClick={() => setStatus("GOING")}
              />
              <RsvpButton
                label="Maybe"
                icon={<HelpCircle className="h-4 w-4" />}
                active={event.mine?.status === "MAYBE"}
                loading={busy === "MAYBE"}
                disabled={busy !== null}
                activeClass="bg-amber-500 text-white hover:bg-amber-600 border-transparent"
                onClick={() => setStatus("MAYBE")}
              />
              <RsvpButton
                label="Not going"
                icon={<XCircle className="h-4 w-4" />}
                active={event.mine?.status === "NOT_GOING"}
                loading={busy === "NOT_GOING"}
                disabled={busy !== null}
                activeClass="bg-zinc-700 text-white hover:bg-zinc-800 border-transparent"
                onClick={() => setStatus("NOT_GOING")}
              />
            </div>

            {/* Note input — appears when GOING / MAYBE is selected */}
            {event.mine && event.mine.status !== "NOT_GOING" && (
              <div className="mt-3">
                {showNote || event.mine.note ? (
                  <div className="field-glow rounded-lg">
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      maxLength={280}
                      rows={2}
                      placeholder="Optional note — driving from class, will be 5 min late…"
                      className="resize-none text-sm"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {noteDraft.length}/280 — visible to brothers
                      </span>
                      <div className="flex gap-2">
                        {(event.mine.note || showNote) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={savingNote}
                            onClick={() => {
                              setShowNote(false);
                              setNoteDraft(event.mine?.note || "");
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingNote || noteDraft === (event.mine.note || "")}
                          onClick={saveNote}
                          className="press"
                        >
                          {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Save note
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNote(true)}
                    className="text-xs text-phisig-red hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    + Add a note
                  </button>
                )}
              </div>
            )}

            {/* Counts pill + roster toggle */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <CountsPill counts={event.counts} />
              <button
                type="button"
                onClick={toggleRoster}
                aria-expanded={expandedRoster}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-phisig-red hover:bg-phisig-red-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/40"
              >
                <Users className="h-3.5 w-3.5" />
                {expandedRoster ? "Hide" : "Show"} who's going
                {expandedRoster ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {expandedRoster && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3 animate-spring-in">
                {rosterLoading ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    <Loader2 className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin" />
                    Loading roster…
                  </div>
                ) : roster && total > 0 ? (
                  <RosterList roster={roster} />
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No one has RSVP'd yet — be the first.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DateBlock({ date, stripe }: { date: Date; stripe: string }) {
  // Pin to America/New_York so SSR and the client agree on the day number.
  // The Intl.DateTimeFormat usage matches lib/utils.ts formatDate().
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "America/New_York" });
  const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone: "America/New_York" });
  const weekday = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
  return (
    <div
      className={cn(
        "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-sm",
        stripe,
      )}
      aria-hidden="true"
    >
      <div className="text-[10px] uppercase tracking-[0.18em] opacity-90">
        {month}
      </div>
      <div className="text-2xl font-semibold leading-none">{day}</div>
      <div className="text-[10px] opacity-90 mt-0.5">{weekday}</div>
    </div>
  );
}

function RsvpButton({
  label,
  icon,
  active,
  loading,
  disabled,
  activeClass,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`RSVP ${label}`}
      className={cn(
        "press inline-flex h-10 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50 focus-visible:ring-offset-1",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        active
          ? activeClass
          : "border-border bg-background text-foreground hover:bg-secondary",
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}

function CountsPill({
  counts,
}: {
  counts: { GOING: number; NOT_GOING: number; MAYBE: number };
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-phisig-red" aria-hidden="true" />
        <span className="text-foreground">{counts.GOING}</span> going
      </span>
      <span className="text-border" aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        <span className="text-foreground">{counts.MAYBE}</span> maybe
      </span>
      <span className="text-border" aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" aria-hidden="true" />
        <span className="text-foreground">{counts.NOT_GOING}</span> not
      </span>
    </div>
  );
}

function RosterList({ roster }: { roster: RosterEntry[] }) {
  const groups: Record<RsvpStatus, RosterEntry[]> = {
    GOING: roster.filter((r) => r.status === "GOING"),
    MAYBE: roster.filter((r) => r.status === "MAYBE"),
    NOT_GOING: roster.filter((r) => r.status === "NOT_GOING"),
  };
  const labels: Record<RsvpStatus, string> = {
    GOING: "Going",
    MAYBE: "Maybe",
    NOT_GOING: "Not going",
  };
  const order: RsvpStatus[] = ["GOING", "MAYBE", "NOT_GOING"];
  return (
    <div className="space-y-3">
      {order.map((status) => {
        const list = groups[status];
        if (list.length === 0) return null;
        return (
          <div key={status}>
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{labels[status]}</span>
              <span className="text-muted-foreground/70">({list.length})</span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {list.map((r) => (
                <li
                  key={r.brother.id}
                  className="inline-flex items-center gap-2 rounded-full bg-background px-2.5 py-1 text-xs ring-1 ring-border"
                  title={r.note || undefined}
                >
                  <Avatar
                    name={r.brother.name}
                    src={r.brother.headshotUrl}
                  />
                  <span className="font-medium">{r.brother.name}</span>
                  {r.brother.position && (
                    <span className="text-[10px] text-muted-foreground">
                      · {r.brother.position}
                    </span>
                  )}
                  {r.note && (
                    <span className="text-[10px] italic text-muted-foreground/90">
                      "{r.note}"
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className="h-5 w-5 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-phisig-red-soft text-[10px] font-semibold text-phisig-red ring-1 ring-phisig-red/20"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
