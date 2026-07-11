"use client";

import * as React from "react";
import { IconPlus as Plus, IconTrash as Trash2, IconLock as Lock, IconClock as Clock, IconCheckCircle as CheckCircle2, IconXCircle as XCircle, IconSpinner as Loader2 } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type PollOption = { id: string; label: string };

type Poll = {
  id: string;
  question: string;
  audience?: string;
  options: PollOption[];
  counts: Record<string, number>;
  totalVotes: number;
  createdAt: string;
  closesAt: string | null;
  closedAt: string | null;
  createdBy: { id: string; name: string };
  mineOptionId: string | null;
  isMine: boolean;
};

type Props = {
  /** True if the current viewer was logged in via the global admin login. */
  isAdmin?: boolean;
};

const QUESTION_MIN = 5;
const QUESTION_MAX = 280;
const OPTION_MIN = 2;
const OPTION_MAX = 6;

export function PollsFeed({ isAdmin = false }: Props) {
  const { push } = useToast();
  const [polls, setPolls] = React.useState<Poll[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  // Confirm dialog (replaces window.confirm) for deleting a poll.
  const [deletePollId, setDeletePollId] = React.useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  // Re-tick once a minute so "Closes in 3h" / "2h ago" stay fresh while the
  // page is open. Cheap setInterval — no network.
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/polls", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          setPolls([]);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { ok: boolean; polls: Poll[] };
      if (data.ok) setPolls(data.polls);
    } catch {
      push({ title: "Could not load polls", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [push]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleCreated = React.useCallback((poll: Poll) => {
    setPolls((prev) => [poll, ...prev]);
  }, []);

  const handleVote = React.useCallback(
    async (pollId: string, optionId: string) => {
      // Optimistic: paint immediately, rollback on error.
      const prev = polls;
      setPolls((curr) =>
        curr.map((p) => {
          if (p.id !== pollId) return p;
          const nextCounts = { ...p.counts };
          if (p.mineOptionId && nextCounts[p.mineOptionId] !== undefined) {
            nextCounts[p.mineOptionId] = Math.max(
              0,
              nextCounts[p.mineOptionId] - 1,
            );
          }
          nextCounts[optionId] = (nextCounts[optionId] ?? 0) + 1;
          const wasNew = p.mineOptionId === null;
          return {
            ...p,
            counts: nextCounts,
            mineOptionId: optionId,
            totalVotes: wasNew ? p.totalVotes + 1 : p.totalVotes,
          };
        }),
      );
      try {
        const res = await fetch(`/api/polls/${pollId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        setPolls(prev);
        push({ title: "Could not record your vote", variant: "destructive" });
      }
    },
    [polls, push],
  );

  const handleUnvote = React.useCallback(
    async (pollId: string) => {
      const prev = polls;
      setPolls((curr) =>
        curr.map((p) => {
          if (p.id !== pollId) return p;
          if (!p.mineOptionId) return p;
          const nextCounts = { ...p.counts };
          if (nextCounts[p.mineOptionId] !== undefined) {
            nextCounts[p.mineOptionId] = Math.max(
              0,
              nextCounts[p.mineOptionId] - 1,
            );
          }
          return {
            ...p,
            counts: nextCounts,
            mineOptionId: null,
            totalVotes: Math.max(0, p.totalVotes - 1),
          };
        }),
      );
      try {
        const res = await fetch(`/api/polls/${pollId}/vote`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        setPolls(prev);
        push({ title: "Could not clear your vote", variant: "destructive" });
      }
    },
    [polls, push],
  );

  const handleClose = React.useCallback(
    async (pollId: string) => {
      const prev = polls;
      setPolls((curr) =>
        curr.map((p) =>
          p.id === pollId
            ? { ...p, closedAt: new Date().toISOString() }
            : p,
        ),
      );
      try {
        const res = await fetch(`/api/polls/${pollId}/close`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        push({ title: "Poll closed", variant: "success" });
      } catch {
        setPolls(prev);
        push({ title: "Could not close poll", variant: "destructive" });
      }
    },
    [polls, push],
  );

  // Open the confirm dialog; the actual delete runs in doDeletePoll on confirm.
  const handleDelete = React.useCallback((pollId: string) => {
    setDeletePollId(pollId);
  }, []);

  const doDeletePoll = React.useCallback(async () => {
    const pollId = deletePollId;
    if (!pollId) return;
    setDeleteBusy(true);
    const prev = polls;
    setPolls((curr) => curr.filter((p) => p.id !== pollId));
    try {
      const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      push({ title: "Poll deleted", variant: "success" });
      setDeletePollId(null);
    } catch {
      setPolls(prev);
      push({ title: "Could not delete poll", variant: "destructive" });
    } finally {
      setDeleteBusy(false);
    }
  }, [deletePollId, polls, push]);

  return (
    <section className="space-y-4">
      {/* Section title removed — page-level <h1> in app/admin/polls/page.tsx
          serves as the top heading. This row is now just the action bar. */}
      <div className="flex items-end justify-end gap-3">
        <Button onClick={() => setCreateOpen(true)} className="press">
          <Plus className="h-4 w-4" />
          <span>Create poll</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading polls…
        </div>
      ) : polls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-12 text-center">
          <p className="text-sm font-medium">No polls yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start one above to get the chapter&apos;s pulse on something.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {polls.map((p, i) => (
            <li
              key={p.id}
              className="animate-soft-enter"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <PollCard
                poll={p}
                now={now}
                isAdmin={isAdmin}
                onVote={handleVote}
                onUnvote={handleUnvote}
                onClose={handleClose}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      )}

      <CreatePollDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {/* ---------- Confirm Dialog (replaces window.confirm) ---------- */}
      <Dialog open={!!deletePollId} onOpenChange={(o) => !deleteBusy && !o && setDeletePollId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete poll?</DialogTitle>
            <DialogDescription>
              Delete this poll? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePollId(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button
              onClick={doDeletePoll}
              disabled={deleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---- PollCard --------------------------------------------------------------

type PollCardProps = {
  poll: Poll;
  now: number;
  isAdmin: boolean;
  onVote: (pollId: string, optionId: string) => void;
  onUnvote: (pollId: string) => void;
  onClose: (pollId: string) => void;
  onDelete: (pollId: string) => void;
};

function PollCard({
  poll,
  now,
  isAdmin,
  onVote,
  onUnvote,
  onClose,
  onDelete,
}: PollCardProps) {
  const closed = isPollClosed(poll, now);
  const canManage = isAdmin || poll.isMine;
  const showResults = closed || poll.mineOptionId !== null;

  return (
    <Card className="lift overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[1.1rem] font-semibold leading-snug tracking-tight">
              {poll.question}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                by {firstNameLastInitial(poll.createdBy.name)}
              </span>
              <span>{relativeTime(now, new Date(poll.createdAt).getTime())}</span>
              <PollStatusChip poll={poll} now={now} />
            </div>
          </div>

          {canManage && !closed && (
            <button
              type="button"
              onClick={() => onClose(poll.id)}
              className="press inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-phisig-red/40 hover:bg-phisig-red-soft hover:text-phisig-red"
            >
              <Lock className="h-3.5 w-3.5" />
              Close
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => onDelete(poll.id)}
              aria-label="Delete poll"
              className="press inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showResults ? (
          <PollResults
            poll={poll}
            disabled={closed}
            onSwitch={(optionId) => onVote(poll.id, optionId)}
            onClear={() => onUnvote(poll.id)}
          />
        ) : (
          <div
            role="radiogroup"
            aria-label={`Vote options for: ${poll.question}`}
            className="grid gap-2"
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const target = e.target as HTMLElement;
              const buttons = Array.from(target.closest('[role="radiogroup"]')?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []);
              const i = buttons.indexOf(target as HTMLButtonElement);
              if (i === -1) return;
              const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
              const next = buttons[(i + dir + buttons.length) % buttons.length];
              next?.focus();
            }}
          >
            {poll.options.map((o, idx) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={false}
                tabIndex={idx === 0 ? 0 : -1}
                onClick={() => onVote(poll.id, o.id)}
                className="press group inline-flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left text-sm font-medium transition-colors hover:border-phisig-red/40 hover:bg-phisig-red-soft focus-visible:border-phisig-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/30"
              >
                <span className="truncate pr-3">{o.label}</span>
                <span className="text-xs text-muted-foreground transition-colors group-hover:text-phisig-red">
                  Tap to vote
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
          </span>
          {poll.mineOptionId && !closed && (
            <button
              type="button"
              onClick={() => onUnvote(poll.id)}
              className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-phisig-red"
            >
              <XCircle className="h-3.5 w-3.5" />
              Clear my vote
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- PollResults (bar viz) -------------------------------------------------

function PollResults({
  poll,
  disabled,
  onSwitch,
  onClear: _onClear,
}: {
  poll: Poll;
  disabled: boolean;
  onSwitch: (optionId: string) => void;
  onClear: () => void;
}) {
  const total = Math.max(1, poll.totalVotes);
  return (
    <div
      role="radiogroup"
      aria-label={`Results for: ${poll.question}`}
      className="space-y-2"
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const target = e.target as HTMLElement;
        const buttons = Array.from(target.closest('[role="radiogroup"]')?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])') ?? []);
        const i = buttons.indexOf(target as HTMLButtonElement);
        if (i === -1) return;
        const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
        const next = buttons[(i + dir + buttons.length) % buttons.length];
        next?.focus();
      }}
    >
      {poll.options.map((o, idx) => {
        const count = poll.counts[o.id] ?? 0;
        const pct = Math.round((count / total) * 100);
        const mine = poll.mineOptionId === o.id;
        const firstFocusable = !disabled && (mine || (!poll.mineOptionId && idx === 0));
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (!mine) onSwitch(o.id);
            }}
            role="radio"
            aria-checked={mine}
            aria-label={`${o.label} — ${pct} percent, ${count} ${count === 1 ? "vote" : "votes"}`}
            tabIndex={firstFocusable ? 0 : -1}
            className={cn(
              "press group relative w-full overflow-hidden rounded-lg border bg-background text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/30",
              mine
                ? "border-phisig-red bg-phisig-red-soft"
                : "border-border hover:border-phisig-red/40",
              disabled && "cursor-default",
            )}
          >
            {/* Bar fill — width transitions on count change. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out",
                mine ? "bg-phisig-red/20" : "bg-secondary",
              )}
              style={{ width: `${poll.totalVotes === 0 ? 0 : pct}%` }}
            />
            <span className="relative flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                {mine && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-phisig-red" aria-hidden="true" />
                )}
                <span className="truncate">{o.label}</span>
              </span>
              <span aria-hidden="true" className="flex shrink-0 items-baseline gap-2 text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{pct}%</span>
                <span>·</span>
                <span>
                  {count} {count === 1 ? "vote" : "votes"}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---- Status chip -----------------------------------------------------------

function PollStatusChip({ poll, now }: { poll: Poll; now: number }) {
  if (isPollClosed(poll, now)) {
    return (
      <Badge className="bg-secondary text-foreground">
        <Lock className="mr-1 h-3 w-3" />
        Closed
      </Badge>
    );
  }
  if (poll.closesAt) {
    const ms = new Date(poll.closesAt).getTime() - now;
    return (
      <Badge className="bg-amber-50 text-amber-900">
        <Clock className="mr-1 h-3 w-3" />
        Closes in {humanDuration(ms)}
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-50 text-emerald-900">
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Open
    </Badge>
  );
}

// ---- CreatePollDialog ------------------------------------------------------

function CreatePollDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (p: Poll) => void;
}) {
  const { push } = useToast();
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState<string[]>(["", ""]);
  const [closesAt, setClosesAt] = React.useState("");
  // R46 — audience selector. Default BROTHERS (matches prior behavior);
  // ALUMNI routes the poll to the alumni portal feed; ALL reaches both.
  const [audience, setAudience] = React.useState<"BROTHERS" | "ALUMNI" | "ALL">("BROTHERS");
  const [submitting, setSubmitting] = React.useState(false);

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      setQuestion("");
      setOptions(["", ""]);
      setClosesAt("");
      setAudience("BROTHERS");
      setSubmitting(false);
    }
  }, [open]);

  const validation = React.useMemo(() => {
    const q = question.trim();
    if (q.length < QUESTION_MIN)
      return `Question must be at least ${QUESTION_MIN} characters`;
    if (q.length > QUESTION_MAX)
      return `Question must be ${QUESTION_MAX} characters or fewer`;
    const cleaned = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleaned.length < OPTION_MIN) return "Add at least 2 options";
    const seen = new Set<string>();
    for (const c of cleaned) {
      const key = c.toLowerCase();
      if (seen.has(key)) return "Options must be unique";
      seen.add(key);
    }
    return null;
  }, [question, options]);

  function addOption() {
    setOptions((curr) => (curr.length >= OPTION_MAX ? curr : [...curr, ""]));
  }

  function removeOption(idx: number) {
    setOptions((curr) =>
      curr.length <= OPTION_MIN
        ? curr
        : curr.filter((_, i) => i !== idx),
    );
  }

  function setOptionAt(idx: number, value: string) {
    setOptions((curr) => curr.map((o, i) => (i === idx ? value : o)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (validation || submitting) return;
    setSubmitting(true);
    try {
      const cleaned = options.map((o) => o.trim()).filter((o) => o.length > 0);
      const body: { question: string; options: string[]; closesAt?: string; audience: string } = {
        question: question.trim(),
        options: cleaned,
        audience,
      };
      if (closesAt) {
        // datetime-local is in local TZ — convert to ISO for the API.
        const d = new Date(closesAt);
        if (Number.isFinite(d.getTime())) body.closesAt = d.toISOString();
      }
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok: boolean;
        poll?: Poll;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.poll) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onCreated(data.poll);
      push({ title: "Poll posted", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      push({
        title: "Could not create poll",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a poll</DialogTitle>
          <DialogDescription>
            Ask the chapter something. Brothers vote anonymously — only the
            tally is shown.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="field-glow space-y-1.5">
            <label
              htmlFor="poll-question"
              className="text-xs font-medium text-muted-foreground"
            >
              Question
            </label>
            <Textarea
              id="poll-question"
              required
              maxLength={QUESTION_MAX}
              placeholder="e.g. When should we host the next mixer?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
            />
            <p className="text-[10px] text-muted-foreground">
              {question.trim().length}/{QUESTION_MAX}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Options ({options.length}/{OPTION_MAX})
            </p>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="field-glow flex items-center gap-2">
                  <Input
                    aria-label={`Option ${i + 1}`}
                    placeholder={`Option ${i + 1}`}
                    maxLength={120}
                    value={o}
                    onChange={(e) => setOptionAt(i, e.target.value)}
                  />
                  {options.length > OPTION_MIN && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      aria-label={`Remove option ${i + 1}`}
                      className="press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < OPTION_MAX && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="press mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </Button>
            )}
          </div>

          <div className="field-glow space-y-1.5">
            <label
              htmlFor="poll-closes-at"
              className="text-xs font-medium text-muted-foreground"
            >
              Closes at <span className="text-muted-foreground/70">(optional)</span>
            </label>
            <Input
              id="poll-closes-at"
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>

          {/* R46 — audience selector. Routes the poll to the right feed:
              brothers (default), alumni portal, or both. */}
          <div className="field-glow space-y-1.5">
            <label
              htmlFor="poll-audience"
              className="text-xs font-medium text-muted-foreground"
            >
              Who can vote?
            </label>
            <select
              id="poll-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as "BROTHERS" | "ALUMNI" | "ALL")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="BROTHERS">Active brothers only</option>
              <option value="ALUMNI">Alumni only</option>
              <option value="ALL">Everyone (brothers + alumni)</option>
            </select>
            <p className="text-[11px] text-muted-foreground/70">
              Alumni see their polls in the alumni portal dashboard.
            </p>
          </div>

          {validation && (
            <p className="text-xs font-medium text-red-600">{validation}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!!validation || submitting}
              className="press"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting…
                </>
              ) : (
                <>Post poll</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Helpers ---------------------------------------------------------------

function isPollClosed(poll: Poll, now: number): boolean {
  if (poll.closedAt) return true;
  if (poll.closesAt && new Date(poll.closesAt).getTime() <= now) return true;
  return false;
}

function firstNameLastInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Brother";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function relativeTime(now: number, then: number): string {
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function humanDuration(ms: number): string {
  if (ms <= 0) return "soon";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}
