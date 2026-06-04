"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import { useToast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Loader2, CheckCircle2, XCircle, HeartHandshake,
  Calendar, Building2, ExternalLink, User, Hourglass,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HourLog = {
  id: string;
  memberId: string;
  serviceEventId: string | null;
  description: string;
  hoursLogged: number;
  performedAt: string;
  status: string; // submitted | approved | rejected
  rejectionReason: string | null;
  createdAt: string;
  member: { id: string; name: string; status: string } | null;
  serviceEvent: { id: string; title: string; partnerOrg: string | null } | null;
};

type ServiceEvent = {
  id: string;
  title: string;
  description: string | null;
  partnerOrg: string | null;
  partnerUrl: string | null;
  eventDate: string;
  hoursPerSlot: number | null;
  status: string; // proposed | approved | completed | canceled
  hoursCount: number;
};

type PartnerOrg = {
  id: string;
  name: string;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  active: boolean;
};

const EMPTY_EVENT_FORM = {
  title: "",
  description: "",
  partnerOrg: "",
  partnerUrl: "",
  eventDate: "",
  hoursPerSlot: "",
  status: "proposed" as ServiceEvent["status"],
};

const EMPTY_PARTNER_FORM = {
  name: "",
  website: "",
  contactEmail: "",
  contactPhone: "",
  description: "",
  active: true,
};

export function ServiceClient({
  initialHours,
  initialEvents,
  initialPartners,
  canWrite,
}: {
  initialHours: HourLog[];
  initialEvents: ServiceEvent[];
  initialPartners: PartnerOrg[];
  canWrite: boolean;
}) {
  const { push } = useToast();
  const [activeTab, setActiveTab] = React.useState<"queue" | "events" | "partners">("queue");

  // ── Approval queue state ──────────────────────────────────────────────
  const [hours, setHours] = React.useState<HourLog[]>(initialHours);
  const [statusFilter, setStatusFilter] = React.useState<"submitted" | "approved" | "rejected">("submitted");
  const [query, setQuery] = React.useState("");
  const [loadingHours, setLoadingHours] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Reject dialog
  const [rejecting, setRejecting] = React.useState<HourLog | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectBusy, setRejectBusy] = React.useState(false);

  // ── Events state ──────────────────────────────────────────────────────
  const [events, setEvents] = React.useState<ServiceEvent[]>(initialEvents);
  const [eventDialogOpen, setEventDialogOpen] = React.useState(false);
  const [eventForm, setEventForm] = React.useState(EMPTY_EVENT_FORM);
  const [eventBusy, setEventBusy] = React.useState(false);

  // ── Partners state ────────────────────────────────────────────────────
  const [partners, setPartners] = React.useState<PartnerOrg[]>(initialPartners);
  const [partnerDialogOpen, setPartnerDialogOpen] = React.useState(false);
  const [partnerForm, setPartnerForm] = React.useState(EMPTY_PARTNER_FORM);
  const [partnerBusy, setPartnerBusy] = React.useState(false);

  // Fetch hours for a given status filter from the queue API.
  const fetchHours = React.useCallback(async (status: string) => {
    setLoadingHours(true);
    try {
      const res = await fetch(`/api/admin/service/hours?status=${status}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.hours)) {
        // Normalize Decimal → number for consistent rendering.
        setHours(json.hours.map((h: any) => ({ ...h, hoursLogged: Number(h.hoursLogged) })));
      } else {
        setHours([]);
      }
    } catch {
      setHours([]);
      push({ title: "Failed to load service hours", variant: "destructive" });
    } finally {
      setLoadingHours(false);
    }
  }, [push]);

  function changeStatusFilter(next: "submitted" | "approved" | "rejected") {
    setStatusFilter(next);
    fetchHours(next);
  }

  // Approve a submission.
  async function approve(id: string) {
    if (!canWrite) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/service/hours/${id}/approve`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Approve failed");
      // Drop from list when viewing the pending queue, else update in place.
      if (statusFilter === "submitted") {
        setHours((xs) => xs.filter((x) => x.id !== id));
      } else {
        setHours((xs) => xs.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
      }
      push({ title: "Service hours approved", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Approve failed", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  // Open reject dialog.
  function openReject(log: HourLog) {
    if (!canWrite) return;
    setRejecting(log);
    setRejectReason("");
  }

  // Submit rejection with reason.
  async function submitReject() {
    if (!rejecting) return;
    if (rejectReason.trim().length < 2) {
      push({ title: "A rejection reason is required", variant: "destructive" });
      return;
    }
    setRejectBusy(true);
    try {
      const res = await fetch(`/api/admin/service/hours/${rejecting.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Reject failed");
      if (statusFilter === "submitted") {
        setHours((xs) => xs.filter((x) => x.id !== rejecting.id));
      } else {
        setHours((xs) => xs.map((x) => (x.id === rejecting.id ? { ...x, status: "rejected", rejectionReason: rejectReason.trim() } : x)));
      }
      push({ title: "Service hours rejected", variant: "success" });
      setRejecting(null);
    } catch (err: any) {
      push({ title: err.message || "Reject failed", variant: "destructive" });
    } finally {
      setRejectBusy(false);
    }
  }

  // ── Events ────────────────────────────────────────────────────────────
  function openAddEvent() {
    setEventForm(EMPTY_EVENT_FORM);
    setEventDialogOpen(true);
  }

  async function saveEvent() {
    if (!eventForm.title.trim()) {
      push({ title: "Event title is required", variant: "destructive" });
      return;
    }
    if (!eventForm.eventDate) {
      push({ title: "Event date is required", variant: "destructive" });
      return;
    }
    setEventBusy(true);
    try {
      const payload: any = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        partnerOrg: eventForm.partnerOrg.trim() || null,
        partnerUrl: eventForm.partnerUrl.trim() || null,
        eventDate: eventForm.eventDate,
        status: eventForm.status,
      };
      if (eventForm.hoursPerSlot.trim() !== "") {
        payload.hoursPerSlot = Number(eventForm.hoursPerSlot);
      }
      const res = await fetch("/api/admin/service/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not save event");
      const created: ServiceEvent = {
        ...json.event,
        eventDate: new Date(json.event.eventDate).toISOString(),
        hoursPerSlot: json.event.hoursPerSlot == null ? null : Number(json.event.hoursPerSlot),
        hoursCount: 0,
      };
      setEvents((xs) => [created, ...xs]);
      push({ title: "Service event created", variant: "success" });
      setEventDialogOpen(false);
    } catch (err: any) {
      push({ title: err.message || "Could not save event", variant: "destructive" });
    } finally {
      setEventBusy(false);
    }
  }

  // ── Partners ──────────────────────────────────────────────────────────
  function openAddPartner() {
    setPartnerForm(EMPTY_PARTNER_FORM);
    setPartnerDialogOpen(true);
  }

  async function savePartner() {
    if (!partnerForm.name.trim()) {
      push({ title: "Partner name is required", variant: "destructive" });
      return;
    }
    setPartnerBusy(true);
    try {
      const payload: any = {
        name: partnerForm.name.trim(),
        website: partnerForm.website.trim() || null,
        contactEmail: partnerForm.contactEmail.trim() || null,
        contactPhone: partnerForm.contactPhone.trim() || null,
        description: partnerForm.description.trim() || null,
        active: partnerForm.active,
      };
      const res = await fetch("/api/admin/service/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not save partner");
      setPartners((xs) =>
        [...xs, json.partner as PartnerOrg].sort(
          (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)
        )
      );
      push({ title: "Partner organization added", variant: "success" });
      setPartnerDialogOpen(false);
    } catch (err: any) {
      push({ title: err.message || "Could not save partner", variant: "destructive" });
    } finally {
      setPartnerBusy(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────
  const filteredHours = React.useMemo(() => {
    const q = query.toLowerCase();
    return hours.filter((h) => {
      if (!q) return true;
      return (
        (h.member?.name || "").toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        (h.serviceEvent?.title || "").toLowerCase().includes(q)
      );
    });
  }, [hours, query]);

  const queueStats = React.useMemo(() => {
    const totalHours = hours.reduce((s, h) => s + Number(h.hoursLogged), 0);
    const members = new Set(hours.map((h) => h.memberId)).size;
    return { count: hours.length, totalHours, members };
  }, [hours]);

  function getEventStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Approved</Badge>;
      case "completed":
        return <Badge className="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">Completed</Badge>;
      case "canceled":
        return <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Canceled</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">Proposed</Badge>;
    }
  }

  function getHourStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">Pending</Badge>;
    }
  }

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <IconChip icon={HeartHandshake} tone="brand" size="lg" className="hidden sm:inline-flex" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Philanthropy &amp; Service</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review member service-hour submissions, manage service events, and maintain partner organizations.
            </p>
          </div>
        </div>
        {!canWrite && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only Mode
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab("queue")}
          className={cn(
            "pb-3 px-4 text-sm font-semibold border-b-2 -mb-[2px] transition whitespace-nowrap",
            activeTab === "queue"
              ? "border-phisig-red text-phisig-red"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Approval Queue
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={cn(
            "pb-3 px-4 text-sm font-semibold border-b-2 -mb-[2px] transition whitespace-nowrap",
            activeTab === "events"
              ? "border-phisig-red text-phisig-red"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Service Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("partners")}
          className={cn(
            "pb-3 px-4 text-sm font-semibold border-b-2 -mb-[2px] transition whitespace-nowrap",
            activeTab === "partners"
              ? "border-phisig-red text-phisig-red"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Partner Orgs ({partners.length})
        </button>
      </div>

      {/* ── APPROVAL QUEUE TAB ── */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border p-3 bg-card">
              <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                {statusFilter === "submitted" ? "Pending Reviews" : statusFilter === "approved" ? "Approved Logs" : "Rejected Logs"}
              </div>
              <div className="text-2xl font-bold mt-0.5">{queueStats.count}</div>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Hours</div>
              <div className="text-2xl font-bold mt-0.5 text-phisig-red">{queueStats.totalHours.toFixed(1)}</div>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <div className="text-[10px] uppercase text-muted-foreground font-semibold">Members</div>
              <div className="text-2xl font-bold mt-0.5">{queueStats.members}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search member, event, description…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => changeStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          {loadingHours ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-phisig-red" />
            </div>
          ) : filteredHours.length === 0 ? (
            <Card className="text-center py-12 border-dashed bg-muted/20">
              <CardContent className="space-y-3">
                <IconChip icon={HeartHandshake} tone="muted" size="lg" className="mx-auto" />
                <h3 className="text-lg font-semibold">
                  {statusFilter === "submitted" ? "Queue is clear" : "No records"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {statusFilter === "submitted"
                    ? "There are no service-hour submissions waiting for review."
                    : `No ${statusFilter} service-hour logs to show.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredHours.map((h) => {
                const isBusy = busyId === h.id;
                return (
                  <Card key={h.id} className="border border-border/80">
                    <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-semibold text-sm">{h.member?.name || "Unknown member"}</span>
                          <Badge className="bg-phisig-red/10 text-phisig-red border-none font-semibold">
                            {Number(h.hoursLogged).toFixed(1)} hrs
                          </Badge>
                          {getHourStatusBadge(h.status)}
                        </div>
                        <p className="text-sm text-foreground/90">{h.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(h.performedAt).toLocaleDateString()}
                          </span>
                          {h.serviceEvent && (
                            <span className="inline-flex items-center gap-1">
                              <HeartHandshake className="h-3 w-3" />
                              {h.serviceEvent.title}
                            </span>
                          )}
                          {h.serviceEvent?.partnerOrg && (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {h.serviceEvent.partnerOrg}
                            </span>
                          )}
                        </div>
                        {h.status === "rejected" && h.rejectionReason && (
                          <p className="text-xs text-red-600 italic mt-1">
                            Rejection reason: {h.rejectionReason}
                          </p>
                        )}
                      </div>

                      {canWrite && h.status === "submitted" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            disabled={isBusy}
                            onClick={() => approve(h.id)}
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            disabled={isBusy}
                            onClick={() => openReject(h)}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── EVENTS TAB ── */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Service Events</h2>
            {canWrite && (
              <Button onClick={openAddEvent}>
                <Plus className="h-4 w-4 mr-1.5" /> New Event
              </Button>
            )}
          </div>

          {events.length === 0 ? (
            <Card className="text-center py-12 border-dashed bg-muted/20">
              <CardContent className="space-y-3">
                <IconChip icon={Calendar} tone="muted" size="lg" className="mx-auto" />
                <h3 className="text-lg font-semibold">No Service Events</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Create your first service event so members can log hours against it.
                </p>
                {canWrite && (
                  <Button onClick={openAddEvent} className="mt-2">
                    <Plus className="h-4 w-4 mr-1.5" /> New Event
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((e) => (
                <Card key={e.id} className={cn("overflow-hidden border-border/80", e.status === "canceled" && "opacity-60")}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-tight">{e.title}</h3>
                      <div className="shrink-0">{getEventStatusBadge(e.status)}</div>
                    </div>
                    {e.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{e.description}</p>
                    )}
                    <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-3">
                      <p className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(e.eventDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                      {e.partnerOrg && (
                        <p className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {e.partnerUrl ? (
                            <a href={e.partnerUrl} target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline inline-flex items-center gap-1">
                              {e.partnerOrg} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            e.partnerOrg
                          )}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        {e.hoursPerSlot != null && (
                          <span className="inline-flex items-center gap-1">
                            <Hourglass className="h-3.5 w-3.5" /> {e.hoursPerSlot} hrs/slot
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {e.hoursCount} logs
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PARTNERS TAB ── */}
      {activeTab === "partners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Partner Organizations</h2>
            {canWrite && (
              <Button onClick={openAddPartner}>
                <Plus className="h-4 w-4 mr-1.5" /> New Partner
              </Button>
            )}
          </div>

          {partners.length === 0 ? (
            <Card className="text-center py-12 border-dashed bg-muted/20">
              <CardContent className="space-y-3">
                <IconChip icon={Building2} tone="muted" size="lg" className="mx-auto" />
                <h3 className="text-lg font-semibold">No Partner Organizations</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Add the nonprofits and community partners your chapter volunteers with.
                </p>
                {canWrite && (
                  <Button onClick={openAddPartner} className="mt-2">
                    <Plus className="h-4 w-4 mr-1.5" /> New Partner
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map((p) => (
                <Card key={p.id} className={cn("overflow-hidden border-border/80", !p.active && "opacity-60")}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-tight">{p.name}</h3>
                      {!p.active && <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 shrink-0">Inactive</Badge>}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{p.description}</p>
                    )}
                    <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-3">
                      {p.website && (
                        <p className="inline-flex items-center gap-1.5 truncate">
                          <ExternalLink className="h-3.5 w-3.5 text-phisig-red shrink-0" />
                          <a href={p.website} target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline truncate">
                            {p.website.replace(/^https?:\/\//, "")}
                          </a>
                        </p>
                      )}
                      {p.contactEmail && (
                        <p className="truncate">
                          <a href={`mailto:${p.contactEmail}`} className="hover:underline">{p.contactEmail}</a>
                        </p>
                      )}
                      {p.contactPhone && <p>{p.contactPhone}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Service Hours</DialogTitle>
          </DialogHeader>
          {rejecting && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-secondary/40 p-3 text-sm">
                <p className="font-semibold">{rejecting.member?.name || "Unknown member"}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {Number(rejecting.hoursLogged).toFixed(1)} hrs &mdash; {rejecting.description}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rejectReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectReason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this submission is being rejected (e.g. event not eligible, hours unverified)."
                />
                <p className="text-xs text-muted-foreground">The member will see this reason.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={rejectBusy}>Cancel</Button>
            <Button
              onClick={submitReject}
              disabled={rejectBusy}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {rejectBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Reject Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Create Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Service Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="evtTitle">Event Title *</Label>
              <Input
                id="evtTitle"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Beach cleanup, Soup kitchen shift…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evtDesc">Description</Label>
              <Textarea
                id="evtDesc"
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Details, meeting point, what to bring…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evtDate">Event Date *</Label>
                <Input
                  id="evtDate"
                  type="date"
                  value={eventForm.eventDate}
                  onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evtHours">Hours per Slot</Label>
                <Input
                  id="evtHours"
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={eventForm.hoursPerSlot}
                  onChange={(e) => setEventForm({ ...eventForm, hoursPerSlot: e.target.value })}
                  placeholder="e.g. 3"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evtPartner">Partner Org</Label>
                <Input
                  id="evtPartner"
                  value={eventForm.partnerOrg}
                  onChange={(e) => setEventForm({ ...eventForm, partnerOrg: e.target.value })}
                  placeholder="Habitat for Humanity"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evtStatus">Status</Label>
                <Select value={eventForm.status} onValueChange={(v) => setEventForm({ ...eventForm, status: v as ServiceEvent["status"] })}>
                  <SelectTrigger id="evtStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposed">Proposed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evtUrl">Partner URL</Label>
              <Input
                id="evtUrl"
                type="url"
                value={eventForm.partnerUrl}
                onChange={(e) => setEventForm({ ...eventForm, partnerUrl: e.target.value })}
                placeholder="https://partner.org"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)} disabled={eventBusy}>Cancel</Button>
            <Button onClick={saveEvent} disabled={eventBusy}>
              {eventBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner Create Dialog */}
      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Partner Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prtName">Organization Name *</Label>
              <Input
                id="prtName"
                value={partnerForm.name}
                onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                placeholder="Local Food Bank"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prtDesc">Description</Label>
              <Textarea
                id="prtDesc"
                rows={3}
                value={partnerForm.description}
                onChange={(e) => setPartnerForm({ ...partnerForm, description: e.target.value })}
                placeholder="What this organization does and how the chapter partners with them."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prtEmail">Contact Email</Label>
                <Input
                  id="prtEmail"
                  type="email"
                  value={partnerForm.contactEmail}
                  onChange={(e) => setPartnerForm({ ...partnerForm, contactEmail: e.target.value })}
                  placeholder="contact@partner.org"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prtPhone">Contact Phone</Label>
                <Input
                  id="prtPhone"
                  value={partnerForm.contactPhone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, contactPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prtUrl">Website</Label>
              <Input
                id="prtUrl"
                type="url"
                value={partnerForm.website}
                onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })}
                placeholder="https://partner.org"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="prtActive"
                className="rounded border"
                checked={partnerForm.active}
                onChange={(e) => setPartnerForm({ ...partnerForm, active: e.target.checked })}
              />
              <Label htmlFor="prtActive" className="cursor-pointer">Active partner</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialogOpen(false)} disabled={partnerBusy}>Cancel</Button>
            <Button onClick={savePartner} disabled={partnerBusy}>
              {partnerBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Add Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
