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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IconSearch as Search, IconPlus as Plus, IconSpinner as Loader2, IconCalendar as CalendarDays, IconEvents as CalendarCheck, IconMembers as Users, IconChores as ClipboardCheck, IconPin as MapPin, IconAlert as AlertTriangle, IconCheckCircle as CheckCircle2, IconUserCheck as UserCheck, IconClock as Clock, IconXCircle as XCircle, IconTrash as Trash2, IconRefresh as RotateCw } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

// Allowed member statuses for the requiredFor multi-select (mirrors
// MEMBER_STATUSES on the server, but only the ones that can attend meetings).
const ATTEND_STATUSES = ["ACTIVE", "INITIATE", "PLEDGE"] as const;
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INITIATE: "Initiate",
  PLEDGE: "Pledge",
  PROSPECT: "Prospect",
  INACTIVE: "Inactive",
  ALUMNUS: "Alumnus",
  EXPELLED: "Expelled",
};

type AttendanceStatus = "present" | "absent" | "excused" | "tardy";

type Brother = {
  id: string;
  name: string;
  email: string | null;
  status: string;
};

type Meeting = {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  location: string | null;
  notes: string | null;
  status: string; // scheduled | in_progress | completed | canceled
  requiredFor: string[];
  attendanceCount: number;
};

type AttendanceRow = {
  id: string;
  meetingId: string;
  memberId: string;
  status: AttendanceStatus;
  checkedInAt: string | null;
  excuseReason: string | null;
  excuseApprovedById: string | null;
  notes: string | null;
  member: { id: string; name: string; email: string | null; status: string };
};

// Local draft for each roster row while taking attendance.
type RosterDraft = {
  memberId: string;
  name: string;
  status: AttendanceStatus;
  excuseReason: string | null;
  excuseApprovedById: string | null;
  notes: string | null;
  dirty: boolean;
};

function toLocalInputValue(iso: string): string {
  // Convert an ISO string to the value a <input type="datetime-local"> expects
  // (YYYY-MM-DDTHH:mm in local time).
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduledLocal(): string {
  // Next upcoming hour, local time.
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d.toISOString());
}

export function MeetingsClient({
  initialMeetings,
  brothers,
  canWrite,
}: {
  initialMeetings: Meeting[];
  brothers: Brother[];
  canWrite: boolean;
}) {
  const { push } = useToast();
  const [list, setList] = React.useState<Meeting[]>(initialMeetings);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const nowLocalString = React.useMemo(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  }, []);

  // ---- Create meeting dialog ----
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    title: "",
    scheduledAt: defaultScheduledLocal(),
    duration: 60,
    location: "",
    notes: "",
    requiredFor: ["ACTIVE", "INITIATE", "PLEDGE"] as string[],
  });

  // ---- Roster / attendance dialog ----
  const [rosterMeeting, setRosterMeeting] = React.useState<Meeting | null>(null);
  const [loadingRoster, setLoadingRoster] = React.useState(false);
  const [rosterError, setRosterError] = React.useState<string | null>(null);
  const [draftRows, setDraftRows] = React.useState<RosterDraft[]>([]);
  const [savingRoster, setSavingRoster] = React.useState(false);
  const [rowBusyId, setRowBusyId] = React.useState<string | null>(null);

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

  // ---------- Create ----------
  function openCreate() {
    setCreateForm({
      title: "",
      scheduledAt: defaultScheduledLocal(),
      duration: 60,
      location: "",
      notes: "",
      requiredFor: ["ACTIVE", "INITIATE", "PLEDGE"],
    });
    setCreateOpen(true);
  }

  function toggleRequiredFor(status: string) {
    setCreateForm((f) => {
      const has = f.requiredFor.includes(status);
      return {
        ...f,
        requiredFor: has ? f.requiredFor.filter((s) => s !== status) : [...f.requiredFor, status],
      };
    });
  }

  async function createMeeting() {
    if (!createForm.title.trim() || createForm.title.trim().length < 2) {
      push({ title: "Meeting title is required (min 2 characters)", variant: "destructive" });
      return;
    }
    const scheduledDate = new Date(createForm.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      push({ title: "Please choose a valid date & time", variant: "destructive" });
      return;
    }
    if (scheduledDate < new Date()) {
      const confirmSave = window.confirm("This meeting is in the past. Are you sure you want to schedule it?");
      if (!confirmSave) return;
    }
    setCreateBusy(true);
    try {
      const res = await fetch("/api/admin/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          scheduledAt: scheduledDate.toISOString(),
          duration: createForm.duration,
          location: createForm.location.trim() || null,
          notes: createForm.notes.trim() || null,
          requiredFor: createForm.requiredFor,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create meeting");
      const m = json.meeting;
      const created: Meeting = {
        id: m.id,
        title: m.title,
        scheduledAt: m.scheduledAt,
        duration: m.duration,
        location: m.location,
        notes: m.notes,
        status: m.status,
        requiredFor: Array.isArray(m.requiredFor) ? m.requiredFor : [],
        attendanceCount: 0,
      };
      setList((xs) => [created, ...xs].sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt)));
      push({ title: "Meeting scheduled", variant: "success" });
      setCreateOpen(false);
    } catch (err: any) {
      push({ title: err.message || "Failed to create meeting", variant: "destructive" });
    } finally {
      setCreateBusy(false);
    }
  }

  // ---------- Meeting status (cancel / reopen / complete) ----------
  async function patchMeetingStatus(meeting: Meeting, status: Meeting["status"]) {
    try {
      const res = await fetch(`/api/admin/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      setList((xs) => xs.map((x) => (x.id === meeting.id ? { ...x, status: json.meeting.status } : x)));
      if (rosterMeeting?.id === meeting.id) {
        setRosterMeeting((rm) => (rm ? { ...rm, status: json.meeting.status } : rm));
      }
      push({ title: `Meeting marked ${status.replace("_", " ")}`, variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Failed to update meeting", variant: "destructive" });
    }
  }

  async function deleteMeeting(meeting: Meeting) {
    const prev = list;
    setList((xs) => xs.filter((x) => x.id !== meeting.id));
    try {
      const res = await fetch(`/api/admin/meetings/${meeting.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      push({ title: "Meeting deleted", variant: "success" });
    } catch (err: any) {
      setList(prev);
      push({ title: err.message || "Delete failed", variant: "destructive" });
    }
  }

  // ---------- Roster ----------
  const buildDraft = React.useCallback(
    (rows: AttendanceRow[]): RosterDraft[] => {
      // Merge the eligible roster (all attend-status brothers) with any existing
      // attendance rows so the secretary always sees the full chapter, even
      // members who haven't been marked yet (default = absent).
      const byMember = new Map(rows.map((r) => [r.memberId, r]));
      const merged: RosterDraft[] = brothers.map((b) => {
        const existing = byMember.get(b.id);
        return {
          memberId: b.id,
          name: b.name,
          status: (existing?.status as AttendanceStatus) ?? "absent",
          excuseReason: existing?.excuseReason ?? null,
          excuseApprovedById: existing?.excuseApprovedById ?? null,
          notes: existing?.notes ?? null,
          dirty: false,
        };
      });
      // Include any attendance rows whose member is no longer in the eligible
      // roster (e.g. went alumni after being marked) so nothing is hidden.
      for (const r of rows) {
        if (!brothers.some((b) => b.id === r.memberId)) {
          merged.push({
            memberId: r.memberId,
            name: r.member?.name ?? r.memberId,
            status: r.status,
            excuseReason: r.excuseReason,
            excuseApprovedById: r.excuseApprovedById,
            notes: r.notes,
            dirty: false,
          });
        }
      }
      return merged.sort((a, b) => a.name.localeCompare(b.name));
    },
    [brothers]
  );

  const loadRoster = React.useCallback(
    async (meeting: Meeting) => {
      setLoadingRoster(true);
      setRosterError(null);
      try {
        const res = await fetch(`/api/admin/meetings/${meeting.id}`);
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load roster");
        const rows: AttendanceRow[] = json.meeting?.attendance ?? [];
        setDraftRows(buildDraft(rows));
        // Sync the latest meeting fields (status/count) from the detail payload.
        setRosterMeeting((rm) =>
          rm && rm.id === meeting.id
            ? { ...rm, status: json.meeting.status, attendanceCount: rows.length }
            : rm
        );
        setList((xs) =>
          xs.map((x) =>
            x.id === meeting.id
              ? { ...x, status: json.meeting.status, attendanceCount: rows.length }
              : x
          )
        );
      } catch (err: any) {
        setRosterError(err.message || "Failed to load roster");
        setDraftRows([]);
      } finally {
        setLoadingRoster(false);
      }
    },
    [buildDraft]
  );

  function openRoster(meeting: Meeting) {
    setRosterMeeting(meeting);
    setDraftRows([]);
    setRosterError(null);
    void loadRoster(meeting);
  }

  function setRowStatus(memberId: string, status: AttendanceStatus) {
    setDraftRows((rows) =>
      rows.map((r) =>
        r.memberId === memberId
          ? {
              ...r,
              status,
              // Clear excuse reason if no longer excused.
              excuseReason: status === "excused" ? r.excuseReason : null,
              dirty: true,
            }
          : r
      )
    );
  }

  function setRowExcuseReason(memberId: string, reason: string) {
    setDraftRows((rows) =>
      rows.map((r) => (r.memberId === memberId ? { ...r, excuseReason: reason, dirty: true } : r))
    );
  }

  function bulkSetAll(status: AttendanceStatus) {
    setDraftRows((rows) =>
      rows.map((r) => ({
        ...r,
        status,
        excuseReason: status === "excused" ? r.excuseReason : null,
        dirty: true,
      }))
    );
  }

  const dirtyCount = React.useMemo(() => draftRows.filter((r) => r.dirty).length, [draftRows]);

  async function saveRoster() {
    if (!rosterMeeting) return;
    const dirty = draftRows.filter((r) => r.dirty);
    if (dirty.length === 0) {
      push({ title: "No changes to save", variant: "default" });
      return;
    }
    setSavingRoster(true);
    try {
      const res = await fetch(`/api/admin/meetings/${rosterMeeting.id}/bulk-mark`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          marks: dirty.map((r) => ({
            memberId: r.memberId,
            status: r.status,
            excuseReason: r.status === "excused" ? r.excuseReason : null,
            notes: r.notes,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      push({ title: `Attendance saved for ${json.updated} member${json.updated === 1 ? "" : "s"}`, variant: "success" });
      // Reload to pick up canonical state (checkedInAt, counts) and clear dirty.
      await loadRoster(rosterMeeting);
    } catch (err: any) {
      push({ title: err.message || "Failed to save attendance", variant: "destructive" });
    } finally {
      setSavingRoster(false);
    }
  }

  // Single kiosk-style check-in (server decides present vs tardy).
  async function checkInMember(memberId: string) {
    if (!rosterMeeting) return;
    setRowBusyId(memberId);
    try {
      const res = await fetch(`/api/admin/meetings/${rosterMeeting.id}/check-in/${memberId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Check-in failed");
      const status = json.attendance?.status as AttendanceStatus;
      setDraftRows((rows) =>
        rows.map((r) => (r.memberId === memberId ? { ...r, status, dirty: false } : r))
      );
      push({ title: `Checked in (${status})`, variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Check-in failed", variant: "destructive" });
    } finally {
      setRowBusyId(null);
    }
  }

  // Excuse approval / denial.
  async function approveExcuse(memberId: string) {
    if (!rosterMeeting) return;
    setRowBusyId(memberId);
    try {
      const res = await fetch(`/api/admin/meetings/${rosterMeeting.id}/excuse/${memberId}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Approve failed");
      setDraftRows((rows) =>
        rows.map((r) =>
          r.memberId === memberId
            ? { ...r, status: "excused", excuseApprovedById: json.attendance?.excuseApprovedById ?? "approved", dirty: false }
            : r
        )
      );
      push({ title: "Excused absence approved", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Approve failed", variant: "destructive" });
    } finally {
      setRowBusyId(null);
    }
  }

  async function denyExcuse(memberId: string) {
    if (!rosterMeeting) return;
    setRowBusyId(memberId);
    try {
      const res = await fetch(`/api/admin/meetings/${rosterMeeting.id}/excuse/${memberId}/deny`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Deny failed");
      // Denial keeps status=absent and clears the excuse reason.
      setDraftRows((rows) =>
        rows.map((r) =>
          r.memberId === memberId ? { ...r, status: "absent", excuseReason: null, dirty: false } : r
        )
      );
      push({ title: "Excused absence denied", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Deny failed", variant: "destructive" });
    } finally {
      setRowBusyId(null);
    }
  }

  // ---------- Derived ----------
  const filtered = React.useMemo(() => {
    return list.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        (m.location || "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [list, query, statusFilter]);

  const stats = React.useMemo(() => {
    const total = list.length;
    const upcoming = list.filter(
      (m) => (m.status === "scheduled" || m.status === "in_progress") && +new Date(m.scheduledAt) >= Date.now() - 60 * 60 * 1000
    ).length;
    const completed = list.filter((m) => m.status === "completed").length;
    const canceled = list.filter((m) => m.status === "canceled").length;
    return { total, upcoming, completed, canceled };
  }, [list]);

  const rosterTally = React.useMemo(() => {
    const present = draftRows.filter((r) => r.status === "present").length;
    const tardy = draftRows.filter((r) => r.status === "tardy").length;
    const excused = draftRows.filter((r) => r.status === "excused").length;
    const absent = draftRows.filter((r) => r.status === "absent").length;
    const pendingExcuse = draftRows.filter((r) => r.status === "absent" && r.excuseReason).length;
    return { present, tardy, excused, absent, pendingExcuse, total: draftRows.length };
  }, [draftRows]);

  function getMeetingStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">In Progress</Badge>;
      case "canceled":
        return <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Canceled</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">Scheduled</Badge>;
    }
  }

  function getAttendanceBadge(status: AttendanceStatus) {
    switch (status) {
      case "present":
        return <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Present</Badge>;
      case "tardy":
        return <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">Tardy</Badge>;
      case "excused":
        return <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">Excused</Badge>;
      default:
        return <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Absent</Badge>;
    }
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <IconChip icon={CalendarCheck} tone="brand" size="lg" className="hidden sm:inline-flex" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Chapter Meetings &amp; Attendance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule chapter meetings, take roll, run check-ins, and approve excused absences.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Read-only Mode
            </span>
          )}
          {canWrite && (
            <Button onClick={openCreate} className="bg-phisig-red text-white hover:bg-phisig-red-dark">
              <Plus className="h-4 w-4 mr-1.5" /> New Meeting
            </Button>
          )}
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lift rounded-xl border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <CalendarDays className="h-3.5 w-3.5 text-phisig-red" /> Total Meetings
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.total}</div>
        </div>
        <div className="lift rounded-xl border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <Clock className="h-3.5 w-3.5 text-amber-500" /> Upcoming
          </div>
          <div className="text-2xl font-bold mt-0.5 text-amber-600">{stats.upcoming}</div>
        </div>
        <div className="lift rounded-xl border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
          </div>
          <div className="text-2xl font-bold mt-0.5 text-emerald-600">{stats.completed}</div>
        </div>
        <div className="lift rounded-xl border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <XCircle className="h-3.5 w-3.5 text-zinc-400" /> Canceled
          </div>
          <div className="text-2xl font-bold mt-0.5 text-zinc-500">{stats.canceled}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or location…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Meeting list — 4-state coverage */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12 bg-gradient-to-b from-muted/30 to-transparent border-dashed">
          <CardContent className="space-y-4">
            <div className="relative mx-auto w-fit">
              <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-2xl bg-[hsl(var(--primary)/0.18)] blur-2xl" />
              <IconChip icon={CalendarDays} tone="brand" size="lg" className="mx-auto" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold">No meetings found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {list.length === 0
                  ? "Schedule your first chapter meeting to start taking roll and tracking attendance."
                  : "No meetings match the current filters."}
              </p>
            </div>
            {canWrite && list.length === 0 && (
              <Button onClick={openCreate} className="mt-1">
                <Plus className="h-4 w-4 mr-1.5" /> Schedule First Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const when = new Date(m.scheduledAt);
            return (
              <Card key={m.id} className="lift border border-border/80 hover:border-phisig-red/20 transition">
                <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getMeetingStatusBadge(m.status)}
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {m.attendanceCount} marked
                      </span>
                      {m.requiredFor.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          Required: {m.requiredFor.map((s) => STATUS_LABELS[s] || s).join(", ")}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold leading-tight truncate pr-4">{m.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {when.toLocaleDateString()} at {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {m.duration} min
                      </span>
                      {m.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {m.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openRoster(m)}>
                      <ClipboardCheck className="h-4 w-4 mr-1.5" /> {canWrite ? "Take Attendance" : "View Roster"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------- Create Meeting Dialog ---------- */}
      <Dialog open={createOpen} onOpenChange={(o) => !createBusy && setCreateOpen(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Create a chapter meeting. Attendance can be taken once it&apos;s scheduled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mTitle">Title *</Label>
              <Input
                id="mTitle"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Sunday Chapter, Exec Meeting, Ritual Night…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mWhen">Date &amp; Time *</Label>
                <Input
                  id="mWhen"
                  type="datetime-local"
                  min={nowLocalString}
                  value={createForm.scheduledAt}
                  onChange={(e) => setCreateForm({ ...createForm, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mDuration">Duration (minutes)</Label>
                <Input
                  id="mDuration"
                  type="number"
                  min={1}
                  max={600}
                  value={createForm.duration}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, duration: Math.max(1, parseInt(e.target.value || "60", 10) || 60) })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mLocation">Location</Label>
              <Input
                id="mLocation"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                placeholder="Chapter house living room, Zoom…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mNotes">Notes</Label>
              <Textarea
                id="mNotes"
                rows={3}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Agenda, dress code, reminders…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Required For</Label>
              <div className="flex flex-wrap gap-3 pt-1">
                {ATTEND_STATUSES.map((s) => {
                  const checked = createForm.requiredFor.includes(s);
                  return (
                    <label
                      key={s}
                      htmlFor={`req-${s}`}
                      className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
                    >
                      <Checkbox
                        id={`req-${s}`}
                        checked={checked}
                        onCheckedChange={() => toggleRequiredFor(s)}
                      />
                      {STATUS_LABELS[s]}
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Member statuses expected to attend. Used for attendance reporting in the brother portal.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </Button>
            <Button onClick={createMeeting} disabled={createBusy} className="bg-phisig-red text-white hover:bg-phisig-red-dark">
              {createBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Roster / Attendance Dialog ---------- */}
      <Dialog open={!!rosterMeeting} onOpenChange={(o) => !savingRoster && !o && setRosterMeeting(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>Attendance</span>
              {rosterMeeting && getMeetingStatusBadge(rosterMeeting.status)}
            </DialogTitle>
            <DialogDescription>
              {rosterMeeting
                ? `${rosterMeeting.title} - ${new Date(rosterMeeting.scheduledAt).toLocaleString()}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {rosterMeeting && (
            <div className="space-y-4 py-2">
              {/* Roster tally */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border p-2.5 bg-card">
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Present</div>
                  <div className="text-lg font-bold text-emerald-600">{rosterTally.present}</div>
                </div>
                <div className="rounded-lg border p-2.5 bg-card">
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Tardy</div>
                  <div className="text-lg font-bold text-amber-600">{rosterTally.tardy}</div>
                </div>
                <div className="rounded-lg border p-2.5 bg-card">
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Excused</div>
                  <div className="text-lg font-bold text-blue-600">{rosterTally.excused}</div>
                </div>
                <div className="rounded-lg border p-2.5 bg-card">
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Absent</div>
                  <div className="text-lg font-bold text-zinc-500">{rosterTally.absent}</div>
                </div>
              </div>

              {/* Meeting-level controls */}
              {canWrite && !loadingRoster && !rosterError && (
                <div className="flex items-center gap-2 flex-wrap border rounded-lg p-2.5 bg-secondary/30">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground mr-1">Bulk set all:</span>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => bulkSetAll("present")}>
                    All Present
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => bulkSetAll("absent")}>
                    All Absent
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    {rosterMeeting.status !== "completed" && rosterMeeting.status !== "canceled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => patchMeetingStatus(rosterMeeting, "completed")}
                      >
                        Mark Completed
                      </Button>
                    )}
                    {rosterMeeting.status === "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => patchMeetingStatus(rosterMeeting, "scheduled")}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Roster body — 4-state */}
              {loadingRoster ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-phisig-red" /> Loading roster…
                </div>
              ) : rosterError ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <IconChip icon={AlertTriangle} tone="muted" size="lg" className="text-destructive ring-destructive/25 bg-gradient-to-br from-destructive/15 to-destructive/5" />
                  <p className="text-sm text-muted-foreground">{rosterError}</p>
                  <Button variant="outline" size="sm" onClick={() => loadRoster(rosterMeeting)}>
                    <RotateCw className="h-4 w-4 mr-1.5" /> Retry
                  </Button>
                </div>
              ) : draftRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <IconChip icon={Users} tone="muted" size="lg" />
                  <p className="text-sm text-muted-foreground">No eligible members to mark.</p>
                </div>
              ) : (
                <div className="border rounded-xl divide-y overflow-hidden">
                  {draftRows.map((r) => {
                    const isBusy = rowBusyId === r.memberId;
                    const pendingExcuse = r.status === "absent" && !!r.excuseReason;
                    return (
                      <div key={r.memberId} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{r.name}</p>
                            {r.dirty && <span className="h-1.5 w-1.5 rounded-full bg-phisig-red" title="Unsaved change" />}
                            {!canWrite && getAttendanceBadge(r.status)}
                          </div>
                          {(pendingExcuse || (r.status === "excused" && r.excuseReason)) && (
                            <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-2">
                              {r.status === "excused" ? "Approved excuse: " : "Excuse requested: "}
                              &ldquo;{r.excuseReason}&rdquo;
                            </p>
                          )}
                        </div>

                        {canWrite ? (
                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            <Select value={r.status} onValueChange={(v: AttendanceStatus) => setRowStatus(r.memberId, v)}>
                              <SelectTrigger className="h-8 w-[120px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="tardy">Tardy</SelectItem>
                                <SelectItem value="excused">Excused</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              disabled={isBusy}
                              onClick={() => checkInMember(r.memberId)}
                              title="Kiosk check-in (auto present/tardy by time)"
                            >
                              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </Button>
                            {pendingExcuse && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  disabled={isBusy}
                                  onClick={() => approveExcuse(r.memberId)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs text-destructive border-red-100 hover:bg-red-50"
                                  disabled={isBusy}
                                  onClick={() =>
                                    askConfirm({
                                      title: "Deny excused absence?",
                                      description: `Deny ${r.name}'s excuse request? Their absence will remain unexcused.`,
                                      confirmLabel: "Deny Excuse",
                                      destructive: true,
                                      onConfirm: () => denyExcuse(r.memberId),
                                    })
                                  }
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Deny
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="sm:ml-auto" />
                        )}

                        {/* Excuse reason input shows when admin marks Excused without an existing reason */}
                        {canWrite && r.status === "excused" && (
                          <Input
                            value={r.excuseReason || ""}
                            onChange={(e) => setRowExcuseReason(r.memberId, e.target.value)}
                            placeholder="Excuse reason (optional)"
                            className="h-8 text-xs w-full sm:w-56"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {canWrite && rosterMeeting && (
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-destructive sm:mr-auto"
                disabled={savingRoster || loadingRoster || rosterMeeting.attendanceCount > 0}
                title={
                  rosterMeeting.attendanceCount > 0
                    ? "Cannot delete a meeting with attendance. Cancel it instead."
                    : "Delete this meeting"
                }
                onClick={() =>
                  askConfirm({
                    title: "Delete meeting?",
                    description: `Permanently delete "${rosterMeeting.title}"? This cannot be undone.`,
                    confirmLabel: "Delete Meeting",
                    destructive: true,
                    onConfirm: async () => {
                      await deleteMeeting(rosterMeeting);
                      setRosterMeeting(null);
                    },
                  })
                }
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setRosterMeeting(null)} disabled={savingRoster}>
              Close
            </Button>
            {canWrite && rosterMeeting && !rosterError && (
              <Button
                onClick={saveRoster}
                disabled={savingRoster || loadingRoster || dirtyCount === 0}
                className="bg-phisig-red text-white hover:bg-phisig-red-dark"
              >
                {savingRoster && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Save Attendance{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  : "bg-phisig-red text-white hover:bg-phisig-red-dark"
              )}
            >
              {confirmBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {confirmState?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
