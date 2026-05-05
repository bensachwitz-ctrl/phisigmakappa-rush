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

export function EventsManager({ initial: initialEvents }: { initial: Event[] }) {
  const { push } = useToast();
  const [events, setEvents] = React.useState<Event[]>(initialEvents);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState(initial);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [attendingFor, setAttendingFor] = React.useState<Event | null>(null);

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
    const tz = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    setForm({
      name: e.name,
      description: e.description || "",
      location: e.location || "",
      dressCode: e.dressCode || "",
      startsAt: tz(new Date(e.startsAt)),
      endsAt: e.endsAt ? tz(new Date(e.endsAt)) : "",
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
      // POST handles both create (no id) and edit (id supplied) — preserves
      // attendance + RSVP rows on edit because we no longer delete-then-recreate.
      const payload = editingId ? { ...form, id: editingId } : form;
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

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
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
  }

  async function deleteAll() {
    if (events.length === 0) return;
    if (!confirm(`Delete all ${events.length} events? This cannot be undone.`)) return;
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
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {events.length === 0 ? "No events yet — add events one at a time below." : `${events.length} event${events.length === 1 ? "" : "s"} scheduled`}
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
      ) : (
        <div className="grid gap-3">
          {events.map((e) => {
            const isPast = new Date(e.startsAt).getTime() < Date.now() - 1000 * 60 * 60 * 24;
            const cat = categoryMeta(e.category || "OTHER");
            return (
              <Card key={e.id} className={cn("overflow-hidden", isPast && "opacity-90")}>
                <CardContent className="p-0">
                  <div className="grid grid-cols-[6px_88px_1fr_auto] items-stretch">
                    {/* Category color stripe — matches the brother-calendar stripe so admins
                        see the same visual cue at-a-glance that brothers do. */}
                    <div className={cn("w-1.5", cat.stripe)} aria-hidden />
                    <div className={cn("text-white flex flex-col items-center justify-center text-center p-4", cat.stripe)}>
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
                    <div className="p-4">
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
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {e.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                    <div className="p-3 flex flex-col items-center gap-1.5 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(e)}
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAttendingFor(e)}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" /> Attendance
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
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
  }, [event?.id]);

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
