"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Trash2, Loader2, Vote, Lock, CheckCircle2, Crown,
  AlertTriangle, UserPlus, Pencil, ListChecks, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ElectionStatusBadge } from "../status-badge";

// ── Serialised shapes (mirror the server page) ───────────────────────────────

type Candidate = {
  id: string;
  brotherId: string;
  name: string;
  statement: string | null;
};

type SeatResult = {
  candidateId: string;
  name: string;
  votes: number;
  isWinner: boolean;
  pct: number;
};

type Seat = {
  id: string;
  positionId: string | null;
  title: string;
  sortOrder: number;
  winnerCandidateId: string | null;
  winnerName: string | null;
  seatedAssignmentId: string | null;
  candidates: Candidate[];
  totalBallots: number;
  tie: boolean;
  results: SeatResult[];
};

export type ElectionDetail = {
  id: string;
  title: string;
  termCode: string;
  status: string;
  anonymous: boolean;
  audience: string;
  opensAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  seats: Seat[];
};

type Position = { id: string; title: string; slug: string };
type Brother = { id: string; name: string };

export function ManageElectionClient({
  initial,
  positions,
  brothers,
}: {
  initial: ElectionDetail;
  positions: Position[];
  brothers: Brother[];
}) {
  const { push } = useToast();
  const router = useRouter();
  const [election, setElection] = React.useState<ElectionDetail>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);

  const isDraft = election.status === "DRAFT";
  const isOpen = election.status === "OPEN";
  const isClosed = election.status === "CLOSED";
  const isSeated = election.status === "SEATED";
  const showResults = isClosed || isSeated;

  // Re-pull the whole detail from the server (after mutations that recompute
  // tallies / winners). Keeps the client a thin mirror of server truth.
  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/elections/${election.id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setElection((prev) => ({ ...prev, ...data.election }));
      }
    } catch {
      /* non-fatal — the optimistic state stays */
    }
  }, [election.id]);

  // ── Lifecycle actions ──────────────────────────────────────────────────────
  async function lifecycle(action: "open" | "close" | "seat-winners") {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/elections/${election.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (action === "open") push({ title: "Voting is open", variant: "success" });
      if (action === "close") push({ title: "Voting closed", variant: "success" });
      if (action === "seat-winners") {
        const seated = (data.seated as any[])?.length ?? 0;
        const skipped = (data.skipped as any[])?.length ?? 0;
        push({
          title: `Seated ${seated} ${seated === 1 ? "officer" : "officers"}`,
          description: skipped ? `${skipped} seat(s) skipped (tie or no votes).` : undefined,
          variant: "success",
        });
      }
      await refresh();
      router.refresh();
    } catch (err) {
      push({
        title: "Action failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back + header */}
        <div>
          <Link
            href="/admin/elections"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-phisig-red transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All elections
          </Link>
        </div>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{election.title}</h1>
              <ElectionStatusBadge status={election.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Term {election.termCode} ·{" "}
              {election.anonymous ? "Secret ballot" : "Open ballot"} ·{" "}
              {election.audience === "ALL" ? "Members + alumni" : "Members"}
            </p>
          </div>

          {isDraft && (
            <EditElectionButton
              election={election}
              onSaved={(patch) => setElection((e) => ({ ...e, ...patch }))}
            />
          )}
        </header>

        {/* Lifecycle control bar */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <LifecycleHint status={election.status} />
            <div className="flex items-center gap-2">
              {isDraft && (
                <Button onClick={() => lifecycle("open")} disabled={busy !== null} className="press">
                  {busy === "open" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />}
                  Open voting
                </Button>
              )}
              {isOpen && (
                <Button onClick={() => lifecycle("close")} disabled={busy !== null} className="press">
                  {busy === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Close voting
                </Button>
              )}
              {isClosed && (
                <Button onClick={() => lifecycle("seat-winners")} disabled={busy !== null} className="press">
                  {busy === "seat-winners" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                  Seat winners
                </Button>
              )}
              {isSeated && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-phisig-red">
                  <CheckCircle2 className="h-4 w-4" /> Winners seated as officers
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seats */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {showResults ? "Results" : "Offices on the ballot"}
            </h2>
            {isDraft && (
              <AddSeatButton
                electionId={election.id}
                positions={positions}
                usedPositionIds={election.seats.map((s) => s.positionId).filter(Boolean) as string[]}
                onAdded={(seat) =>
                  setElection((e) => ({
                    ...e,
                    seats: [...e.seats, { ...seat, candidates: [], totalBallots: 0, tie: false, results: [], winnerCandidateId: null, winnerName: null, seatedAssignmentId: null }],
                  }))
                }
              />
            )}
          </div>

          {election.seats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-12 text-center">
              <p className="text-sm font-medium">No offices yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the offices up for election, then nominate candidates for each.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {election.seats.map((seat) => (
                <li key={seat.id}>
                  <SeatCard
                    seat={seat}
                    electionId={election.id}
                    brothers={brothers}
                    isDraft={isDraft}
                    showResults={showResults}
                    isSeated={isSeated}
                    onSeatRemoved={() =>
                      setElection((e) => ({ ...e, seats: e.seats.filter((s) => s.id !== seat.id) }))
                    }
                    onCandidateAdded={(cand) =>
                      setElection((e) => ({
                        ...e,
                        seats: e.seats.map((s) =>
                          s.id === seat.id ? { ...s, candidates: [...s.candidates, cand] } : s,
                        ),
                      }))
                    }
                    onCandidateRemoved={(candidateId) =>
                      setElection((e) => ({
                        ...e,
                        seats: e.seats.map((s) =>
                          s.id === seat.id
                            ? { ...s, candidates: s.candidates.filter((c) => c.id !== candidateId) }
                            : s,
                        ),
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Secret-ballot reassurance */}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          {election.anonymous
            ? "This is a secret ballot — only vote totals are ever shown, never who voted for whom."
            : "Results show vote totals per candidate. Individual votes are never displayed."}
        </p>
      </div>
    </main>
  );
}

// ── Lifecycle hint copy ──────────────────────────────────────────────────────

function LifecycleHint({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "Build the ballot below. Open voting once every office has at least one candidate.",
    OPEN: "Voting is live. Members cast one ballot per office. Close it when the window ends.",
    CLOSED: "Voting is closed. Review the results, then seat the winners as officers.",
    SEATED: "This election is complete and the winners hold their offices for the term.",
  };
  return <p className="max-w-md text-xs text-muted-foreground">{map[status] ?? ""}</p>;
}

// ── Seat card ────────────────────────────────────────────────────────────────

function SeatCard({
  seat,
  electionId,
  brothers,
  isDraft,
  showResults,
  isSeated,
  onSeatRemoved,
  onCandidateAdded,
  onCandidateRemoved,
}: {
  seat: Seat;
  electionId: string;
  brothers: Brother[];
  isDraft: boolean;
  showResults: boolean;
  isSeated: boolean;
  onSeatRemoved: () => void;
  onCandidateAdded: (c: Candidate) => void;
  onCandidateRemoved: (candidateId: string) => void;
}) {
  const { push } = useToast();
  const [removing, setRemoving] = React.useState(false);

  async function removeSeat() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/elections/${electionId}/seats`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId: seat.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSeatRemoved();
      push({ title: "Office removed", variant: "success" });
    } catch (err) {
      push({ title: "Could not remove office", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 shrink-0 text-phisig-red" />
              <p className="truncate text-base font-semibold tracking-tight">{seat.title}</p>
              {seat.positionId ? (
                <Badge className="bg-secondary text-foreground">Officer seat</Badge>
              ) : (
                <Badge className="bg-secondary text-muted-foreground">Custom office</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {seat.candidates.length} {seat.candidates.length === 1 ? "candidate" : "candidates"} ·{" "}
              {seat.totalBallots} {seat.totalBallots === 1 ? "ballot" : "ballots"}
            </p>
          </div>
          {isDraft && (
            <button
              type="button"
              onClick={removeSeat}
              disabled={removing}
              aria-label="Remove office"
              className="press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Tie warning */}
        {showResults && seat.tie && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Tie for the lead — resolve it before this seat can be filled.
          </div>
        )}

        {showResults ? (
          <SeatResults seat={seat} isSeated={isSeated} />
        ) : (
          <CandidateList
            seat={seat}
            electionId={electionId}
            brothers={brothers}
            isDraft={isDraft}
            onCandidateAdded={onCandidateAdded}
            onCandidateRemoved={onCandidateRemoved}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ── Results (aggregate bars) ─────────────────────────────────────────────────

function SeatResults({ seat, isSeated }: { seat: Seat; isSeated: boolean }) {
  if (seat.totalBallots === 0) {
    return <p className="text-sm text-muted-foreground">No ballots were cast for this office.</p>;
  }
  return (
    <div className="space-y-2">
      {seat.results.map((r) => {
        const isWinner = r.isWinner || seat.winnerCandidateId === r.candidateId;
        return (
          <div
            key={r.candidateId}
            className={cn(
              "relative overflow-hidden rounded-lg border bg-background",
              isWinner ? "border-phisig-red" : "border-border",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("absolute inset-y-0 left-0", isWinner ? "bg-phisig-red/15" : "bg-secondary")}
              style={{ width: `${r.pct}%` }}
            />
            <span className="relative flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                {isWinner && <Trophy className="h-4 w-4 shrink-0 text-phisig-red" />}
                <span className="truncate">{r.name}</span>
                {isWinner && isSeated && (
                  <Badge className="bg-phisig-red-soft text-phisig-red">Seated</Badge>
                )}
              </span>
              <span className="flex shrink-0 items-baseline gap-2 text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{r.pct}%</span>
                <span>·</span>
                <span>{r.votes} {r.votes === 1 ? "vote" : "votes"}</span>
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Candidate list + add (DRAFT) ─────────────────────────────────────────────

function CandidateList({
  seat,
  electionId,
  brothers,
  isDraft,
  onCandidateAdded,
  onCandidateRemoved,
}: {
  seat: Seat;
  electionId: string;
  brothers: Brother[];
  isDraft: boolean;
  onCandidateAdded: (c: Candidate) => void;
  onCandidateRemoved: (candidateId: string) => void;
}) {
  const { push } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);

  async function removeCandidate(candidateId: string) {
    try {
      const res = await fetch(`/api/admin/elections/${electionId}/candidates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onCandidateRemoved(candidateId);
    } catch (err) {
      push({ title: "Could not remove candidate", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-2">
      {seat.candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No candidates yet{isDraft ? " — nominate at least one before opening voting." : "."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {seat.candidates.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                {c.statement && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{c.statement}</p>
                )}
              </div>
              {isDraft && (
                <button
                  type="button"
                  onClick={() => removeCandidate(c.id)}
                  aria-label={`Withdraw ${c.name}`}
                  className="press inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isDraft && (
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="press mt-1">
          <UserPlus className="h-3.5 w-3.5" />
          Nominate candidate
        </Button>
      )}

      <AddCandidateDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        electionId={electionId}
        seat={seat}
        brothers={brothers}
        onAdded={onCandidateAdded}
      />
    </div>
  );
}

function AddCandidateDialog({
  open,
  onOpenChange,
  electionId,
  seat,
  brothers,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  electionId: string;
  seat: Seat;
  brothers: Brother[];
  onAdded: (c: Candidate) => void;
}) {
  const { push } = useToast();
  const [brotherId, setBrotherId] = React.useState("");
  const [statement, setStatement] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setBrotherId("");
      setStatement("");
      setSubmitting(false);
    }
  }, [open]);

  // Don't offer brothers already nominated for THIS seat.
  const alreadyIds = new Set(seat.candidates.map((c) => c.brotherId));
  const available = brothers.filter((b) => !alreadyIds.has(b.id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!brotherId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/elections/${electionId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId: seat.id, brotherId, statement: statement.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.candidate) throw new Error(data.error || `HTTP ${res.status}`);
      onAdded(data.candidate);
      push({ title: "Candidate nominated", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      push({ title: "Could not nominate", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nominate a candidate</DialogTitle>
          <DialogDescription>Add a member to the ballot for {seat.title}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="field-glow space-y-1.5">
            <Label htmlFor="cand-brother">Member</Label>
            <select
              id="cand-brother"
              required
              value={brotherId}
              onChange={(e) => setBrotherId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>
                {available.length ? "Select a member…" : "Everyone is already nominated"}
              </option>
              {available.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="field-glow space-y-1.5">
            <Label htmlFor="cand-statement">
              Campaign statement <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Textarea
              id="cand-statement"
              maxLength={1000}
              rows={3}
              placeholder="A short pitch shown to voters."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!brotherId || submitting} className="press">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Adding…</> : <>Add to ballot</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Add seat (DRAFT) ─────────────────────────────────────────────────────────

function AddSeatButton({
  electionId,
  positions,
  usedPositionIds,
  onAdded,
}: {
  electionId: string;
  positions: Position[];
  usedPositionIds: string[];
  onAdded: (seat: { id: string; positionId: string | null; title: string; sortOrder: number }) => void;
}) {
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"position" | "custom">("position");
  const [positionId, setPositionId] = React.useState("");
  const [customTitle, setCustomTitle] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setMode("position");
      setPositionId("");
      setCustomTitle("");
      setSubmitting(false);
    }
  }, [open]);

  const used = new Set(usedPositionIds);
  const available = positions.filter((p) => !used.has(p.id));

  const valid = mode === "position" ? !!positionId : customTitle.trim().length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const payload =
        mode === "position" ? { positionId } : { title: customTitle.trim() };
      const res = await fetch(`/api/admin/elections/${electionId}/seats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.seat) throw new Error(data.error || `HTTP ${res.status}`);
      onAdded(data.seat);
      push({ title: "Office added", variant: "success" });
      setOpen(false);
    } catch (err) {
      push({ title: "Could not add office", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="press">
        <Plus className="h-3.5 w-3.5" />
        Add office
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add an office</DialogTitle>
            <DialogDescription>
              Pick an officer position from the catalog, or name a custom office.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("position")}
                className={cn(
                  "press flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  mode === "position"
                    ? "border-phisig-red bg-phisig-red-soft text-phisig-red"
                    : "border-border text-muted-foreground hover:border-phisig-red/40",
                )}
              >
                Officer position
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={cn(
                  "press flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  mode === "custom"
                    ? "border-phisig-red bg-phisig-red-soft text-phisig-red"
                    : "border-border text-muted-foreground hover:border-phisig-red/40",
                )}
              >
                Custom office
              </button>
            </div>

            {mode === "position" ? (
              <div className="field-glow space-y-1.5">
                <Label htmlFor="seat-position">Position</Label>
                <select
                  id="seat-position"
                  required
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled>
                    {available.length ? "Select a position…" : "All positions are already on the ballot"}
                  </option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground/70">
                  Seating the winner creates an officer assignment for this position.
                </p>
              </div>
            ) : (
              <div className="field-glow space-y-1.5">
                <Label htmlFor="seat-title">Office title</Label>
                <Input
                  id="seat-title"
                  required
                  maxLength={120}
                  placeholder="e.g. Homecoming Chair"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Custom offices record a winner but don&apos;t create an officer assignment.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid || submitting} className="press">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Adding…</> : <>Add office</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit election (DRAFT) ────────────────────────────────────────────────────

function EditElectionButton({
  election,
  onSaved,
}: {
  election: ElectionDetail;
  onSaved: (patch: Partial<ElectionDetail>) => void;
}) {
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(election.title);
  const [termCode, setTermCode] = React.useState(election.termCode);
  const [anonymous, setAnonymous] = React.useState(election.anonymous);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(election.title);
      setTermCode(election.termCode);
      setAnonymous(election.anonymous);
    }
  }, [open, election]);

  const valid = title.trim().length >= 3 && termCode.trim().length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/elections/${election.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), termCode: termCode.trim(), anonymous }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved({ title: title.trim(), termCode: termCode.trim(), anonymous });
      push({ title: "Election updated", variant: "success" });
      setOpen(false);
    } catch (err) {
      push({ title: "Could not update", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="press">
        <Pencil className="h-3.5 w-3.5" />
        Edit details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit election</DialogTitle>
            <DialogDescription>
              You can change these while the election is a draft.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="field-glow space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field-glow space-y-1.5">
              <Label htmlFor="edit-term">Term code</Label>
              <Input id="edit-term" value={termCode} maxLength={20} onChange={(e) => setTermCode(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>Secret ballot</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid || submitting} className="press">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <>Save</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
