"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Vote, Lock, CheckCircle2, Loader2, ArrowLeft, Trophy, ShieldCheck, AlertTriangle, Users,
} from "lucide-react";

/**
 * Member officer-elections voter (brothers portal). Mirrors the maroon/cream
 * styling of BrothersDashboardClient. Talks to:
 *   GET  /api/portal/brothers/elections           — open + recently-concluded
 *   POST /api/portal/brothers/elections/[id]/ballot — cast all seat choices
 *
 * SECRET BALLOT: the API only ever tells THIS member their own selection
 * (`myCandidateId`) and aggregate counts. Nobody's individual vote is shown.
 * Double-voting is impossible: each seat ballot is permanent (one row per
 * seat+voter), and the server treats a re-submit on a voted seat as a no-op.
 */

type Candidate = { id: string; name: string; statement: string | null };
type SeatResult = { candidateId: string; name: string; votes: number; isWinner: boolean; pct: number };

type Seat = {
  id: string;
  title: string;
  candidates: Candidate[];
  myCandidateId: string | null;
  hasVoted: boolean;
  totalBallots: number;
  winnerName: string | null;
  winnerCandidateId: string | null;
  results: SeatResult[] | null;
};

type Election = {
  id: string;
  title: string;
  termCode: string;
  status: string;
  anonymous: boolean;
  open: boolean;
  concluded: boolean;
  opensAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  seats: Seat[];
  seatCount: number;
  votedSeatCount: number;
};

const CARD = "bg-white/90 backdrop-blur rounded-2xl border border-maroon-100 shadow-[0_8px_30px_-18px_rgba(74,17,29,0.35)]";

export default function ElectionsVoter({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [elections, setElections] = React.useState<Election[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/portal/brothers/elections", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ok: boolean; elections: Election[] };
      if (data.ok) setElections(data.elections);
    } catch {
      setError("Could not load elections. Pull to refresh or try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950">
      <header className="bg-white/85 backdrop-blur-xl border-b border-maroon-100 px-4 sm:px-6 py-4 shadow-[0_4px_20px_-12px_rgba(74,17,29,0.25)] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-700 to-maroon-900 text-cream-50 flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(74,17,29,0.6)] ring-1 ring-maroon-900/20">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-maroon-900 leading-tight">Officer Elections</h1>
              <p className="text-xs text-maroon-600">Cast your secret ballot</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/portal/brothers/dashboard")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 hover:text-maroon-900 border border-maroon-100 rounded-lg px-3 py-1.5 hover:bg-cream-50 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {isAdmin && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin preview
          </div>
        )}

        {loading ? (
          <div role="status" aria-live="polite" className={`${CARD} flex items-center justify-center gap-2 py-16 text-sm text-maroon-600`}>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Loading elections…
          </div>
        ) : error ? (
          <div role="alert" aria-live="assertive" className={`${CARD} px-5 py-10 text-center`}>
            <AlertTriangle className="mx-auto h-6 w-6 text-amber-600" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-maroon-900">{error}</p>
            <button
              onClick={() => { setLoading(true); setError(null); void load(); }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-maroon-700 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-maroon-800"
            >
              Retry
            </button>
          </div>
        ) : elections.length === 0 ? (
          <div className={`${CARD} px-5 py-16 text-center`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream-100 text-maroon-500">
              <Vote className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-maroon-900">No elections right now</p>
            <p className="mt-1 text-sm text-maroon-600">
              When the chapter opens officer voting, the ballot will show up here.
            </p>
          </div>
        ) : (
          elections.map((e) => (
            <ElectionCard key={e.id} election={e} onVoted={load} />
          ))
        )}
      </div>
    </div>
  );
}

function ElectionCard({ election, onVoted }: { election: Election; onVoted: () => void }) {
  // Local draft of the member's selections per seat (seatId → candidateId).
  const [picks, setPicks] = React.useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of election.seats) if (s.myCandidateId) init[s.id] = s.myCandidateId;
    return init;
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const concluded = election.concluded;
  const open = election.open && !concluded;

  // Seats the member still needs to vote on (open elections only).
  const unvotedSeats = election.seats.filter((s) => !s.hasVoted);
  const allVoted = unvotedSeats.length === 0;
  // Which unvoted seats have a pending selection ready to submit.
  const readyCount = unvotedSeats.filter((s) => picks[s.id]).length;

  async function submit() {
    // Only submit seats that are unvoted AND have a selection.
    const ballots = unvotedSeats
      .filter((s) => picks[s.id])
      .map((s) => ({ seatId: s.id, candidateId: picks[s.id] }));
    if (ballots.length === 0) return;
    setSubmitting(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/portal/brothers/elections/${election.id}/ballot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ballots }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const recorded = (data.recordedSeatIds as string[])?.length ?? 0;
      setMsg(
        recorded > 0
          ? `Ballot recorded for ${recorded} ${recorded === 1 ? "office" : "offices"}. Thank you for voting!`
          : "Your votes were already counted.",
      );
      // Re-pull so the seats flip to their voted state with confirmation.
      onVoted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not record your ballot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`${CARD} overflow-hidden`}>
      {/* Election header */}
      <div className="border-b border-maroon-50 bg-gradient-to-r from-cream-50 to-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-maroon-900">{election.title}</h2>
            <p className="text-xs text-maroon-600">Term {election.termCode}</p>
          </div>
          {concluded ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon-100 px-3 py-1 text-xs font-semibold text-maroon-800">
              <Lock className="h-3.5 w-3.5" /> Results
            </span>
          ) : open ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Voting open
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Lock className="h-3.5 w-3.5" /> Closed
            </span>
          )}
        </div>
        {open && (
          <p className="mt-2 text-xs text-maroon-600">
            {allVoted
              ? "You've voted in every office on this ballot."
              : `One choice per office · ${election.votedSeatCount}/${election.seatCount} done`}
          </p>
        )}
      </div>

      {/* Seats */}
      <div className="space-y-4 p-5">
        {election.seats.map((seat) => (
          <SeatBlock
            key={seat.id}
            seat={seat}
            open={open}
            concluded={concluded}
            value={picks[seat.id] ?? null}
            onSelect={(candidateId) =>
              setPicks((p) => ({ ...p, [seat.id]: candidateId }))
            }
          />
        ))}
      </div>

      {/* Submit bar (open + something left to vote) */}
      {open && !allVoted && (
        <div className="border-t border-maroon-50 bg-cream-50/60 px-5 py-4">
          {err && (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" /> {err}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-maroon-600">
              {readyCount > 0
                ? `${readyCount} ${readyCount === 1 ? "choice" : "choices"} ready to submit`
                : "Select your candidate(s) above"}
            </p>
            <button
              onClick={submit}
              disabled={submitting || readyCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-maroon-700 to-maroon-900 px-4 py-2 text-sm font-semibold text-cream-50 shadow-[0_6px_16px_-6px_rgba(74,17,29,0.6)] ring-1 ring-maroon-900/20 transition hover:from-maroon-800 hover:to-maroon-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit ballot
            </button>
          </div>
        </div>
      )}

      {/* Voted confirmation / closed note */}
      {open && allVoted && (
        <div className="border-t border-maroon-50 bg-emerald-50/60 px-5 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {msg ?? "Your ballot is in. Results post when voting closes."}
          </p>
        </div>
      )}
      {msg && open && !allVoted && (
        <div className="border-t border-maroon-50 bg-emerald-50/60 px-5 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> {msg}
          </p>
        </div>
      )}
    </section>
  );
}

function SeatBlock({
  seat,
  open,
  concluded,
  value,
  onSelect,
}: {
  seat: Seat;
  open: boolean;
  concluded: boolean;
  value: string | null;
  onSelect: (candidateId: string) => void;
}) {
  const locked = seat.hasVoted || !open; // can't change a cast/closed seat

  return (
    <div className="rounded-xl border border-maroon-100 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-maroon-900">
          <Users className="h-4 w-4 text-maroon-500" />
          {seat.title}
        </h3>
        {seat.hasVoted && !concluded && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Voted
          </span>
        )}
      </div>

      {/* Results view (concluded) */}
      {concluded ? (
        seat.totalBallots === 0 ? (
          <p className="text-xs text-maroon-500">No votes were cast for this office.</p>
        ) : (
          <div className="space-y-1.5">
            {(seat.results ?? []).map((r) => {
              const isWinner = r.isWinner || seat.winnerCandidateId === r.candidateId;
              return (
                <div
                  key={r.candidateId}
                  className={`relative overflow-hidden rounded-lg border ${isWinner ? "border-maroon-600" : "border-maroon-100"}`}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-y-0 left-0 ${isWinner ? "bg-maroon-600/15" : "bg-cream-100"}`}
                    style={{ width: `${r.pct}%` }}
                  />
                  <span className="relative flex items-center justify-between gap-2 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-maroon-900">
                      {isWinner && <Trophy className="h-3.5 w-3.5 shrink-0 text-maroon-700" />}
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-maroon-600 tabular-nums">
                      <span className="font-semibold text-maroon-900">{r.pct}%</span> · {r.votes}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Voting view (open) — radio per candidate */
        <div role="radiogroup" aria-label={`Candidates for ${seat.title}`} className="space-y-1.5">
          {seat.candidates.length === 0 ? (
            <p className="text-xs text-maroon-500">No candidates listed.</p>
          ) : (
            seat.candidates.map((c) => {
              const selected = (seat.hasVoted ? seat.myCandidateId : value) === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={locked}
                  onClick={() => !locked && onSelect(c.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-maroon-600 bg-maroon-50"
                      : "border-maroon-100 bg-white hover:border-maroon-300"
                  } ${locked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-maroon-600 bg-maroon-600" : "border-maroon-300"
                    }`}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-maroon-900">{c.name}</span>
                    {c.statement && (
                      <span className="mt-0.5 block text-xs text-maroon-600">{c.statement}</span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
