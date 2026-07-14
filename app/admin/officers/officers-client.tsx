"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { IconShieldCheck as ShieldCheck, IconSpinner as Loader2, IconEdit as Pencil, IconUserPlus as UserPlus, IconTrash as Trash2, IconRefresh as RotateCcw, IconCrown as Crown, IconMembers as Users, IconBriefcase as Briefcase, IconAlert as AlertTriangle } from "@/components/brand/icons";
import {
  type DomainKey,
  type DomainAccess,
  type OfficerPermissions,
  parsePermissions,
  stringifyPermissions,
} from "@/lib/officer-permissions";
import { cn } from "@/lib/utils";

import { IconSpark } from "@/components/brand/icons";
// ── Types (mirror the serialised shapes the server page hands us) ────────────

type Position = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  permissions: string; // JSON string
  sortOrder: number;
  active: boolean;
};

type Assignment = {
  id: string;
  positionId: string;
  brotherId: string;
  termCode: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  position: { id: string; title: string; slug: string; active: boolean };
  brother: { id: string; name: string; email: string | null };
};

type Brother = { id: string; name: string };

// ── Domain catalog (label + helper text for every DomainKey) ─────────────────
// Display-only metadata. The canonical list of domains lives in
// lib/officer-permissions.ts (DomainKey); this array must stay in sync with it.

const DOMAINS: Array<{ key: DomainKey; label: string; hint: string }> = [
  { key: "rushPipeline", label: "Rush Pipeline", hint: "PNM intake, votes, bid extension" },
  { key: "brothers", label: "Brothers", hint: "Member roster + profiles" },
  { key: "events", label: "Events", hint: "Calendar + RSVPs" },
  // #11 — elections is a real DomainKey but was missing from this editor, so
  // admins couldn't grant/revoke it and the access summary misreported the role.
  { key: "elections", label: "Elections", hint: "Ballots, candidates, seating winners" },
  { key: "announcements", label: "Announcements", hint: "Chapter news posts" },
  { key: "dues", label: "Dues", hint: "Member dues ledger" },
  { key: "academic", label: "Academic", hint: "Academic standing + study hours" },
  { key: "house", label: "House", hint: "Rooms, chores, maintenance" },
  { key: "risk", label: "Risk", hint: "Incident reports + FIPG reviews" },
  { key: "service", label: "Service", hint: "Philanthropy + service hours" },
  { key: "alumni", label: "Alumni", hint: "Alumni network + donations" },
  { key: "documents", label: "Documents", hint: "Shared document library" },
  { key: "siteSettings", label: "Site Settings", hint: "Public homepage content" },
  { key: "payments", label: "Payments", hint: "Stripe + payment links" },
];

const ACCESS_VALUES: DomainAccess[] = ["none", "read", "write"];

function accessLabel(a: DomainAccess) {
  if (a === "write") return "Read & write";
  if (a === "read") return "Read only";
  return "No access";
}

export function OfficersClient({
  initialPositions,
  initialAssignments,
  brothers,
}: {
  initialPositions: Position[];
  initialAssignments: Assignment[];
  brothers: Brother[];
}) {
  const { push } = useToast();
  const [positions, setPositions] = React.useState<Position[]>(initialPositions);
  const [assignments, setAssignments] = React.useState<Assignment[]>(initialAssignments);
  const [seeding, setSeeding] = React.useState(false);

  // ── Permission editor dialog state ─────────────────────────────────────────
  const [editPosition, setEditPosition] = React.useState<Position | null>(null);
  const [draftPerms, setDraftPerms] = React.useState<OfficerPermissions | null>(null);
  const [savingPerms, setSavingPerms] = React.useState(false);

  // ── Assign-brother dialog state ────────────────────────────────────────────
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignPositionId, setAssignPositionId] = React.useState("");
  const [assignBrotherId, setAssignBrotherId] = React.useState("");
  const [assignTerm, setAssignTerm] = React.useState(defaultTermCode());
  const [assignStart, setAssignStart] = React.useState(todayIso());
  const [assignEnd, setAssignEnd] = React.useState("");
  const [assignNotes, setAssignNotes] = React.useState("");
  const [savingAssign, setSavingAssign] = React.useState(false);

  // ── Revoke-confirm dialog state ────────────────────────────────────────────
  const [revokeTarget, setRevokeTarget] = React.useState<Assignment | null>(null);
  const [revoking, setRevoking] = React.useState(false);

  const activePositions = React.useMemo(() => positions.filter((p) => p.active), [positions]);

  const stats = React.useMemo(() => {
    const now = Date.now();
    const current = assignments.filter(
      (a) => a.position.active && (!a.endDate || new Date(a.endDate).getTime() > now),
    );
    const distinctBrothers = new Set(current.map((a) => a.brotherId)).size;
    return {
      positions: activePositions.length,
      currentAssignments: current.length,
      officers: distinctBrothers,
    };
  }, [assignments, activePositions]);

  // Quick lookup of position title by id for the assignments table.
  const positionById = React.useMemo(() => {
    const m = new Map<string, Position>();
    for (const p of positions) m.set(p.id, p);
    return m;
  }, [positions]);

  // ── Seed default catalog ───────────────────────────────────────────────────
  async function seedDefaults() {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/officer-positions/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Seeding failed");
      // Re-fetch positions so the table reflects the seeded catalog.
      const listRes = await fetch("/api/admin/officer-positions");
      const listJson = await listRes.json();
      if (listRes.ok && Array.isArray(listJson.positions)) {
        setPositions(listJson.positions);
      }
      push({
        title: "Default positions ready",
        description: `${json.created} created, ${json.updated} refreshed (${json.total} total).`,
        variant: "success",
      });
    } catch (err: any) {
      push({ title: err.message || "Could not seed positions", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }

  // ── Open / edit permission matrix ──────────────────────────────────────────
  function openEditor(position: Position) {
    setEditPosition(position);
    setDraftPerms(parsePermissions(position.permissions));
  }

  function setDomainAccess(domain: DomainKey, value: DomainAccess) {
    setDraftPerms((prev) => {
      if (!prev) return prev;
      const nextDomain = { ...prev.domain };
      if (value === "none") delete nextDomain[domain];
      else nextDomain[domain] = value;
      return { ...prev, domain: nextDomain };
    });
  }

  function setSuperAdmin(on: boolean) {
    setDraftPerms((prev) => (prev ? { ...prev, superAdmin: on } : prev));
  }

  async function savePermissions() {
    if (!editPosition || !draftPerms) return;
    setSavingPerms(true);
    try {
      const res = await fetch("/api/admin/officer-positions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editPosition.id,
          permissions: stringifyPermissions(draftPerms),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      setPositions((xs) => xs.map((p) => (p.id === editPosition.id ? json.position : p)));
      push({ title: `${editPosition.title} permissions saved`, variant: "success" });
      setEditPosition(null);
      setDraftPerms(null);
    } catch (err: any) {
      push({ title: err.message || "Failed to save permissions", variant: "destructive" });
    } finally {
      setSavingPerms(false);
    }
  }

  async function resetToDefaults() {
    if (!editPosition) return;
    setSavingPerms(true);
    try {
      const res = await fetch("/api/admin/officer-positions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editPosition.id, resetDefaults: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Reset failed");
      setPositions((xs) => xs.map((p) => (p.id === editPosition.id ? json.position : p)));
      // Refresh the open draft so the matrix shows the restored defaults.
      setDraftPerms(parsePermissions(json.position.permissions));
      push({ title: `${editPosition.title} reset to default permissions`, variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Failed to reset permissions", variant: "destructive" });
    } finally {
      setSavingPerms(false);
    }
  }

  // ── Assign a brother ───────────────────────────────────────────────────────
  function openAssign() {
    setAssignPositionId(activePositions[0]?.id ?? "");
    setAssignBrotherId("");
    setAssignTerm(defaultTermCode());
    setAssignStart(todayIso());
    setAssignEnd("");
    setAssignNotes("");
    setAssignOpen(true);
  }

  async function submitAssign() {
    if (!assignPositionId || !assignBrotherId) {
      push({ title: "Pick both a position and a brother", variant: "destructive" });
      return;
    }
    if (!assignTerm.trim() || !assignStart) {
      push({ title: "Term code and start date are required", variant: "destructive" });
      return;
    }
    setSavingAssign(true);
    try {
      const res = await fetch("/api/admin/officers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          positionId: assignPositionId,
          brotherId: assignBrotherId,
          termCode: assignTerm.trim(),
          startDate: assignStart,
          endDate: assignEnd || "",
          notes: assignNotes || "",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Assignment failed");

      // The POST response includes a trimmed position/brother; hydrate a full
      // Assignment row from local state so the new row renders consistently.
      const pos = positionById.get(assignPositionId);
      const bro = brothers.find((b) => b.id === assignBrotherId);
      const created: Assignment = {
        id: json.assignment.id,
        positionId: assignPositionId,
        brotherId: assignBrotherId,
        termCode: assignTerm.trim(),
        startDate: new Date(assignStart).toISOString(),
        endDate: assignEnd ? new Date(assignEnd).toISOString() : null,
        notes: assignNotes || null,
        position: {
          id: assignPositionId,
          title: pos?.title ?? "Position",
          slug: pos?.slug ?? "",
          active: pos?.active ?? true,
        },
        brother: { id: assignBrotherId, name: bro?.name ?? "Brother", email: null },
      };
      setAssignments((xs) => [created, ...xs]);
      push({
        title: `${bro?.name ?? "Brother"} assigned to ${pos?.title ?? "position"}`,
        variant: "success",
      });
      setAssignOpen(false);
    } catch (err: any) {
      push({ title: err.message || "Failed to assign officer", variant: "destructive" });
    } finally {
      setSavingAssign(false);
    }
  }

  // ── Revoke an assignment ───────────────────────────────────────────────────
  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/admin/officers", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: revokeTarget.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Revoke failed");
      setAssignments((xs) => xs.filter((a) => a.id !== revokeTarget.id));
      push({
        title: `${revokeTarget.brother.name} removed from ${revokeTarget.position.title}`,
        variant: "success",
      });
      setRevokeTarget(null);
    } catch (err: any) {
      push({ title: err.message || "Failed to revoke assignment", variant: "destructive" });
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <IconChip icon={ShieldCheck} tone="brand" size="lg" className="hidden sm:inline-flex" />
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-brand-red">
              <ShieldCheck className="h-3 w-3" /> Roles &amp; permissions
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Officer permissions</h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
              Define what each officer position can see and change, then assign brothers to those
              positions for a term. Permissions take effect immediately the next time the brother
              loads an admin page.
            </p>
          </div>
        </div>
        <Button onClick={openAssign} disabled={activePositions.length === 0}>
          <UserPlus className="h-4 w-4" /> Assign a brother
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="lift rounded-xl border p-4 bg-card">
          <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground font-semibold">
            <Briefcase className="h-3.5 w-3.5 text-brand-red" /> Active positions
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.positions}</div>
        </div>
        <div className="lift rounded-xl border p-4 bg-card">
          <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground font-semibold">
            <Users className="h-3.5 w-3.5 text-brand-red" /> Officers serving
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.officers}</div>
        </div>
        <div className="lift rounded-xl border p-4 bg-card">
          <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-red" /> Current terms
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.currentAssignments}</div>
        </div>
      </div>

      {/* ── Officer Positions ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Officer positions</h2>
            <p className="text-sm text-muted-foreground">
              Each position carries a per-domain permission set. Click <strong>Edit</strong> to
              adjust what it can access.
            </p>
          </div>
          {positions.length > 0 && (
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Sync default catalog
            </Button>
          )}
        </div>

        {positions.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <IconChip icon={IconSpark} tone="brand" size="lg" />
              <div className="space-y-1.5">
                <p className="text-base font-semibold">No officer positions yet</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Seed the standard chapter positions (President, Treasurer, Recruitment
                  Chair, …) with sensible default permissions. You can rename, add, or fine-tune
                  any of them afterward.
                </p>
              </div>
              <Button onClick={seedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconSpark className="h-4 w-4" />}
                Seed default positions
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead className="hidden md:table-cell">Access summary</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[90px] text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((p) => {
                    const perms = parsePermissions(p.permissions);
                    return (
                      <TableRow key={p.id} className={cn(!p.active && "opacity-60")}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {perms.superAdmin && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            <span className="font-medium">{p.title}</span>
                          </div>
                          {p.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{p.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <AccessSummary perms={perms} />
                        </TableCell>
                        <TableCell>
                          {p.active ? (
                            <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Active</Badge>
                          ) : (
                            <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEditor(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:ml-1.5">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Officer Assignments ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Assignments</h2>
            <p className="text-sm text-muted-foreground">
              Which brother holds which position, and for which term.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={openAssign} disabled={activePositions.length === 0}>
            <UserPlus className="h-4 w-4" /> Assign a brother
          </Button>
        </div>

        {assignments.length === 0 ? (
          <Card className="border-dashed bg-gradient-to-b from-muted/30 to-transparent">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="relative">
                <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-2xl bg-[hsl(var(--primary)/0.18)] blur-2xl" />
                <IconChip icon={Users} tone="brand" size="lg" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold">No officers assigned yet</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {activePositions.length === 0
                    ? "Seed positions above first, then assign brothers to them."
                    : "Assign a brother to grant them an officer role and its permissions for the term."}
                </p>
              </div>
              {activePositions.length > 0 && (
                <Button onClick={openAssign}>
                  <UserPlus className="h-4 w-4" /> Assign a brother
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brother</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="hidden sm:table-cell">Term</TableHead>
                    <TableHead className="hidden lg:table-cell">Dates</TableHead>
                    <TableHead className="w-[90px] text-right">Revoke</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const isCurrent = !a.endDate || new Date(a.endDate).getTime() > Date.now();
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.brother.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{a.position.title}</span>
                            {!isCurrent && (
                              <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Ended</Badge>
                            )}
                            {!a.position.active && (
                              <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">Position inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="font-mono text-xs px-2 py-0.5 bg-secondary rounded">{a.termCode}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(a.startDate).toLocaleDateString()}
                          {a.endDate ? ` - ${new Date(a.endDate).toLocaleDateString()}` : " - present"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevokeTarget(a)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Revoke {a.brother.name} from {a.position.title}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Permission editor dialog ───────────────────────────────────────── */}
      <Dialog
        open={!!editPosition}
        onOpenChange={(o) => {
          if (!o && !savingPerms) {
            setEditPosition(null);
            setDraftPerms(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-red" />
              Edit permissions{editPosition ? ` - ${editPosition.title}` : ""}
            </DialogTitle>
            <DialogDescription>
              Set the access level for each domain. “Read &amp; write” lets the officer change data;
              “Read only” is view-only; “No access” hides the section.
            </DialogDescription>
          </DialogHeader>

          {draftPerms && (
            <div className="space-y-5 py-1">
              {/* Super-admin toggle */}
              <label
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                  draftPerms.superAdmin
                    ? "border-amber-300 bg-amber-50/60"
                    : "border-border hover:bg-secondary/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={!!draftPerms.superAdmin}
                  onChange={(e) => setSuperAdmin(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-brand-red focus:ring-2 focus:ring-ring"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-500" /> Chapter super-admin
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Grants full read &amp; write on every domain and overrides the matrix below.
                    Reserve this for the President.
                  </p>
                </div>
              </label>

              {/* Domain matrix */}
              <div
                className={cn(
                  "rounded-xl border divide-y transition-opacity",
                  draftPerms.superAdmin && "opacity-50 pointer-events-none",
                )}
                aria-hidden={draftPerms.superAdmin}
              >
                {DOMAINS.map((d) => {
                  const value: DomainAccess = draftPerms.domain[d.key] ?? "none";
                  return (
                    <div
                      key={d.key}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{d.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{d.hint}</p>
                      </div>
                      <Select
                        value={value}
                        onValueChange={(v) => setDomainAccess(d.key, v as DomainAccess)}
                      >
                        <SelectTrigger className="w-[150px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCESS_VALUES.map((a) => (
                            <SelectItem key={a} value={a}>{accessLabel(a)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={resetToDefaults}
              disabled={savingPerms}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Reset to default
            </Button>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setEditPosition(null); setDraftPerms(null); }}
                disabled={savingPerms}
              >
                Cancel
              </Button>
              <Button onClick={savePermissions} disabled={savingPerms}>
                {savingPerms && <Loader2 className="h-4 w-4 animate-spin" />}
                Save permissions
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign-brother dialog ──────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={(o) => !savingAssign && setAssignOpen(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand-red" /> Assign a brother to a position
            </DialogTitle>
            <DialogDescription>
              The brother inherits that position&apos;s permissions for the term you set.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="assign-position">Position</Label>
              <Select value={assignPositionId} onValueChange={setAssignPositionId}>
                <SelectTrigger id="assign-position">
                  <SelectValue placeholder="Choose a position" />
                </SelectTrigger>
                <SelectContent>
                  {activePositions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-brother">Brother</Label>
              <Select value={assignBrotherId} onValueChange={setAssignBrotherId}>
                <SelectTrigger id="assign-brother">
                  <SelectValue placeholder="Choose a brother" />
                </SelectTrigger>
                <SelectContent>
                  {brothers.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      No brothers in the roster yet.
                    </div>
                  ) : (
                    brothers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-term">Term code</Label>
                <Input
                  id="assign-term"
                  value={assignTerm}
                  onChange={(e) => setAssignTerm(e.target.value)}
                  placeholder="2026-FA"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-start">Start date</Label>
                <Input
                  id="assign-start"
                  type="date"
                  value={assignStart}
                  onChange={(e) => setAssignStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-end">End date</Label>
                <Input
                  id="assign-end"
                  type="date"
                  value={assignEnd}
                  onChange={(e) => setAssignEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Leave the end date blank for a currently-serving officer.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="assign-notes">Notes (optional)</Label>
              <Textarea
                id="assign-notes"
                rows={2}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Elected at fall chapter meeting, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={savingAssign}>
              Cancel
            </Button>
            <Button onClick={submitAssign} disabled={savingAssign}>
              {savingAssign && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign officer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke confirm (AlertDialog semantics via Dialog) ──────────────── */}
      <Dialog open={!!revokeTarget} onOpenChange={(o) => !revoking && !o && setRevokeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Revoke officer assignment?
            </DialogTitle>
            <DialogDescription>
              {revokeTarget ? (
                <>
                  This removes <strong>{revokeTarget.brother.name}</strong> from{" "}
                  <strong>{revokeTarget.position.title}</strong> ({revokeTarget.termCode}) and
                  strips the permissions that came with it. This can&apos;t be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revoking}>
              {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
              Revoke assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small presentational helper: condensed access summary for the table ──────
function AccessSummary({ perms }: { perms: OfficerPermissions }) {
  if (perms.superAdmin) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <Crown className="h-3 w-3" /> Full access (all domains)
      </span>
    );
  }
  const writes = DOMAINS.filter((d) => perms.domain[d.key] === "write");
  const reads = DOMAINS.filter((d) => perms.domain[d.key] === "read");
  if (writes.length === 0 && reads.length === 0) {
    return <span className="text-xs text-muted-foreground">No domains granted</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {writes.map((d) => (
        <span
          key={d.key}
          className="inline-flex items-center rounded bg-brand-red-soft/40 px-1.5 py-0.5 text-[10px] font-medium text-brand-red"
        >
          {d.label}
        </span>
      ))}
      {reads.map((d) => (
        <span
          key={d.key}
          className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {d.label} · read
        </span>
      ))}
    </div>
  );
}

// ── Date / term helpers ──────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Best-guess current term code, e.g. "2026-SP" / "2026-FA", matching the
 *  "YYYY-FA" convention in the schema comment. */
function defaultTermCode(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const season = month <= 4 ? "SP" : month <= 6 ? "SU" : "FA";
  return `${now.getFullYear()}-${season}`;
}
