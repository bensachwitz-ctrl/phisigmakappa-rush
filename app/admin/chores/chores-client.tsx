"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Trash2, Edit2, Loader2, RotateCw, Calendar, CheckCircle2,
  AlertTriangle, Play, HelpCircle, User, ShieldAlert, Award
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChoreTask = {
  id: string;
  label: string;
  description: string | null;
  rotationOrder: number;
  active: boolean;
};

type Brother = {
  id: string;
  name: string;
};

type ChoreAssignment = {
  id: string;
  taskId: string;
  memberId: string;
  weekStarting: string;
  status: string; // assigned | completed | skipped | graded
  completedAt: string | null;
  grade: string | null;
  notes: string | null;
  task: ChoreTask;
  member: Brother;
};

export function ChoresClient({
  initialTasks,
  initialBrothers,
  canWrite,
}: {
  initialTasks: ChoreTask[];
  initialBrothers: Brother[];
  canWrite: boolean;
}) {
  const { push } = useToast();
  const [activeTab, setActiveTab] = React.useState<"assignments" | "catalog">("assignments");
  
  // Week code state: snap to current Sunday week
  const [weekCode, setWeekCode] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Snap to Sunday
    const year = d.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const sundayOfWeek1 = new Date(jan1);
    sundayOfWeek1.setDate(jan1.getDate() - jan1.getDay());
    const diffMs = d.getTime() - sundayOfWeek1.getTime();
    const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    return `${year}-W${String(weekNum).padStart(2, "0")}`;
  });

  const [assignments, setAssignments] = React.useState<ChoreAssignment[]>([]);
  const [tasks, setTasks] = React.useState<ChoreTask[]>(initialTasks);
  const [brothers] = React.useState<Brother[]>(initialBrothers);

  const [loadingAssignments, setLoadingAssignments] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Dialog states for Task Add/Edit
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<ChoreTask | null>(null);
  const [taskForm, setTaskForm] = React.useState({
    label: "",
    description: "",
    rotationOrder: 10,
    active: true,
  });
  const [taskFormBusy, setTaskFormBusy] = React.useState(false);

  // Dialog states for Grading
  const [gradingAssignment, setGradingAssignment] = React.useState<ChoreAssignment | null>(null);
  const [gradeForm, setGradeForm] = React.useState({
    grade: "A" as "A" | "B" | "C" | "D" | "F",
    notes: "",
  });
  const [gradingBusy, setGradingBusy] = React.useState(false);

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

  // Load assignments when weekCode changes
  const fetchAssignments = React.useCallback(async (code: string) => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/admin/chores/assignments?week=${code}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.assignments)) {
        setAssignments(json.assignments);
      } else {
        setAssignments([]);
      }
    } catch {
      setAssignments([]);
      push({ title: "Failed to load assignments", variant: "destructive" });
    } finally {
      setLoadingAssignments(false);
    }
  }, [push]);

  React.useEffect(() => {
    fetchAssignments(weekCode);
  }, [weekCode, fetchAssignments]);

  // Tasks Management Actions
  function openAddTask() {
    setEditingTask(null);
    setTaskForm({
      label: "",
      description: "",
      rotationOrder: tasks.length > 0 ? Math.max(...tasks.map(t => t.rotationOrder)) + 10 : 10,
      active: true,
    });
    setTaskDialogOpen(true);
  }

  function openEditTask(t: ChoreTask) {
    setEditingTask(t);
    setTaskForm({
      label: t.label,
      description: t.description || "",
      rotationOrder: t.rotationOrder,
      active: t.active,
    });
    setTaskDialogOpen(true);
  }

  async function saveTask() {
    if (!taskForm.label.trim()) {
      push({ title: "Task title required", variant: "destructive" });
      return;
    }
    setTaskFormBusy(true);
    try {
      if (editingTask) {
        const res = await fetch(`/api/admin/chores/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(taskForm),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
        setTasks(xs => xs.map(x => x.id === editingTask.id ? json.task : x).sort((a, b) => a.rotationOrder - b.rotationOrder));
        push({ title: "Chore task updated", variant: "success" });
      } else {
        const res = await fetch("/api/admin/chores/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(taskForm),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
        setTasks(xs => [...xs, json.task].sort((a, b) => a.rotationOrder - b.rotationOrder));
        push({ title: "Chore task added to catalog", variant: "success" });
      }
      setTaskDialogOpen(false);
    } catch (err: any) {
      push({ title: err.message || "Save failed", variant: "destructive" });
    } finally {
      setTaskFormBusy(false);
    }
  }

  function deleteTask(id: string) {
    askConfirm({
      title: "Delete chore task?",
      description: "Are you sure you want to delete this chore task? This will remove it from the catalog.",
      confirmLabel: "Delete Task",
      destructive: true,
      onConfirm: async () => {
        const prev = tasks;
        setTasks(xs => xs.filter(x => x.id !== id));
        try {
          const res = await fetch(`/api/admin/chores/tasks/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          push({ title: "Chore task deleted", variant: "success" });
        } catch {
          setTasks(prev);
          push({ title: "Delete failed", variant: "destructive" });
        }
      },
    });
  }

  // Rotation Trigger
  function runRotation() {
    if (!canWrite) return;
    if (assignments.length > 0) {
      askConfirm({
        title: "Overwrite this week's assignments?",
        description: `This week (${weekCode}) already has assignments. Running rotation will overwrite all assignments for this week. Continue?`,
        confirmLabel: "Run Rotation",
        destructive: true,
        onConfirm: doRotation,
      });
      return;
    }
    void doRotation();
  }

  async function doRotation() {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/admin/chores/rotate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ week: weekCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Rotation failed");
      push({ title: "Chore wheel rotated successfully!", variant: "success" });
      fetchAssignments(weekCode);
    } catch (err: any) {
      push({ title: err.message || "Rotation failed", variant: "destructive" });
      setLoadingAssignments(false);
    }
  }

  // Update Assignment Status
  async function updateChoreStatus(id: string, status: "assigned" | "completed" | "skipped") {
    if (!canWrite) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/chores/assignments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      setAssignments(xs => xs.map(x => x.id === id ? { ...x, ...json.assignment } : x));
      push({ title: `Status marked as ${status}`, variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Failed to update chore status", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  // Open Grading Dialog
  function openGrading(assignment: ChoreAssignment) {
    if (!canWrite) return;
    setGradingAssignment(assignment);
    setGradeForm({
      grade: (assignment.grade as any) || "A",
      notes: assignment.notes || "",
    });
  }

  // Save Grade
  async function saveGrade() {
    if (!gradingAssignment) return;
    setGradingBusy(true);
    try {
      const res = await fetch(`/api/admin/chores/${gradingAssignment.id}/grade`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(gradeForm),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Grading failed");
      setAssignments(xs => xs.map(x => x.id === gradingAssignment.id ? { ...x, ...json.assignment } : x));
      push({ title: "Chore graded", variant: "success" });
      setGradingAssignment(null);
    } catch (err: any) {
      push({ title: err.message || "Grading failed", variant: "destructive" });
    } finally {
      setGradingBusy(false);
    }
  }

  // Delete Assignment
  function deleteAssignment(id: string) {
    askConfirm({
      title: "Delete chore assignment?",
      description: "Are you sure you want to delete this chore assignment?",
      confirmLabel: "Delete Assignment",
      destructive: true,
      onConfirm: async () => {
        const prev = assignments;
        setAssignments(xs => xs.filter(x => x.id !== id));
        try {
          const res = await fetch(`/api/admin/chores/assignments/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          push({ title: "Chore assignment deleted", variant: "success" });
        } catch {
          setAssignments(prev);
          push({ title: "Delete failed", variant: "destructive" });
        }
      },
    });
  }

  // Relative Week Control
  function adjustWeek(delta: number) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(weekCode);
    if (!m) return;
    const year = parseInt(m[1], 10);
    const week = parseInt(m[2], 10);
    let nextWeek = week + delta;
    let nextYear = year;
    if (nextWeek < 1) {
      nextYear -= 1;
      nextWeek = 52;
    } else if (nextWeek > 52) {
      nextYear += 1;
      nextWeek = 1;
    }
    setWeekCode(`${nextYear}-W${String(nextWeek).padStart(2, "0")}`);
  }

  // Render Stats
  const assignmentStats = React.useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === "completed" || a.status === "graded").length;
    const skipped = assignments.filter(a => a.status === "skipped").length;
    const graded = assignments.filter(a => a.status === "graded").length;
    return { total, completed, skipped, graded };
  }, [assignments]);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">House Chores Wheel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage house duty round-robin scheduling, assign chores, and rate brother performances.
          </p>
        </div>
        {!canWrite && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only Mode
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("assignments")}
          className={cn(
            "pb-3 px-4 text-sm font-semibold border-b-2 -mb-[2px] transition",
            activeTab === "assignments"
              ? "border-phisig-red text-phisig-red"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Assignments Grid
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "pb-3 px-4 text-sm font-semibold border-b-2 -mb-[2px] transition",
            activeTab === "catalog"
              ? "border-phisig-red text-phisig-red"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Chore Task Catalog ({tasks.length})
        </button>
      </div>

      {activeTab === "assignments" ? (
        <div className="space-y-6">
          {/* Week picker / controls */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-secondary/35 border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-phisig-red" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Scheduled Week</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => adjustWeek(-1)}>Prev</Button>
                  <span className="font-mono font-semibold text-sm">{weekCode}</span>
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => adjustWeek(1)}>Next</Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchAssignments(weekCode)} disabled={loadingAssignments}>
                <RotateCw className={cn("h-4 w-4", loadingAssignments && "animate-spin")} />
              </Button>
              {canWrite && (
                <Button onClick={runRotation} disabled={loadingAssignments} className="bg-phisig-red text-white hover:bg-phisig-red-dark">
                  <RotateCw className="h-4 w-4 mr-1.5" /> Rotate Wheel
                </Button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          {assignments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Chore Rotations</div>
                <div className="text-xl font-bold mt-0.5">{assignmentStats.total}</div>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Completed Chores</div>
                <div className="text-xl font-bold mt-0.5 text-emerald-600">{assignmentStats.completed}</div>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Skipped Chores</div>
                <div className="text-xl font-bold mt-0.5 text-amber-600">{assignmentStats.skipped}</div>
              </div>
              <div className="rounded-xl border p-3 bg-card">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Graded Chores</div>
                <div className="text-xl font-bold mt-0.5 text-blue-600">{assignmentStats.graded}</div>
              </div>
            </div>
          )}

          {/* Table */}
          {loadingAssignments ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-phisig-red" />
            </div>
          ) : assignments.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent className="space-y-3">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No Chore Assignments</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  No duties scheduled for the week of {weekCode}. Click "Rotate Wheel" to generate deterministic round-robin assignments.
                </p>
                {canWrite && (
                  <Button onClick={runRotation} className="mt-2">
                    Generate Week Duty
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((a) => {
                const isBusy = busyId === a.id;
                return (
                  <Card key={a.id} className="overflow-hidden hover:shadow-md transition">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold truncate leading-none">{a.task.label}</h3>
                          <div className="shrink-0">
                            {a.status === "completed" && (
                              <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Completed</Badge>
                            )}
                            {a.status === "skipped" && (
                              <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Skipped</Badge>
                            )}
                            {a.status === "assigned" && (
                              <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">Assigned</Badge>
                            )}
                            {a.status === "graded" && (
                              <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">Graded: {a.grade}</Badge>
                            )}
                          </div>
                        </div>
                        {a.task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.task.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 border-t pt-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Duty Owner</p>
                          <p className="text-sm font-semibold truncate mt-0.5">{a.member.name}</p>
                        </div>
                      </div>

                      {/* Notes / Grade logs */}
                      {(a.notes || a.grade) && (
                        <div className="bg-muted/40 p-2.5 rounded-lg text-xs space-y-1">
                          {a.grade && (
                            <p className="font-semibold text-blue-700">Chore Grade: {a.grade}</p>
                          )}
                          {a.notes && (
                            <p className="text-muted-foreground italic">"{a.notes}"</p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {canWrite && (
                        <div className="flex items-center gap-1.5 border-t pt-3 flex-wrap">
                          {a.status === "assigned" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                disabled={isBusy}
                                onClick={() => updateChoreStatus(a.id, "completed")}
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs text-amber-600 border-amber-100 hover:bg-amber-50"
                                disabled={isBusy}
                                onClick={() => updateChoreStatus(a.id, "skipped")}
                              >
                                Skip
                              </Button>
                            </>
                          )}
                          {a.status === "completed" && (
                            <Button
                              size="sm"
                              className="h-8 px-2 text-xs bg-blue-600 text-white hover:bg-blue-700"
                              disabled={isBusy}
                              onClick={() => openGrading(a)}
                            >
                              Grade Chore
                            </Button>
                          )}
                          {a.status === "graded" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              disabled={isBusy}
                              onClick={() => openGrading(a)}
                            >
                              Edit Grade
                            </Button>
                          )}
                          {a.status !== "assigned" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                              disabled={isBusy}
                              onClick={() => updateChoreStatus(a.id, "assigned")}
                            >
                              Reset
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive ml-auto"
                            disabled={isBusy}
                            onClick={() => deleteAssignment(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      ) : (
        /* Chore Catalog Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recurring Chore Catalog</h2>
            {canWrite && (
              <Button onClick={openAddTask}>
                <Plus className="h-4 w-4 mr-1.5" /> New Chore Task
              </Button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((t) => (
              <Card key={t.id} className={cn("overflow-hidden border-border/80", !t.active && "opacity-50")}>
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-none">{t.label}</h3>
                      <div className="shrink-0 flex gap-1">
                      <Badge className="font-mono border border-border text-muted-foreground bg-transparent">Sort: {t.rotationOrder}</Badge>
                      {!t.active && <Badge className="bg-destructive text-destructive-foreground">Inactive</Badge>}
                    </div>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-2">{t.description}</p>
                    )}
                  </div>

                  {canWrite && (
                    <div className="flex gap-1 border-t pt-3">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => openEditTask(t)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(t.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Task Catalog Add/Edit Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Chore Task" : "New Chore Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="taskTitle">Task Name *</Label>
              <Input
                id="taskTitle"
                value={taskForm.label}
                onChange={(e) => setTaskForm({ ...taskForm, label: e.target.value })}
                placeholder="Kitchen cleanup, Garbage duty…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskDesc">Description / Directions</Label>
              <Textarea
                id="taskDesc"
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Empty all bins, wipe counters, and mop floor before 10 PM Sunday."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="taskOrder">Rotation Sort Order</Label>
                <Input
                  id="taskOrder"
                  type="number"
                  value={taskForm.rotationOrder}
                  onChange={(e) => setTaskForm({ ...taskForm, rotationOrder: parseInt(e.target.value || "0", 10) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="taskActive"
                  className="rounded border"
                  checked={taskForm.active}
                  onChange={(e) => setTaskForm({ ...taskForm, active: e.target.checked })}
                />
                <Label htmlFor="taskActive" className="cursor-pointer">Active in Wheel</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)} disabled={taskFormBusy}>Cancel</Button>
            <Button onClick={saveTask} disabled={taskFormBusy}>
              {taskFormBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editingTask ? "Save Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={!!gradingAssignment} onOpenChange={(o) => !o && setGradingAssignment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grade Chore Wheel Assignment</DialogTitle>
          </DialogHeader>
          {gradingAssignment && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs uppercase font-bold text-muted-foreground leading-none">Duty & Owner</p>
                <p className="text-sm font-semibold mt-1">
                  {gradingAssignment.task.label} &mdash; {gradingAssignment.member.name}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="choreGrade">Select Letter Grade</Label>
                <Select
                  value={gradeForm.grade}
                  onValueChange={(val: any) => setGradeForm({ ...gradeForm, grade: val })}
                >
                  <SelectTrigger id="choreGrade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Grade A (Excellent)</SelectItem>
                    <SelectItem value="B">Grade B (Good)</SelectItem>
                    <SelectItem value="C">Grade C (Satisfactory)</SelectItem>
                    <SelectItem value="D">Grade D (Poor)</SelectItem>
                    <SelectItem value="F">Grade F (Failed Duty)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="choreNotes">Review Feedback / Notes</Label>
                <Textarea
                  id="choreNotes"
                  rows={3}
                  value={gradeForm.notes}
                  onChange={(e) => setGradeForm({ ...gradeForm, notes: e.target.value })}
                  placeholder="Kitchen was left spotless, thank you. / Garbage was overflowing by Monday morning."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingAssignment(null)} disabled={gradingBusy}>Cancel</Button>
            <Button onClick={saveGrade} disabled={gradingBusy}>
              {gradingBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Submit Grade
            </Button>
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
