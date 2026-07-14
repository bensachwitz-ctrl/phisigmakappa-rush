"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { avatarSrc } from "@/lib/image-url";
import { IconCheckCircle as CheckCircle2, IconXCircle as XCircle, IconHelp as HelpCircle, IconClock as Clock, IconPin as MapPin, IconShirt as Shirt, IconLock as Lock, IconGlobe as Globe, IconSpinner as Loader2, IconMembers as Users, IconHeart as Heart, IconCrown as Crown, IconParty as PartyPopper, IconCalendar as Calendar } from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-editor";

import { IconSpark } from "@/components/brand/icons";
// Per-category icon + tone — kept in lockstep with EVENT_CATEGORIES in
// components/admin/events-manager.tsx and the calendar grid icons. This
// component imports nothing from there to keep the bundle smaller in the
// modal-only case (it's the only consumer of these tones inside this file).
const CATEGORY_META: Record<string, { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  RUSH:        { label: "Rush event",     tone: "bg-brand-red text-white",  icon: IconSpark    },
  DATE:        { label: "Date event",     tone: "bg-pink-500 text-white",    icon: Heart       },
  BROTHERHOOD: { label: "Brotherhood",    tone: "bg-blue-500 text-white",    icon: Users       },
  CHAPTER:     { label: "Chapter",        tone: "bg-amber-500 text-white",   icon: Crown       },
  SOCIAL:      { label: "Social",         tone: "bg-emerald-500 text-white", icon: PartyPopper },
  OTHER:       { label: "Event",          tone: "bg-zinc-500 text-white",    icon: Calendar    },
};

type RosterEntry = {
  status: "GOING" | "NOT_GOING" | "MAYBE";
  note: string | null;
  updatedAt: string;
  brother: { id: string; name: string; position: string | null; headshotUrl: string | null };
};

type NoResponseBrother = { id: string; name: string; position: string | null; headshotUrl: string | null };

type EventDetails = {
  ok: boolean;
  event: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    dressCode: string | null;
    startsAt: string;
    endsAt: string | null;
    isPrivate: boolean;
    category: string;
  };
  mine: { status: "GOING" | "NOT_GOING" | "MAYBE"; note: string | null } | null;
  roster: RosterEntry[];
  noResponse: NoResponseBrother[];
  counts: { GOING: number; NOT_GOING: number; MAYBE: number; NO_RESPONSE: number; TOTAL_BROTHERS: number };
};

type Tab = "GOING" | "MAYBE" | "NOT_GOING" | "NO_RESPONSE";

export function EventDetailsModal({
  eventId,
  open,
  onClose,
  onRsvpChange,
}: {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
  onRsvpChange?: () => void;
}) {
  const { push } = useToast();
  const [data, setData] = React.useState<EventDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<Tab | null>(null);
  const [tab, setTab] = React.useState<Tab>("GOING");

  // Load (or refresh) the modal data whenever it opens for a different event.
  const fetchData = React.useCallback(async (id: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/events/${id}/rsvp`, { cache: "no-store" });
      const j = await r.json();
      if (j?.ok) {
        setData(j as EventDetails);
        // If brother already RSVP'd, default the tab to their status. Else
        // open on "Going" since that's the most useful default.
        setTab((j.mine?.status as Tab) || "GOING");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && eventId) fetchData(eventId);
  }, [open, eventId, fetchData]);

  // Optimistic RSVP — updates local state immediately, fires POST, reverts
  // on failure. Re-fetches the roster so headcounts in the tab badges stay
  // honest.
  async function setRsvp(status: Tab) {
    if (!eventId || !data) return;
    if (status === "NO_RESPONSE") return; // not a valid POST target
    setSubmitting(status);
    const prevMine = data.mine;
    const prevCounts = data.counts;
    // Optimistic counts shift
    const nextCounts = { ...prevCounts };
    if (prevMine) nextCounts[prevMine.status] = Math.max(0, nextCounts[prevMine.status] - 1);
    else nextCounts.NO_RESPONSE = Math.max(0, nextCounts.NO_RESPONSE - 1);
    nextCounts[status] = nextCounts[status] + 1;
    setData({ ...data, mine: { status, note: prevMine?.note || null }, counts: nextCounts });
    try {
      const r = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note: prevMine?.note || "" }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed");
      // Re-fetch to get the authoritative roster + counts.
      await fetchData(eventId);
      onRsvpChange?.();
      push({ title: "RSVP saved", variant: "success" });
    } catch (err: any) {
      // Revert.
      setData((d) => (d ? { ...d, mine: prevMine, counts: prevCounts } : d));
      push({ title: err.message || "RSVP failed", variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  }

  if (!eventId) return null;

  const e = data?.event;
  const cat = e ? CATEGORY_META[e.category] || CATEGORY_META.OTHER : CATEGORY_META.OTHER;
  const CatIcon = cat.icon;

  // Build the bucket the active tab is showing.
  const bucket = data
    ? tab === "NO_RESPONSE"
      ? data.noResponse.map((b) => ({ status: "NO_RESPONSE" as const, note: null, brother: b }))
      : data.roster.filter((r) => r.status === tab)
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" aria-describedby={undefined}>
        {/* Category-colored header band */}
        <div className={cn("px-6 py-5 text-white relative", cat.tone)}>
          <div className="flex items-start gap-3">
            <div className="bg-white/20 rounded-lg p-2 flex-shrink-0">
              <CatIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-90 flex items-center gap-2">
                {cat.label}
                {e?.isPrivate ? (
                  <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-[10px]">
                    <Lock className="h-2.5 w-2.5" /> Invite only
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-[10px]">
                    <Globe className="h-2.5 w-2.5" /> Public
                  </span>
                )}
              </div>
              <DialogHeader className="space-y-0 mt-1">
                <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                  {e?.name || "Loading…"}
                </DialogTitle>
              </DialogHeader>
              {e && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/90">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(new Date(e.startsAt))} · {formatTime(new Date(e.startsAt))}
                    {e.endsAt && <> – {formatTime(new Date(e.endsAt))}</>}
                  </span>
                  {e.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {e.location}
                    </span>
                  )}
                  {e.dressCode && (
                    <span className="inline-flex items-center gap-1">
                      <Shirt className="h-3.5 w-3.5" /> {e.dressCode}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {e?.description && (
            // Full event view: render the rich (Tiptap) body. RichTextContent
            // re-sanitizes before injecting, and a legacy plain-text description
            // renders as safe escaped text.
            <RichTextContent
              html={e.description}
              className="mt-3 text-sm text-white/90 leading-relaxed"
            />
          )}
        </div>

        {/* RSVP buttons row — radiogroup pattern: 3 mutually-exclusive options.
            Roving tabindex + arrow keys per WAI-ARIA radio group practice. */}
        <div className="px-6 pt-4 pb-3 border-b">
          <div id="rsvp-group-label" className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Your RSVP
          </div>
          <div
            role="radiogroup"
            aria-labelledby="rsvp-group-label"
            className="grid grid-cols-3 gap-2"
            onKeyDown={(e) => {
              const opts = ["GOING", "MAYBE", "NOT_GOING"] as const;
              const cur = (data?.mine?.status as typeof opts[number]) ?? "GOING";
              const i = opts.indexOf(cur);
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                setRsvp(opts[(i + 1) % opts.length]);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                setRsvp(opts[(i - 1 + opts.length) % opts.length]);
              }
            }}
          >
            {(["GOING", "MAYBE", "NOT_GOING"] as const).map((s) => {
              const active = data?.mine?.status === s;
              const isSubmitting = submitting === s;
              const RSVP_CONFIG = {
                GOING:     { label: "Going",     icon: CheckCircle2, color: "emerald" as const },
                MAYBE:     { label: "Maybe",     icon: HelpCircle,   color: "amber"   as const },
                NOT_GOING: { label: "Not going", icon: XCircle,      color: "zinc"    as const },
              };
              const config = RSVP_CONFIG[s];
              const Icon = config.icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRsvp(s)}
                  disabled={!!submitting}
                  role="radio"
                  aria-checked={active}
                  tabIndex={active || (!data?.mine?.status && s === "GOING") ? 0 : -1}
                  className={cn(
                    "press flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium border transition-all",
                    active && config.color === "emerald" && "bg-emerald-500 text-white border-emerald-500 shadow-sm",
                    active && config.color === "amber"   && "bg-amber-500 text-white border-amber-500 shadow-sm",
                    active && config.color === "zinc"    && "bg-zinc-700 text-white border-zinc-700 shadow-sm",
                    !active && "bg-white text-foreground border-zinc-200 hover:border-zinc-400",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs: who's going / maybe / not going / no response — full WAI-ARIA tabs pattern. */}
        <div className="px-2 sm:px-4 pt-3 border-b overflow-x-auto">
          <div
            role="tablist"
            aria-label="RSVP breakdown"
            className="flex gap-1 text-sm"
            onKeyDown={(e) => {
              const ids: Tab[] = ["GOING", "MAYBE", "NOT_GOING", "NO_RESPONSE"];
              const i = ids.indexOf(tab);
              if (e.key === "ArrowRight") {
                e.preventDefault();
                setTab(ids[(i + 1) % ids.length]);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                setTab(ids[(i - 1 + ids.length) % ids.length]);
              } else if (e.key === "Home") {
                e.preventDefault();
                setTab(ids[0]);
              } else if (e.key === "End") {
                e.preventDefault();
                setTab(ids[ids.length - 1]);
              }
            }}
          >
            {(
              [
                { id: "GOING",        label: "Going",        color: "text-emerald-600 border-emerald-500" },
                { id: "MAYBE",        label: "Maybe",        color: "text-amber-600 border-amber-500"     },
                { id: "NOT_GOING",    label: "Not going",    color: "text-zinc-700 border-zinc-700"        },
                { id: "NO_RESPONSE",  label: "No response",  color: "text-brand-red border-brand-red"   },
              ] as { id: Tab; label: string; color: string }[]
            ).map(({ id, label, color }) => {
              const active = tab === id;
              const count = data?.counts[id] ?? 0;
              return (
                <button
                  key={id}
                  id={`rsvp-tab-${id}`}
                  onClick={() => setTab(id)}
                  className={cn(
                    "press relative px-3 py-2 text-xs sm:text-sm font-medium border-b-2 -mb-px whitespace-nowrap",
                    active ? color : "text-muted-foreground border-transparent hover:text-foreground",
                  )}
                  aria-selected={active}
                  aria-controls="rsvp-tabpanel"
                  role="tab"
                  tabIndex={active ? 0 : -1}
                >
                  {label}
                  <span
                    aria-label={`${count} ${label.toLowerCase()}`}
                    className={cn(
                      "ml-1.5 inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full text-[10px] px-1.5 font-semibold",
                      active ? "bg-current text-white" : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    <span className={active ? "text-white" : ""}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roster body — scrollable */}
        <div
          id="rsvp-tabpanel"
          role="tabpanel"
          aria-labelledby={`rsvp-tab-${tab}`}
          tabIndex={0}
          className="max-h-[44vh] overflow-y-auto px-6 py-4"
        >
          {loading && !data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : bucket.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {tab === "NO_RESPONSE"
                ? "Every active brother has responded. Nice."
                : tab === "GOING"
                ? "No one has marked Going yet. Be the first."
                : tab === "MAYBE"
                ? "No maybes."
                : "No one has marked Not going."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {bucket.map((r, i) => (
                <li
                  key={r.brother.id + "-" + i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 hover:bg-zinc-50 transition-colors"
                >
                  {r.brother.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc(r.brother.headshotUrl, 72)}
                      alt={r.brother.name}
                      className="h-9 w-9 rounded-full object-cover bg-zinc-100"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-brand-red-soft text-brand-red flex items-center justify-center text-sm font-semibold">
                      {r.brother.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.brother.name}</div>
                    {r.brother.position && (
                      <div className="text-[11px] text-muted-foreground truncate">{r.brother.position}</div>
                    )}
                    {r.note && (
                      <div className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-1">"{r.note}"</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Summary footer */}
        {data && (
          <div className="border-t bg-zinc-50 px-6 py-3 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium text-emerald-600">{data.counts.GOING}</span> going ·{" "}
              <span className="font-medium text-amber-600">{data.counts.MAYBE}</span> maybe ·{" "}
              <span className="font-medium text-zinc-700">{data.counts.NOT_GOING}</span> not going ·{" "}
              <span className="font-medium text-brand-red">{data.counts.NO_RESPONSE}</span> no response
            </span>
            <span>
              {data.counts.TOTAL_BROTHERS} active brother{data.counts.TOTAL_BROTHERS === 1 ? "" : "s"}
            </span>
          </div>
        )}

        <div className="px-6 py-3 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
