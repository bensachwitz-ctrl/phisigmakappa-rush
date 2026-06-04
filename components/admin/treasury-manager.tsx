"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Trash2, Loader2, Edit3, Wallet, TrendingUp, Scale, Receipt,
  Check, X, BadgeCheck, ExternalLink, FolderOpen, Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types (mirror the Prisma models, serialized to the client) ────────────
type BudgetLine = {
  id: string;
  category: string;
  label: string;
  budgetedCents: number;
  actualCents: number;
  period: string;
  notes: string | null;
};

type ExpenseStatus = "PENDING" | "APPROVED" | "REIMBURSED" | "DENIED";

type Expense = {
  id: string;
  submittedById: string | null;
  submittedByName: string | null;
  amountCents: number;
  category: string;
  description: string;
  status: ExpenseStatus;
  receiptUrl: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
};

// ─── Money helpers ──────────────────────────────────────────────────────────
/** Cents → "$1,250.00". Negative-aware so a credit variance reads "-$40.00". */
function fmtCents(cents: number): string {
  const neg = cents < 0;
  const dollars = Math.abs(cents) / 100;
  return `${neg ? "-" : ""}$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
/** Parse a free-typed dollar string ("1,250.50" / "$40") into integer cents. */
function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const STATUS_META: Record<ExpenseStatus, { label: string; chip: string; dot: string }> = {
  PENDING:    { label: "Pending",    chip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",     dot: "bg-amber-500" },
  APPROVED:   { label: "Approved",   chip: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",           dot: "bg-sky-500" },
  REIMBURSED: { label: "Reimbursed", chip: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  DENIED:     { label: "Denied",     chip: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",       dot: "bg-zinc-400" },
};

const EMPTY_LINE = { category: "", label: "", budgeted: "", actual: "", notes: "" };

export function TreasuryManager({
  initialLines,
  initialExpenses,
  initialPeriod,
  initialPeriods,
}: {
  initialLines: BudgetLine[];
  initialExpenses: Expense[];
  initialPeriod: string;
  initialPeriods: string[];
}) {
  const { push } = useToast();

  // Budget state ─────────────────────────────────────────────────────────────
  const [period, setPeriod] = React.useState(initialPeriod);
  const [periods, setPeriods] = React.useState<string[]>(
    Array.from(new Set([initialPeriod, ...initialPeriods]))
  );
  const [lines, setLines] = React.useState<BudgetLine[]>(initialLines);
  const [linesLoading, setLinesLoading] = React.useState(false);

  // Expense state ─────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = React.useState<Expense[]>(initialExpenses);
  const [statusFilter, setStatusFilter] = React.useState<"PENDING" | "ALL" | ExpenseStatus>("PENDING");
  const [decidingId, setDecidingId] = React.useState<string | null>(null);

  // Line dialog ───────────────────────────────────────────────────────────────
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BudgetLine | null>(null);
  const [form, setForm] = React.useState(EMPTY_LINE);
  const [busy, setBusy] = React.useState(false);

  // Confirm dialog (delete) ────────────────────────────────────────────────────
  const [confirmLine, setConfirmLine] = React.useState<BudgetLine | null>(null);
  const [confirmBusy, setConfirmBusy] = React.useState(false);

  // ── Load a period's lines when the selector changes ───────────────────────
  async function loadPeriod(next: string) {
    setPeriod(next);
    setLinesLoading(true);
    try {
      const res = await fetch(`/api/admin/treasury/budget?period=${encodeURIComponent(next)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Load failed");
      setLines(json.lines || []);
      if (Array.isArray(json.periods)) {
        setPeriods((prev) => Array.from(new Set([next, ...json.periods, ...prev])));
      }
    } catch (err: any) {
      push({ title: err.message || "Could not load that term", variant: "destructive" });
    } finally {
      setLinesLoading(false);
    }
  }

  // ── Open create / edit line ───────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_LINE);
    setOpen(true);
  }
  function openEdit(l: BudgetLine) {
    setEditing(l);
    setForm({
      category: l.category,
      label: l.label,
      budgeted: (l.budgetedCents / 100).toString(),
      actual: (l.actualCents / 100).toString(),
      notes: l.notes || "",
    });
    setOpen(true);
  }

  // ── Save line (create or patch) ───────────────────────────────────────────
  async function saveLine() {
    const category = form.category.trim();
    const label = form.label.trim();
    if (!category || !label) {
      push({ title: "Category and label are required", variant: "destructive" });
      return;
    }
    const budgetedCents = dollarsToCents(form.budgeted);
    if (budgetedCents === null) {
      push({ title: "Enter a valid budgeted amount", variant: "destructive" });
      return;
    }
    const actualCents = form.actual.trim() === "" ? 0 : dollarsToCents(form.actual);
    if (actualCents === null) {
      push({ title: "Enter a valid actual amount", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        const res = await fetch("/api/admin/treasury/budget", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editing.id, category, label, budgetedCents, actualCents, notes: form.notes.trim() }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
        setLines((xs) => xs.map((x) => (x.id === editing.id ? json.line : x)));
        push({ title: "Line updated", variant: "success" });
      } else {
        const res = await fetch("/api/admin/treasury/budget", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ category, label, budgetedCents, actualCents, period, notes: form.notes.trim() }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
        setLines((xs) => [...xs, json.line]);
        push({ title: "Budget line added", variant: "success" });
      }
      setOpen(false);
    } catch (err: any) {
      push({ title: err.message || "Save failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  // ── Delete line (optimistic, with confirm) ────────────────────────────────
  async function doDelete() {
    const l = confirmLine;
    if (!l) return;
    setConfirmBusy(true);
    const prev = lines;
    setLines((xs) => xs.filter((x) => x.id !== l.id));
    try {
      const res = await fetch(`/api/admin/treasury/budget?id=${encodeURIComponent(l.id)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) throw new Error();
      push({ title: "Line deleted", variant: "success" });
    } catch {
      setLines(prev);
      push({ title: "Delete failed", variant: "destructive" });
    } finally {
      setConfirmBusy(false);
      setConfirmLine(null);
    }
  }

  // ── Decide an expense (optimistic) ────────────────────────────────────────
  async function decide(exp: Expense, status: ExpenseStatus) {
    setDecidingId(exp.id);
    const prev = expenses;
    setExpenses((xs) =>
      xs.map((x) => (x.id === exp.id ? { ...x, status, decidedAt: new Date().toISOString() } : x))
    );
    try {
      const res = await fetch("/api/admin/treasury/expenses", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: exp.id, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      setExpenses((xs) => xs.map((x) => (x.id === exp.id ? json.expense : x)));
      push({ title: `Marked ${STATUS_META[status].label.toLowerCase()}`, variant: "success" });
    } catch (err: any) {
      setExpenses(prev);
      push({ title: err.message || "Update failed", variant: "destructive" });
    } finally {
      setDecidingId(null);
    }
  }

  // ── Derived: grouped budget + summary ─────────────────────────────────────
  const grouped = React.useMemo(() => {
    const map = new Map<string, BudgetLine[]>();
    for (const l of lines) {
      const arr = map.get(l.category) || [];
      arr.push(l);
      map.set(l.category, arr);
    }
    return Array.from(map.entries())
      .map(([category, items]) => ({
        category,
        items: items.slice().sort((a, b) => a.label.localeCompare(b.label)),
        budgeted: items.reduce((s, x) => s + x.budgetedCents, 0),
        actual: items.reduce((s, x) => s + x.actualCents, 0),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [lines]);

  const totals = React.useMemo(() => {
    const budgeted = lines.reduce((s, x) => s + x.budgetedCents, 0);
    const actual = lines.reduce((s, x) => s + x.actualCents, 0);
    const pending = expenses.filter((e) => e.status === "PENDING");
    return {
      budgeted,
      actual,
      variance: budgeted - actual, // positive = under budget, negative = over
      pendingCount: pending.length,
      pendingCents: pending.reduce((s, e) => s + e.amountCents, 0),
    };
  }, [lines, expenses]);

  const overBudget = totals.variance < 0;

  const visibleExpenses = React.useMemo(() => {
    const list =
      statusFilter === "ALL"
        ? expenses
        : expenses.filter((e) => e.status === statusFilter);
    // Pending bubbles to the top, then newest first.
    return list.slice().sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [expenses, statusFilter]);

  const statusCounts = React.useMemo(() => {
    const c: Record<string, number> = { ALL: expenses.length };
    for (const s of ["PENDING", "APPROVED", "REIMBURSED", "DENIED"] as ExpenseStatus[]) {
      c[s] = expenses.filter((e) => e.status === s).length;
    }
    return c;
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* ── Summary cards (glass) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={Wallet}
          label="Total budgeted"
          value={fmtCents(totals.budgeted)}
          tint="blue"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total spent"
          value={fmtCents(totals.actual)}
          tint="sky"
          sub={
            totals.budgeted > 0
              ? `${Math.round((totals.actual / totals.budgeted) * 100)}% of budget`
              : undefined
          }
        />
        <SummaryCard
          icon={Scale}
          label={overBudget ? "Over budget" : "Remaining"}
          value={fmtCents(Math.abs(totals.variance))}
          tint={overBudget ? "gold" : "blue"}
          gold={overBudget}
        />
        <SummaryCard
          icon={Receipt}
          label="Pending reimbursements"
          value={String(totals.pendingCount)}
          tint="sky"
          sub={totals.pendingCents > 0 ? fmtCents(totals.pendingCents) : "All clear"}
        />
      </div>

      {/* ── Budget section ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <FolderOpen className="h-4.5 w-4.5 text-phisig-red" aria-hidden="true" />
              Budget
            </h2>
            <p className="text-sm text-muted-foreground">
              Plan vs. actual by category for the selected term.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector
              period={period}
              periods={periods}
              onChange={loadPeriod}
              disabled={linesLoading}
            />
            <Button onClick={openCreate} className="shrink-0">
              <Plus className="h-4 w-4" /> Add line
            </Button>
          </div>
        </div>

        {linesLoading ? (
          <BudgetSkeleton />
        ) : lines.length === 0 ? (
          <EmptyBudget period={period} onAdd={openCreate} />
        ) : (
          <Card className="overflow-hidden gs-card-glow relative">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Line</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="w-[34%]">Progress</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((g) => (
                    <React.Fragment key={g.category}>
                      {/* category subhead row */}
                      <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                        <TableCell className="pl-5 py-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-phisig-red">
                            {g.category}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                          {fmtCents(g.budgeted)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                          {fmtCents(g.actual)}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <VarianceTag cents={g.budgeted - g.actual} small />
                        </TableCell>
                        <TableCell className="py-2"><ProgressBar actual={g.actual} budgeted={g.budgeted} /></TableCell>
                        <TableCell className="py-2" />
                      </TableRow>
                      {g.items.map((l) => {
                        const variance = l.budgetedCents - l.actualCents;
                        return (
                          <TableRow key={l.id} className="group">
                            <TableCell className="pl-5">
                              <div className="font-medium">{l.label}</div>
                              {l.notes && (
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{l.notes}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCents(l.budgetedCents)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCents(l.actualCents)}</TableCell>
                            <TableCell className="text-right"><VarianceTag cents={variance} /></TableCell>
                            <TableCell><ProgressBar actual={l.actualCents} budgeted={l.budgetedCents} /></TableCell>
                            <TableCell className="pr-5">
                              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => openEdit(l)} title="Edit line"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setConfirmLine(l)} title="Delete line"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {/* grand-total footer row */}
                  <TableRow className="border-t-2 border-border hover:bg-transparent">
                    <TableCell className="pl-5 font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtCents(totals.budgeted)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtCents(totals.actual)}</TableCell>
                    <TableCell className="text-right"><VarianceTag cents={totals.variance} /></TableCell>
                    <TableCell><ProgressBar actual={totals.actual} budgeted={totals.budgeted} /></TableCell>
                    <TableCell className="pr-5" />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Expense / reimbursement queue ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Receipt className="h-4.5 w-4.5 text-phisig-red" aria-hidden="true" />
              Reimbursements
            </h2>
            <p className="text-sm text-muted-foreground">
              Approve, deny, or mark requests reimbursed.
            </p>
          </div>
          {/* status filter tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 border border-border">
            {(["PENDING", "APPROVED", "REIMBURSED", "DENIED", "ALL"] as const).map((s) => {
              const active = statusFilter === s;
              const labelText = s === "ALL" ? "All" : STATUS_META[s as ExpenseStatus].label;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {labelText}
                  <span className={cn("ml-1.5 tabular-nums", active ? "text-phisig-red" : "text-muted-foreground/70")}>
                    {statusCounts[s] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {visibleExpenses.length === 0 ? (
          <EmptyExpenses filter={statusFilter} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleExpenses.map((exp) => (
              <ExpenseCard
                key={exp.id}
                exp={exp}
                busy={decidingId === exp.id}
                onDecide={decide}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Add / edit line dialog ────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit budget line" : "Add budget line"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the plan, actuals, or notes for this line." : `New line for ${period}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Category *</Label>
                <Input
                  list="gs-treasury-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Social / Recruitment / Philanthropy"
                />
                <datalist id="gs-treasury-categories">
                  {Array.from(new Set(lines.map((l) => l.category))).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label className="mb-1 inline-block">Label *</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Fall formal venue"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Budgeted ($)</Label>
                <Input
                  inputMode="decimal"
                  value={form.budgeted}
                  onChange={(e) => setForm({ ...form, budgeted: e.target.value })}
                  placeholder="2,500.00"
                />
              </div>
              <div>
                <Label className="mb-1 inline-block">Actual ($)</Label>
                <Input
                  inputMode="decimal"
                  value={form.actual}
                  onChange={(e) => setForm({ ...form, actual: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 inline-block">Notes (optional)</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Deposit due 3 weeks out; balance on the night."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={saveLine} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Add line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <Dialog open={!!confirmLine} onOpenChange={(o) => !confirmBusy && !o && setConfirmLine(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete budget line?</DialogTitle>
            <DialogDescription>
              {confirmLine ? `Remove "${confirmLine.label}" from ${confirmLine.category}? This can't be undone.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLine(null)} disabled={confirmBusy}>Cancel</Button>
            <Button
              onClick={doDelete}
              disabled={confirmBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════════════

const TINTS: Record<string, { ring: string; icon: string; glow: string }> = {
  blue: { ring: "ring-phisig-red/15", icon: "text-phisig-red bg-phisig-red/10", glow: "from-phisig-red/[0.07]" },
  sky:  { ring: "ring-phisig-red/15", icon: "text-phisig-red bg-phisig-red/10", glow: "from-phisig-red/[0.07]" },
  // gold stays SEMANTIC — flags an over-budget variance, not platform decoration.
  gold: { ring: "ring-[var(--gs-gold)]/25", icon: "text-[var(--gs-gold)] bg-[var(--gs-gold)]/10", glow: "from-[var(--gs-gold)]/[0.10]" },
};

function SummaryCard({
  icon: Icon, label, value, sub, tint = "blue", gold = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tint?: "blue" | "sky" | "gold";
  gold?: boolean;
}) {
  const t = TINTS[tint];
  return (
    <div className={cn(
      "gs-glass relative overflow-hidden rounded-2xl p-4 ring-1",
      t.ring
    )}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent", t.glow)} aria-hidden="true" />
      <div className="relative flex items-center gap-2">
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", t.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <div className={cn(
        "relative mt-2 text-2xl font-bold tracking-tight tabular-nums",
        gold ? "gs-gold-text" : "text-foreground"
      )}>
        {value}
      </div>
      {sub && <div className="relative mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Thin progress bar — blue fill under budget, gold once actual exceeds budget. */
function ProgressBar({ actual, budgeted }: { actual: number; budgeted: number }) {
  if (budgeted <= 0) {
    // No budget set — show a neutral track with the spent portion in sky if any.
    return (
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden" aria-hidden="true">
        {actual > 0 && <div className="h-full w-full bg-phisig-red/40" />}
      </div>
    );
  }
  const pct = Math.min(100, Math.round((actual / budgeted) * 100));
  const over = actual > budgeted;
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round((actual / budgeted) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Spent vs. budgeted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            over
              ? "bg-gradient-to-r from-[var(--gs-gold)] to-[var(--gs-gold-soft)]"
              : "bg-gradient-to-r from-phisig-red to-phisig-red-dark"
          )}
          style={{ width: `${Math.max(pct, actual > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className={cn("text-[10px] font-semibold tabular-nums w-9 text-right", over ? "text-[var(--gs-gold)]" : "text-muted-foreground")}>
        {Math.round((actual / budgeted) * 100)}%
      </span>
    </div>
  );
}

/** Variance pill — gold when over budget (negative), muted/emerald when under. */
function VarianceTag({ cents, small = false }: { cents: number; small?: boolean }) {
  const over = cents < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold tabular-nums",
        small ? "text-[11px] px-1 py-0.5" : "text-xs px-1.5 py-0.5",
        over
          ? "bg-[var(--gs-gold)]/10 text-[var(--gs-gold)]"
          : cents === 0
            ? "text-muted-foreground"
            : "text-emerald-700"
      )}
      title={over ? "Over budget" : "Under budget"}
    >
      {over ? "+" : ""}{fmtCents(Math.abs(cents))}{over ? " over" : ""}
    </span>
  );
}

function PeriodSelector({
  period, periods, onChange, disabled,
}: {
  period: string;
  periods: string[];
  onChange: (p: string) => void;
  disabled?: boolean;
}) {
  // Native select keeps this dependency-free + reliably keyboard-accessible; the
  // term tags are short and finite. Styled to match the input system.
  return (
    <div className="relative">
      <label htmlFor="gs-period" className="sr-only">Budget term</label>
      <select
        id="gs-period"
        value={period}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer rounded-md border border-input bg-background pl-3 pr-8 text-sm font-medium capitalize ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50"
      >
        {periods.map((p) => (
          <option key={p} value={p}>{p.replace("-", " ")}</option>
        ))}
      </select>
    </div>
  );
}

function ExpenseCard({
  exp, busy, onDecide,
}: {
  exp: Expense;
  busy: boolean;
  onDecide: (e: Expense, s: ExpenseStatus) => void;
}) {
  const meta = STATUS_META[exp.status];
  const created = new Date(exp.createdAt);
  const dateLabel = created.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <Card className="lift overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-bold tracking-tight tabular-nums">{fmtCents(exp.amountCents)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground truncate">
              {exp.submittedByName || "A brother"} · {dateLabel}
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", meta.chip)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {exp.category}
          </span>
          {exp.receiptUrl && (
            <a
              href={exp.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-phisig-red hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <ExternalLink className="h-3 w-3" /> Receipt
            </a>
          )}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-foreground/90 line-clamp-3">{exp.description}</p>

        {exp.decidedByName && exp.status !== "PENDING" && (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock3 className="h-3 w-3" />
            {meta.label} by {exp.decidedByName}
          </p>
        )}

        {/* Actions: contextual to current status. */}
        <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-border">
          {busy ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
            </span>
          ) : exp.status === "PENDING" ? (
            <>
              <Button size="sm" className="flex-1" onClick={() => onDecide(exp, "APPROVED")}>
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onDecide(exp, "REIMBURSED")} title="Paid out">
                <BadgeCheck className="h-3.5 w-3.5" /> Reimbursed
              </Button>
              <Button
                size="sm" variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDecide(exp, "DENIED")}
              >
                <X className="h-3.5 w-3.5" /> Deny
              </Button>
            </>
          ) : exp.status === "APPROVED" ? (
            <>
              <Button size="sm" className="flex-1" onClick={() => onDecide(exp, "REIMBURSED")}>
                <BadgeCheck className="h-3.5 w-3.5" /> Mark reimbursed
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onDecide(exp, "PENDING")}>
                Undo
              </Button>
            </>
          ) : (
            // REIMBURSED or DENIED — allow reopening to PENDING.
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onDecide(exp, "PENDING")}>
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty + loading states ─────────────────────────────────────────────────
function EmptyBudget({ period, onAdd }: { period: string; onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 px-6 text-center">
        <div className="max-w-sm mx-auto">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red/10 text-phisig-red mb-4">
            <Wallet className="h-6 w-6" />
          </span>
          <h3 className="text-base font-semibold tracking-tight">No budget lines yet — add your first</h3>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Build out the {period.replace("-", " ")} budget by category — social, recruitment, philanthropy, operations — then track actuals against each line.
          </p>
          <Button onClick={onAdd} className="mt-5">
            <Plus className="h-4 w-4" /> Add first line
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyExpenses({ filter }: { filter: string }) {
  const msg =
    filter === "PENDING"
      ? "No reimbursements waiting on you. Nice — inbox zero."
      : filter === "ALL"
        ? "No reimbursement requests yet. They'll appear here as brothers submit them."
        : `No ${filter.toLowerCase()} reimbursements.`;
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 px-6 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-3">
          <Receipt className="h-5 w-5" />
        </span>
        <p className="text-sm text-muted-foreground">{msg}</p>
      </CardContent>
    </Card>
  );
}

function BudgetSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 flex-1 rounded shimmer" />
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-1.5 w-32 rounded-full shimmer" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
