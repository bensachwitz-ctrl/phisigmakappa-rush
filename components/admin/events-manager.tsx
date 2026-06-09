"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  CalendarDays, MapPin, Plus, Lock, Trash2, Loader2,
  ClipboardCheck, Users, Search, Sparkles, Edit3, Globe,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";

// Event category presets — same six values used by the brother calendar.
// Color tokens here MUST stay in sync with components/brother/event-calendar.tsx
// so admins see the same color stripe on a card that brothers see post-publish.
export const EVENT_CATEGORIES = [
  { id: "RUSH",        label: "Rush event",      tone: "bg-phisig-red text-white",            stripe: "bg-phisig-red"    },
  { id: "DATE",        label: "Date event",      tone: "bg-pink-500 text-white",              stripe: "bg-pink-500"      },
  { id: "BROTHERHOOD", label: "Brotherhood",     tone: "bg-blue-500 text-white",              stripe: "bg-blue-500"      },
  { id: "CHAPTER",     label: "Chapter meeting", tone: "bg-amber-500 text-white",             stripe: "bg-amber-500"     },
  { id: "SOCIAL",      label: "Social",          tone: "bg-emerald-500 text-white",           stripe: "bg-emerald-500"   },
  { id: "OTHER",       label: "Other",           tone: "bg-zinc-500 text-white",              stripe: "bg-zinc-500"      },
] as const;
export type EventCategoryId = (typeof EVENT_CATEGORIES)[number]["id"];

function categoryMeta(id: string | undefined) {
  return EVENT_CATEGORIES.find((c) => c.id === id) || EVENT_CATEGORIES[5]; // OTHER fallback
}

type Event = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  dressCode: string | null;
  startsAt: string;
  endsAt: string | null;
  isPrivate: boolean;
  category?: string | null;
};

type Rush = { id: string; name: string; email: string; phone: string };

const initial = {
  name: "",
  description: "",
  location: "",
  dressCode: "",
  startsAt: "",
  endsAt: "",
  isPrivate: false,
  category: "OTHER" as EventCategoryId,
};

function formatInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  let hour = getPart("hour");
  const minute = getPart("minute");

  if (hour === "24") hour = "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseLocalTimeInTimeZone(localTimeStr: string, timeZone: string): Date {
  const [datePart, timePart] = localTimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

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
  const targetUtcTime = Date.UTC(year, month - 1, day, hour, minute);

  const offsetMs = formattedUtcTime - targetUtcTime;

  return new Date(utcDate.getTime() - offsetMs);
}

export function EventsManager({ initial: initialEvents }: { initial: Event[] }) {
  const { push } = useToast();
  const { timeZone } = useChapterIdentity();
  const [events, setEvents] = React.useState<Event[]>(initialEvents);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState(initial);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [attendingFor, setAttendingFor] = React.useState<Event | null>(null);

  // ---- Search & Filter State ----
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [privacyFilter, setPrivacyFilter] = React.useState<string>("ALL");

  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !search.trim() ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.location && e.location.toLowerCase().includes(search.toLowerCase())) ||
        (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
      
      const matchesCategory = categoryFilter === "ALL" || e.category === categoryFilter;
      
      const matchesPrivacy =
        privacyFilter === "ALL" ||
        (privacyFilter === "PRIVATE" && e.isPrivate) ||
        (privacyFilter === "PUBLIC" && !e.isPrivate);

      return matchesSearch && matchesCategory && matchesPrivacy;
    });
  }, [events, search, categoryFilter, privacyFilter]);

  // ---- Confirm dialog (replaces window.confirm) ----
  const [confirmState, setConfirmState] = React.useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = React.useState(false);

  function askConfirm(opts: NonNullable<typeof confirmState>) {
    setConfirmState(opts);
  }

  async function runConfirm() {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  function update<K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(initial);
    setOpen(true);
  }

  // Listen for a custom DOM event so the page-header "+ Add event" button
  // (rendered higher up in the tree, outside this component) can pop the
  // create dialog without prop-drilling. Scoped to a unique event name so
  // it can't collide with anything else.
  React.useEffect(() => {
    const handler = () => openCreate();
    window.addEventListener("phisig:open-add-event", handler);
    return () => window.removeEventListener("phisig:open-add-event", handler);
  }, []);

  function openEdit(e: Event) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      description: e.description || "",
      location: e.location || "",
      dressCode: e.dressCode || "",
      startsAt: formatInTimeZone(new Date(e.startsAt), timeZone),
      endsAt: e.endsAt ? formatInTimeZone(new Date(e.endsAt), timeZone) : "",
      isPrivate: e.isPrivate,
      category: ((e.category as EventCategoryId) || "OTHER"),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.startsAt) {
      push({ title: "Name and start time required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const utcStartsAt = parseLocalTimeInTimeZone(form.startsAt, timeZone).toISOString();
      const utcEndsAt = form.endsAt ? parseLocalTimeInTimeZone(form.endsAt, timeZone).toISOString() : "";
      
      const payload = {
        ...form,
        startsAt: utcStartsAt,
        endsAt: utcEndsAt,
        ...(editingId ? { id: editingId } : {}),
      };
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      const e = {
        ...json.event,
        startsAt: new Date(json.event.startsAt).toISOString(),
        endsAt: json.event.endsAt ? new Date(json.event.endsAt).toISOString() : null,
      };
      setEvents((es) =>
        [...(editingId ? es.filter((x) => x.id !== editingId) : es), e]
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      );
      setForm(initial);
      setEditingId(null);
      setOpen(false);
      push({ title: editingId ? "Event updated" : "Event added", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Save failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    askConfirm({
      title: "Delete event?",
      description: "This event will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        const prev = events;
        setEvents((es) => es.filter((e) => e.id !== id));
        try {
          const res = await fetch("/api/admin/events", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
          });
          if (!res.ok) throw new Error();
        } catch {
          setEvents(prev);
          push({ title: "Delete failed", variant: "destructive" });
        }
      },
    });
  }

  function deleteAll() {
    if (events.length === 0) return;
    askConfirm({
      title: "Delete all events?",
      description: `Delete all ${events.length} events? This cannot be undone.`,
      confirmLabel: `Delete ${events.length} events`,
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        const prev = events;
        setEvents([]);
        try {
          for (const e of prev) {
            await fetch("/api/admin/events", {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ id: e.id }),
            });
          }
          push({ title: `Cleared ${prev.length} events`, variant: "success" });
        } catch {
          setEvents(prev);
          push({ title: "Bulk delete failed", variant: "destructive" });
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {events.length === 0
            ? "No events yet — add events one at a time below."
            : search || categoryFilter !== "ALL" || privacyFilter !== "ALL"
            ? `${filteredEvents.length} of ${events.length} events found`
            : `${events.length} event${events.length === 1 ? "" : "s"} scheduled`}
        </p>
        <div className="flex flex-wrap gap-2">
          {events.length > 0 && (
            <Button variant="ghost" size="sm" onClick={deleteAll} className="text-muted-foreground hover:text-destructive" disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </Button>
          )}
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" /> Add event
          </Button>
        </div>
      </div>

      {events.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 bg-secondary/10 p-2.5 rounded-xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by name, location, or details..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Categories</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={privacyFilter}
              onChange={(e) => setPrivacyFilter(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Privacy</option>
              <option value="PUBLIC">Public Only</option>
              <option value="PRIVATE">Invite Only</option>
            </select>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <Card className="border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/30 to-white">
          <CardContent className="py-12 px-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">No events yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Click <span className="font-medium text-foreground">"Add event"</span> to schedule the chapter's first event. Choose a category (Rush, Date, Brotherhood, Chapter, Social) — each shows up color-coded on the brother calendar. Toggle <span className="font-medium text-foreground">Invite-only</span> to hide it from the public website while keeping it visible to logged-in brothers.
            </p>
            <div className="mt-5 flex items-center justify-center">
              <Button onClick={openCreate} size="sm">
                <Plus className="h-3.5 w-3.5" /> Add event
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl bg-secondary/5">
          No events match your search or filter options.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredEvents.map((e) => {
            const isPast = new Date(e.startsAt).getTime() < Date.now() - 1000 * 60 * 60 * 24;
            const cat = categoryMeta(e.category || "OTHER");
            return (
              <Card key={e.id} className={cn("overflow-hidden", isPast && "opacity-90")}>
                <CardContent className="p-0">
                  <div className="grid grid-cols-[6px_1fr] sm:grid-cols-[6px_88px_1fr_auto] items-stretch">
                    {/* Category color stripe — matches the brother-calendar stripe so admins
                        see the same visual cue at-a-glance that brothers do. */}
                    <div className={cn("w-1.5", cat.stripe)} aria-hidden />
                    
                    {/* Date Block: Desktop only */}
                    <div className={cn("hidden sm:flex text-white flex-col items-center justify-center text-center p-4", cat.stripe)}>
                      <div className="text-[10px] uppercase tracking-[0.18em] opacity-85">
                        {format(new Date(e.startsAt), "MMM")}
                      </div>
                      <div className="text-3xl font-semibold leading-none mt-1">
                        {format(new Date(e.startsAt), "d")}
                      </div>
                      <div className="text-[11px] mt-1 opacity-85">
                        {format(new Date(e.startsAt), "EEE")}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col justify-between">
                      <div>
                        {/* Mobile-only Date header */}
                        <div className="sm:hidden flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{format(new Date(e.startsAt), "EEE, MMM d, yyyy")}</span>
                        </div>

                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <h3 className="font-semibold">{e.name}</h3>
                          <div className="flex flex-wrap gap-1">
                            <Badge className={cn(cat.tone, "ring-0")}>
                              {cat.label}
                            </Badge>
                            {e.isPrivate ? (
                              <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
                                <Lock className="h-3 w-3 mr-1" /> Invite only
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                <Globe className="h-3 w-3 mr-1" /> Public
                              </Badge>
                            )}
                            {isPast && (
                              <Badge className="bg-secondary text-muted-foreground">Past</Badge>
                            )}
                          </div>
                        </div>
                        {e.description && (
                          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                            {e.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" /> {format(new Date(e.startsAt), "h:mm a")}
                        </span>
                        {e.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" /> {e.location}
                          </span>
                        )}
                        {e.dressCode && <span>· {e.dressCode}</span>}
                      </div>
                    </div>

                    {/* Actions: Grid-aligned on desktop, stacked/padded block on mobile */}
                    <div className="col-span-2 sm:col-span-1 p-3 flex flex-row sm:flex-col items-center gap-1.5 justify-end sm:justify-center border-t sm:border-t-0 border-border bg-secondary/10 sm:bg-transparent">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(e)}
                        className="flex-1 sm:flex-none h-8"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAttendingFor(e)}
                        className="flex-1 sm:flex-none h-8"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Attendance
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive shrink-0 h-8 px-2"
                        onClick={() => remove(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit event" : "Add event"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1 inline-block">Name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Tailgate at Williams-Brice" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Starts</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 inline-block">Ends (optional)</Label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => update("endsAt", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-1 inline-block">Location</Label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Phi Sig House — 1525 College St" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Dress code</Label>
              <Input value={form.dressCode} onChange={(e) => update("dressCode", e.target.value)} placeholder="Smart casual" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What it is, who it's for, anything brothers should know." />
            </div>
            <div>
              <Label className="mb-1.5 inline-block">Category</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {EVENT_CATEGORIES.map((c) => {
                  const active = form.category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => update("category", c.id)}
                      className={cn(
                        "press rounded-md text-[11px] font-medium px-2 py-2 leading-tight transition-all border",
                        active
                          ? cn(c.tone, "border-transparent shadow-sm")
                          : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                      )}
                      aria-pressed={active}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Drives the event-card color brothers see on their calendar.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <Checkbox checked={form.isPrivate} onCheckedChange={(v) => update("isPrivate", !!v)} className="mt-0.5" />
              <span>
                <span className="font-medium">Invite only</span>
                <span className="block text-[12px] text-muted-foreground mt-0.5">
                  Hides this event from the public website. It still appears on the brother
                  calendar (logged-in brothers only). Leave unchecked to publish it on the
                  public homepage schedule.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Add event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AttendanceDialog
        event={attendingFor}
        onClose={() => setAttendingFor(null)}
      />

      {/* ---------- Confirm Dialog (replaces window.confirm) ---------- */}
      <Dialog open={!!confirmState} onOpenChange={(o) => !confirmBusy && !o && setConfirmState(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            <DialogDescription>{confirmState?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmState(null)} disabled={confirmBusy}>
              Cancel
            </Button>
            <Button
              onClick={runConfirm}
              disabled={confirmBusy}
              className={cn(
                confirmState?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              )}
            >
              {confirmBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmState?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttendanceDialog({
  event, onClose,
}: { event: Event | null; onClose: () => void }) {
  const { push } = useToast();
  const [rushes, setRushes] = React.useState<Rush[]>([]);
  const [attended, setAttended] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!event) return;
    setLoading(true);
    Promise.all([
      fetch("/api/admin/rush").then((r) => r.json()),
      fetch(`/api/admin/attendance?eventId=${event.id}`).then((r) => r.json()),
    ])
      .then(([roster, att]) => {
        setRushes(roster.rushes || []);
        setAttended(new Set((att.attendances || []).map((a: any) => a.rush.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event]);

  async function toggle(rushId: string) {
    const isOn = attended.has(rushId);
    const next = new Set(attended);
    if (isOn) next.delete(rushId);
    else next.add(rushId);
    setAttended(next);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: event!.id, rushId, attended: !isOn }),
      });
      if (!res.ok) throw new Error();
    } catch {
      const revert = new Set(attended);
      if (isOn) revert.add(rushId);
      else revert.delete(rushId);
      setAttended(revert);
      push({ title: "Update failed", variant: "destructive" });
    }
  }

  const filtered = rushes.filter((r) =>
    !query.trim() ||
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attendance</DialogTitle>
          <DialogDescription>
            {event?.name} · {event && format(new Date(event.startsAt), "EEE, MMM d 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3 px-1 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>
            <span className="font-medium text-foreground">{attended.size}</span>{" "}
            <span className="text-muted-foreground">of {rushes.length} attended</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {rushes.length === 0 ? "No rushes registered yet." : "No matches."}
            </div>
          ) : (
            filtered.map((r) => {
              const checked = attended.has(r.id);
              return (
                <label
                  key={r.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                    checked ? "bg-emerald-50/60 hover:bg-emerald-50" : "hover:bg-secondary/40"
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(r.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                  </div>
                  {checked && <span className="text-xs text-emerald-700 font-medium">Here</span>}
                </label>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
