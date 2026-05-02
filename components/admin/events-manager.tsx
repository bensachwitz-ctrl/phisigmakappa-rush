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
  ClipboardCheck, Users, Search,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  dressCode: string | null;
  startsAt: string;
  endsAt: string | null;
  isPrivate: boolean;
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
};

export function EventsManager({ initial: initialEvents }: { initial: Event[] }) {
  const { push } = useToast();
  const [events, setEvents] = React.useState<Event[]>(initialEvents);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState(initial);
  const [attendingFor, setAttendingFor] = React.useState<Event | null>(null);

  function update<K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create() {
    if (!form.name.trim() || !form.startsAt) {
      push({ title: "Name and start time required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      const e = {
        ...json.event,
        startsAt: new Date(json.event.startsAt).toISOString(),
        endsAt: json.event.endsAt ? new Date(json.event.endsAt).toISOString() : null,
      };
      setEvents((es) => [...es, e].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setForm(initial);
      setOpen(false);
      push({ title: "Event added", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Failed to create event", variant: "destructive" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{events.length} events</p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No events yet. Click "Add event" to create the first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((e) => {
            const isPast = new Date(e.startsAt).getTime() < Date.now() - 1000 * 60 * 60 * 24;
            return (
              <Card key={e.id} className={cn("overflow-hidden", isPast && "opacity-90")}>
                <CardContent className="p-0">
                  <div className="grid grid-cols-[88px_1fr_auto] items-stretch">
                    <div className="bg-phisig-red text-white flex flex-col items-center justify-center text-center p-4">
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
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{e.name}</h3>
                        <div className="flex gap-1">
                          {e.isPrivate && (
                            <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
                              <Lock className="h-3 w-3 mr-1" /> Private
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
            <DialogTitle>Add event</DialogTitle>
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
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Phi Sig House — 800 Lincoln St" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Dress code</Label>
              <Input value={form.dressCode} onChange={(e) => update("dressCode", e.target.value)} placeholder="Smart casual" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Open-house BBQ. Meet active brothers, eat well…" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.isPrivate} onCheckedChange={(v) => update("isPrivate", !!v)} />
              Invite-only (won't show on public schedule)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={create} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add event
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
        <div className="flex-1 overflow-y-auto rounded-lg border border-border divide-y divide-border">
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
