"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconShieldCheck,
  IconRoles,
  IconMembers,
  IconCheck,
  IconCheckCircle,
  IconClose,
  IconExternal,
  IconSecurity,
  IconActive,
  IconSuspend,
} from "@/components/brand/icons";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* Dependency-free glyphs (matching the rest of the platform console, which
   deliberately drops lucide-react in favor of inline brand-tinted SVG): a busy
   spinner, a back arrow, a swap arrow, and a warning triangle. */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]",
        className ?? "h-4 w-4",
      )}
    />
  );
}
function BackGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className ?? "h-4 w-4")}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function SwapGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className ?? "h-4 w-4")}>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13a4 4 0 0 1 4 4M17 20l4-4-4-4" />
      <path d="M21 16H8a4 4 0 0 1-4-4" />
    </svg>
  );
}
function AlertGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className ?? "h-4 w-4")}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

// ── Shared types (mirror the API JSON) ───────────────────────────────────────
type Holder = {
  assignmentId: string;
  brotherId: string;
  brotherName: string;
  termCode: string;
  startDate: string;
};
type Position = {
  positionId: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  holder: Holder | null;
};
type RosterBrother = { id: string; name: string; email: string | null; status: string };
type Account = {
  name: string | null;
  school: string | null;
  subdomain: string;
  isActive: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  memberCount: number;
  activeMemberCount: number;
  adminCount: number;
  primaryAdminName: string | null;
  primaryAdminEmail: string | null;
};
type View = {
  positions: Position[];
  roster: RosterBrother[];
  currentTerm: string;
  account: Account;
};

export default function ChapterOfficerConsole({
  tenantId,
  subdomain,
  chapterName,
  initial,
}: {
  tenantId: string;
  subdomain: string;
  chapterName: string | null;
  initial: View;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  // Per-position selected candidate (positionId → brotherId | "" for vacate).
  const [picks, setPicks] = React.useState<Record<string, string>>({});
  // The position queued for a confirm dialog.
  const [confirming, setConfirming] = React.useState<Position | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const apiBase = `/api/platform/tenants/${tenantId}/officers`;

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(apiBase, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/platform/login");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "Failed to refresh");
        return;
      }
      setView({ positions: j.positions, roster: j.roster, currentTerm: j.currentTerm, account: j.account });
    } catch {
      setError("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [apiBase, router]);

  // The label for the currently-selected candidate of a position (for the dialog).
  function pickedName(p: Position): string {
    const id = picks[p.positionId];
    if (id === "") return "— Vacate seat —";
    if (!id) return p.holder?.brotherName ?? "(unchanged)";
    return view.roster.find((b) => b.id === id)?.name ?? "(unknown)";
  }

  function openConfirm(p: Position) {
    setError(null);
    setNotice(null);
    setConfirming(p);
  }

  async function doSwitch() {
    if (!confirming) return;
    const p = confirming;
    const raw = picks[p.positionId];
    // "" means vacate (send null). undefined shouldn't reach here (button guards).
    const brotherId = raw === "" ? null : raw ?? null;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionId: p.positionId, brotherId }),
      });
      if (res.status === 401) {
        router.push("/platform/login");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "Could not update the seat");
        return;
      }
      setView({ positions: j.positions, roster: j.roster, currentTerm: j.currentTerm, account: j.account });
      // Clear this position's pending pick + close.
      setPicks((prev) => {
        const next = { ...prev };
        delete next[p.positionId];
        return next;
      });
      const sw = j.switched;
      setNotice(
        sw?.newHolderName
          ? `${p.title}: ${sw.previousHolderName ?? "(vacant)"} → ${sw.newHolderName} for ${sw.termCode}.`
          : `${p.title} vacated for ${sw?.termCode ?? view.currentTerm}.`,
      );
      setConfirming(null);
    } catch {
      setError("Could not update the seat");
    } finally {
      setSaving(false);
    }
  }

  const filledCount = view.positions.filter((p) => p.holder).length;
  const vacantCount = view.positions.length - filledCount;
  const acct = view.account;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AnimatedBackground variant="aurora-grid" tone="platform" className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconChip icon={IconRoles} tone="platform" size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#2563eb] via-[#0ea5e9] to-[#38bdf8] bg-clip-text text-transparent">
                    Greekstack
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 ring-1 ring-blue-200">Owner Console</Badge>
                </div>
                <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                  {chapterName || subdomain} — officer roles
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Switch who holds each e-board position. Seats the new officer for{" "}
                  <span className="font-semibold text-slate-700">{view.currentTerm}</span> and ends the prior holder.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/platform")}>
                <BackGlyph /> All chapters
              </Button>
              <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
                {refreshing ? <Spinner /> : <IconActive className="h-4 w-4" />} Refresh
              </Button>
              <a
                href={`https://${subdomain}.greekstack.vercel.app`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                Visit site <IconExternal className="h-3.5 w-3.5 opacity-70" />
              </a>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={IconRoles} label="Positions" value={view.positions.length} tone="blue" />
            <StatTile icon={IconCheckCircle} label="Filled" value={filledCount} tone="emerald" />
            <StatTile icon={IconSuspend} label="Vacant" value={vacantCount} tone="amber" />
            <StatTile icon={IconMembers} label="Members" value={acct.memberCount} tone="blue" />
          </div>
        </div>
      </AnimatedBackground>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertGlyph className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <IconCheck className="mt-0.5 h-4 w-4" />
            <span>{notice}</span>
          </div>
        )}

        {/* Account glance — read-only */}
        <AccountGlance account={acct} subdomain={subdomain} currentTerm={view.currentTerm} />

        {/* Officer positions */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">E-board positions</h2>
            <span className="text-xs text-slate-400">{view.positions.length} positions</span>
          </div>

          {view.positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <IconChip icon={IconRoles} tone="muted" size="lg" />
              <div>
                <p className="text-sm font-medium text-slate-700">No officer positions defined</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  This chapter hasn&apos;t set up its e-board positions yet.
                </p>
              </div>
            </div>
          ) : view.roster.length === 0 ? (
            <div className="px-5 py-6 text-sm text-amber-700">
              This chapter has no seatable members yet, so positions can&apos;t be assigned. Members appear here once
              the chapter adds its roster.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {view.positions.map((p) => {
                const pick = picks[p.positionId];
                const dirty = pick !== undefined && (pick === "" ? !!p.holder : pick !== p.holder?.brotherId);
                return (
                  <li key={p.positionId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{p.title}</span>
                        {p.holder ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                            <IconCheck className="h-3 w-3" /> Filled
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                            <IconClose className="h-3 w-3" /> Vacant
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {p.holder ? (
                          <>
                            Currently:{" "}
                            <span className="font-medium text-slate-700">{p.holder.brotherName}</span>{" "}
                            <span className="text-slate-400">· term {p.holder.termCode}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">No one is seated in this position.</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:w-[26rem] sm:shrink-0">
                      <label className="sr-only" htmlFor={`pick-${p.positionId}`}>
                        New holder for {p.title}
                      </label>
                      <select
                        id={`pick-${p.positionId}`}
                        value={pick ?? (p.holder?.brotherId ?? "")}
                        onChange={(e) =>
                          setPicks((prev) => ({ ...prev, [p.positionId]: e.target.value }))
                        }
                        className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                      >
                        <option value="">— Vacant (no one) —</option>
                        {view.roster.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                            {b.status !== "ACTIVE" ? ` (${b.status.toLowerCase()})` : ""}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="platform"
                        size="sm"
                        disabled={!dirty}
                        onClick={() => openConfirm(p)}
                        className="shrink-0"
                      >
                        <SwapGlyph /> Switch
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Switching a holder ends the prior officer&apos;s term and seats the new one for {view.currentTerm}, using the
          same logic the chapter&apos;s elections use to install winners. Every switch is recorded in this chapter&apos;s
          audit log.
        </p>
      </div>

      {/* Confirm switch */}
      <Dialog open={!!confirming} onOpenChange={(open) => !open && !saving && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 ring-1 ring-blue-200">
              <SwapGlyph className="h-5 w-5" />
            </div>
            <DialogTitle>Switch {confirming?.title}?</DialogTitle>
            <DialogDescription>
              {confirming && (
                <>
                  This seats{" "}
                  <span className="font-semibold text-slate-700">{pickedName(confirming)}</span>{" "}
                  as <span className="font-semibold text-slate-700">{confirming.title}</span> for{" "}
                  <span className="font-mono text-xs">{view.currentTerm}</span>
                  {confirming.holder ? (
                    <>
                      {" "}
                      and ends{" "}
                      <span className="font-semibold text-slate-700">{confirming.holder.brotherName}</span>
                      &apos;s term.
                    </>
                  ) : (
                    <>.</>
                  )}{" "}
                  This change takes effect immediately for {chapterName || subdomain}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="platform" onClick={doSwitch} disabled={saving}>
              {saving ? (
                <>
                  <Spinner /> Switching…
                </>
              ) : (
                <>
                  <IconCheck className="h-4 w-4" /> Confirm switch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Read-only chapter account summary. */
function AccountGlance({
  account,
  subdomain,
  currentTerm,
}: {
  account: Account;
  subdomain: string;
  currentTerm: string;
}) {
  function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  }
  const statusLabel = account.subscriptionStatus || (account.plan ? "—" : "no plan");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Chapter account</h2>
          {account.isActive ? (
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
              <IconCheck className="h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge className="gap-1 bg-amber-100 text-amber-800 ring-1 ring-amber-200">
              <IconClose className="h-3 w-3" /> Suspended
            </Badge>
          )}
        </div>
        <span className="font-mono text-xs text-slate-400">term {currentTerm}</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Subdomain" value={subdomain} mono />
        <Field label="School" value={account.school || "—"} />
        <Field label="Plan" value={account.plan || "—"} />
        <Field label="Billing" value={statusLabel} />
        <Field label="Members" value={`${account.memberCount} (${account.activeMemberCount} active)`} />
        <Field label="Trial ends" value={fmtDate(account.trialEndsAt)} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-slate-100 px-5 py-3 text-sm">
        <span className="text-slate-500">
          Primary admin:{" "}
          <span className="font-medium text-slate-700">{account.primaryAdminName || "—"}</span>
        </span>
        {account.primaryAdminEmail && (
          <a href={`mailto:${account.primaryAdminEmail}`} className="text-blue-600 hover:underline">
            {account.primaryAdminEmail}
          </a>
        )}
        <span className="text-slate-400">
          {account.adminCount} admin{account.adminCount === 1 ? "" : "s"} on this chapter
        </span>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-0.5 truncate text-sm text-slate-800", mono && "font-mono")} title={value}>
        {value}
      </p>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "blue" | "emerald" | "amber";
}) {
  const toneCls = {
    blue: "from-[#2563eb]/15 to-[#38bdf8]/10 text-[#2563eb] ring-[#2563eb]/20",
    emerald: "from-emerald-500/15 to-emerald-400/10 text-emerald-600 ring-emerald-500/20",
    amber: "from-amber-500/15 to-amber-400/10 text-amber-600 ring-amber-500/20",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ring-1", toneCls)}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
    </div>
  );
}
