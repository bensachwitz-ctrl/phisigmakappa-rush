"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconSearch as Search, IconLibrary as BookOpen, IconGraduation as GraduationCap, IconAward as Award, IconAlert as AlertTriangle, IconRiskDesk as ShieldAlert, IconChevronUp as ChevronUp, IconChevronDown as ChevronDown, IconEdit as Edit2, IconSpinner as Loader2, IconRefresh as RefreshCw } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

type AcademicBrother = {
  id: string;
  name: string;
  pledgeClass: string | null;
  studyHours: number;
  academicStanding: string | null;
  major: string | null;
  year: string | null;
};

export function AcademicClient({
  initialBrothers,
  canWrite,
  currentBrotherId,
}: {
  initialBrothers: AcademicBrother[];
  canWrite: boolean;
  currentBrotherId: string | null;
}) {
  const { push } = useToast();
  const [list, setList] = React.useState<AcademicBrother[]>(initialBrothers);
  const [query, setQuery] = React.useState("");
  const [standingFilter, setStandingFilter] = React.useState<string>("ALL");
  const [editingBrother, setEditingBrother] = React.useState<AcademicBrother | null>(null);
  const [editHours, setEditHours] = React.useState<number>(0);
  const [editStanding, setEditStanding] = React.useState<string>("GOOD");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [dialogBusy, setDialogBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    return list.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        (b.pledgeClass || "").toLowerCase().includes(query.toLowerCase()) ||
        (b.major || "").toLowerCase().includes(query.toLowerCase());
      
      const standing = b.academicStanding || "GOOD";
      const matchesStanding = standingFilter === "ALL" || standing.toUpperCase() === standingFilter.toUpperCase();

      return matchesSearch && matchesStanding;
    });
  }, [list, query, standingFilter]);

  const stats = React.useMemo(() => {
    const total = list.length;
    const totalHours = list.reduce((sum, b) => sum + b.studyHours, 0);
    const avgHours = total > 0 ? (totalHours / total).toFixed(1) : "0";
    const honors = list.filter((b) => (b.academicStanding || "").toUpperCase() === "HONORS").length;
    const probation = list.filter((b) => (b.academicStanding || "").toUpperCase() === "PROBATION").length;
    const suspended = list.filter((b) => (b.academicStanding || "").toUpperCase() === "SUSPENDED").length;

    return { total, totalHours, avgHours, honors, probation, suspended };
  }, [list]);

  async function updateBrotherAcademic(id: string, studyHours: number, academicStanding: string | null) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/brothers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, studyHours, academicStanding }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to update record");
      
      setList((prev) =>
        prev.map((b) => (b.id === id ? { ...b, studyHours, academicStanding } : b))
      );
      push({ title: "Scholarship record updated", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Update failed", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function adjustHours(b: AcademicBrother, delta: number) {
    if (!canWrite) return;
    const newHours = Math.max(0, b.studyHours + delta);
    if (newHours === b.studyHours) return;
    await updateBrotherAcademic(b.id, newHours, b.academicStanding);
  }

  function handleOpenEdit(b: AcademicBrother) {
    if (!canWrite) return;
    setEditingBrother(b);
    setEditHours(b.studyHours);
    setEditStanding(b.academicStanding || "GOOD");
  }

  async function handleSaveDialog() {
    if (!editingBrother) return;
    setDialogBusy(true);
    try {
      await updateBrotherAcademic(editingBrother.id, editHours, editStanding);
      setEditingBrother(null);
    } catch {
      // toast is pushed in updateBrotherAcademic
    } finally {
      setDialogBusy(false);
    }
  }

  function getStandingBadge(standing: string | null) {
    const s = (standing || "GOOD").toUpperCase();
    switch (s) {
      case "HONORS":
        return (
          <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none inline-flex items-center gap-1">
            <Award className="h-3 w-3" /> Honors
          </Badge>
        );
      case "PROBATION":
        return (
          <Badge className="bg-amber-500 text-white hover:bg-amber-600 border-none inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Probation
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-rose-500 text-white hover:bg-rose-600 border-none inline-flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Suspended
          </Badge>
        );
      default:
        return (
          <Badge className="bg-secondary text-secondary-foreground inline-flex items-center gap-1">
            <GraduationCap className="h-3 w-3" /> Good Standing
          </Badge>
        );
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Academic Monitoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track academic standing per member and log study hours.
          </p>
        </div>
        {!canWrite && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only Mode
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Roster Size</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Study Hours</div>
          <div className="mt-1 text-2xl font-semibold">{stats.totalHours} hrs</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg Study Hours</div>
          <div className="mt-1 text-2xl font-semibold">{stats.avgHours} hrs</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Honors Standing</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.honors}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Academic Warning / Probation</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{stats.probation + stats.suspended}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, major, pledge class…"
            className="pl-9"
          />
        </div>
        <div className="w-[180px] shrink-0">
          <Select value={standingFilter} onValueChange={setStandingFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All standings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Standings</SelectItem>
              <SelectItem value="HONORS">Honors</SelectItem>
              <SelectItem value="GOOD">Good Standing</SelectItem>
              <SelectItem value="PROBATION">Probation</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Roster Grid */}
      {filtered.length === 0 ? (
        <Card className="border-border/60 text-center py-12 bg-muted/30">
          <CardContent>
            <p className="text-sm text-muted-foreground">No brothers found matching the criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const isBusy = busyId === b.id;
            return (
              <Card key={b.id} className="overflow-hidden hover:shadow-md transition">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold tracking-tight truncate">{b.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {[b.year, b.major].filter(Boolean).join(" · ") || "-"}
                      </p>
                      {b.pledgeClass && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Class: {b.pledgeClass}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {getStandingBadge(b.academicStanding)}
                    </div>
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-brand-red shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Study Hours</p>
                        <p className="text-lg font-bold">{b.studyHours} hrs</p>
                      </div>
                    </div>

                    {canWrite && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 hover:bg-background"
                          disabled={isBusy}
                          onClick={() => adjustHours(b, -1)}
                          aria-label={`Subtract an hour from ${b.name}`}
                        >
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 hover:bg-background"
                          disabled={isBusy}
                          onClick={() => adjustHours(b, 1)}
                          aria-label={`Add an hour to ${b.name}`}
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 hover:bg-background text-muted-foreground hover:text-foreground"
                          disabled={isBusy}
                          onClick={() => handleOpenEdit(b)}
                          aria-label={`Edit academic status for ${b.name}`}
                          aria-busy={isBusy}
                        >
                          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Edit2 className="h-3 w-3" aria-hidden="true" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingBrother} onOpenChange={(o) => !o && setEditingBrother(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Academic Status</DialogTitle>
          </DialogHeader>
          {editingBrother && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium">Brother</p>
                <p className="text-base text-muted-foreground">{editingBrother.name}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="studyHours">Study Hours</Label>
                <Input
                  id="studyHours"
                  type="number"
                  min={0}
                  value={editHours}
                  onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value || "0", 10)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="standing">Academic Standing</Label>
                <Select value={editStanding} onValueChange={setEditStanding}>
                  <SelectTrigger id="standing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HONORS">Honors</SelectItem>
                    <SelectItem value="GOOD">Good Standing</SelectItem>
                    <SelectItem value="PROBATION">Academic Probation</SelectItem>
                    <SelectItem value="SUSPENDED">Academic Suspension</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBrother(null)} disabled={dialogBusy}>
              Cancel
            </Button>
            <Button onClick={handleSaveDialog} disabled={dialogBusy}>
              {dialogBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
