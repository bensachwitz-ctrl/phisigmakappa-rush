"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  Loader2,
  ChevronRight,
  X,
  Users,
  GitBranch,
  UserPlus,
  Crown,
  CornerDownRight,
  Link2Off,
  Check,
} from "lucide-react";
import { IconFamily } from "@/components/brand/icons/family";
import { cn } from "@/lib/utils";

import { IconSpark } from "@/components/brand/icons";
/* ───────────────────────────────────────────────────────────────────────────
   TYPES
   ─────────────────────────────────────────────────────────────────────────── */

export type FamilyBrother = {
  id: string;
  name: string;
  bigBrotherId: string | null;
  pledgeClass: string | null;
  position: string | null;
  status: string | null;
  headshotUrl: string | null;
};

/** A node in the rendered forest — a brother plus its resolved children. */
type TreeNode = FamilyBrother & { littles: TreeNode[]; depth: number };

/* The signature Greekstack entrance spring — matches the motion-principles
   cubic-bezier the rest of the app uses. Swapped for an instant tween when the
   user prefers reduced motion. */
const SPRING: Transition = { duration: 0.32, ease: [0.16, 1, 0.3, 1] };

/* ───────────────────────────────────────────────────────────────────────────
   PURE HELPERS (forest construction + graph walks)
   ─────────────────────────────────────────────────────────────────────────── */

function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Build the forest from the flat list. Roots = brothers with no big (or whose
 * big id is missing from the set — defensive against a dangling FK). Children
 * are sorted by name. A `seen` guard makes the recursion cycle-proof even if
 * the data is somehow dirty, so a bad row can never hang the render.
 */
function buildForest(list: FamilyBrother[]): TreeNode[] {
  const byId = new Map(list.map((b) => [b.id, b]));
  const childrenOf = new Map<string, FamilyBrother[]>();
  for (const b of list) {
    const big = b.bigBrotherId;
    if (big && byId.has(big) && big !== b.id) {
      const arr = childrenOf.get(big) ?? [];
      arr.push(b);
      childrenOf.set(big, arr);
    }
  }

  const build = (b: FamilyBrother, depth: number, seen: Set<string>): TreeNode => {
    const kids = (childrenOf.get(b.id) ?? [])
      .filter((k) => !seen.has(k.id))
      .sort((a, c) => a.name.localeCompare(c.name));
    return {
      ...b,
      depth,
      littles: kids.map((k) => build(k, depth + 1, new Set(seen).add(k.id))),
    };
  };

  const roots = list
    .filter((b) => !b.bigBrotherId || !byId.has(b.bigBrotherId) || b.bigBrotherId === b.id)
    .sort((a, c) => a.name.localeCompare(c.name));

  return roots.map((r) => build(r, 0, new Set([r.id])));
}

/** Every descendant id of `rootId` (excludes the root itself). Cycle-safe. */
function collectDescendants(rootId: string, list: FamilyBrother[]): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const b of list) {
    if (b.bigBrotherId && b.bigBrotherId !== b.id) {
      const arr = childrenOf.get(b.bigBrotherId) ?? [];
      arr.push(b.id);
      childrenOf.set(b.bigBrotherId, arr);
    }
  }
  const out = new Set<string>();
  const stack = [...(childrenOf.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const child of childrenOf.get(id) ?? []) stack.push(child);
  }
  return out;
}

/** The lineage path of `id` — itself plus every ancestor up to the root. */
function lineageOf(id: string, byId: Map<string, FamilyBrother>): Set<string> {
  const out = new Set<string>();
  let cursor: string | null = id;
  while (cursor && byId.has(cursor) && !out.has(cursor)) {
    out.add(cursor);
    cursor = byId.get(cursor)!.bigBrotherId ?? null;
  }
  return out;
}

/** Total nodes rooted at a forest node (the node + all descendants). */
function familySize(node: TreeNode): number {
  return 1 + node.littles.reduce((s, k) => s + familySize(k), 0);
}

/* ───────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ─────────────────────────────────────────────────────────────────────────── */

export function FamilyManager({
  initial,
  isAdmin = true,
}: {
  initial: FamilyBrother[];
  isAdmin?: boolean;
}) {
  const { push } = useToast();
  const reduce = useReducedMotion();
  const [list, setList] = React.useState<FamilyBrother[]>(initial);

  // Assign panel state
  const [subjectId, setSubjectId] = React.useState<string>("");
  const [chosenBigId, setChosenBigId] = React.useState<string | null>(null);
  const [pledgeClass, setPledgeClass] = React.useState<string>("");
  const [savingId, setSavingId] = React.useState<string | null>(null);

  // Tree state
  const [query, setQuery] = React.useState("");
  const [pledgeFilter, setPledgeFilter] = React.useState<string>("ALL");
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [hoverLineage, setHoverLineage] = React.useState<Set<string> | null>(null);

  const byId = React.useMemo(() => new Map(list.map((b) => [b.id, b])), [list]);

  /* ── Derived: forest + stats ───────────────────────────────────────────── */
  const forest = React.useMemo(() => buildForest(list), [list]);

  const pledgeClasses = React.useMemo(() => {
    const s = new Set<string>();
    for (const b of list) if (b.pledgeClass) s.add(b.pledgeClass);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [list]);

  const stats = React.useMemo(() => {
    const childIds = new Set(
      list.filter((b) => b.bigBrotherId && byId.has(b.bigBrotherId)).map((b) => b.bigBrotherId!),
    );
    const families = forest.filter((r) => r.littles.length > 0);
    const largest = families.reduce((max, r) => Math.max(max, familySize(r)), 0);
    // Unassigned = no big AND nobody calls them big (a true singleton).
    const unassigned = list.filter(
      (b) => (!b.bigBrotherId || !byId.has(b.bigBrotherId)) && !childIds.has(b.id),
    ).length;
    const perPledge = pledgeClasses.map((pc) => ({
      pc,
      count: list.filter((b) => b.pledgeClass === pc).length,
    }));
    return { families: families.length, largest, unassigned, perPledge };
  }, [list, byId, forest, pledgeClasses]);

  /* ── Derived: searchable big options for the chosen subject ─────────────── */
  // Exclude self + every descendant of the subject, so picking a big can never
  // form a loop (the server re-checks, but this keeps the UI honest).
  const subject = subjectId ? byId.get(subjectId) ?? null : null;
  const bannedAsBig = React.useMemo(() => {
    if (!subjectId) return new Set<string>();
    const d = collectDescendants(subjectId, list);
    d.add(subjectId);
    return d;
  }, [subjectId, list]);

  /* ── Search → which node ids match + their full lineage to highlight ─────── */
  const searchMatch = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const matched = new Set<string>();
    const highlight = new Set<string>();
    for (const b of list) {
      if (
        b.name.toLowerCase().includes(q) ||
        (b.pledgeClass || "").toLowerCase().includes(q) ||
        (b.position || "").toLowerCase().includes(q)
      ) {
        matched.add(b.id);
        for (const id of lineageOf(b.id, byId)) highlight.add(id);
      }
    }
    return { matched, highlight };
  }, [query, list, byId]);

  /* ── Filter the forest by pledge class + search (keep ancestors of hits) ── */
  const visibleForest = React.useMemo(() => {
    const pc = pledgeFilter;
    const matched = searchMatch?.matched ?? null;

    const keepSet: Set<string> | null = (() => {
      if (pc === "ALL" && !matched) return null; // no filtering
      const keep = new Set<string>();
      for (const b of list) {
        const passesPledge = pc === "ALL" || b.pledgeClass === pc;
        const passesSearch = !matched || matched.has(b.id);
        if (passesPledge && passesSearch) {
          for (const id of lineageOf(b.id, byId)) keep.add(id); // keep path to root
        }
      }
      return keep;
    })();

    if (!keepSet) return forest;

    const prune = (node: TreeNode): TreeNode | null => {
      const kids = node.littles.map(prune).filter(Boolean) as TreeNode[];
      if (keepSet.has(node.id) || kids.length > 0) {
        return { ...node, littles: kids };
      }
      return null;
    };
    return forest.map(prune).filter(Boolean) as TreeNode[];
  }, [forest, pledgeFilter, searchMatch, list, byId]);

  const isFiltering = pledgeFilter !== "ALL" || !!searchMatch;

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  async function assign(targetId: string, bigId: string | null, pc?: string) {
    setSavingId(targetId);
    const prev = list;
    // Optimistic update.
    setList((xs) =>
      xs.map((b) =>
        b.id === targetId
          ? { ...b, bigBrotherId: bigId, ...(pc !== undefined ? { pledgeClass: pc || null } : {}) }
          : b,
      ),
    );
    try {
      const res = await fetch("/api/admin/family", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brotherId: targetId,
          bigBrotherId: bigId,
          ...(pc !== undefined ? { pledgeClass: pc } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      // Reconcile with the server's canonical row.
      setList((xs) => xs.map((b) => (b.id === targetId ? { ...b, ...json.brother } : b)));
      const bigName = bigId ? byId.get(bigId)?.name : null;
      push({
        title: bigId ? `Big assigned${bigName ? ` → ${bigName}` : ""}` : "Big cleared",
        variant: "success",
      });
      return true;
    } catch (err: any) {
      setList(prev); // revert
      push({ title: err?.message || "Save failed", variant: "destructive" });
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function saveAssignPanel() {
    if (!subjectId) {
      push({ title: "Pick a brother first", variant: "destructive" });
      return;
    }
    const ok = await assign(subjectId, chosenBigId, pledgeClass);
    if (ok) {
      // Reset the picker but keep the subject so rapid sequential edits are easy.
      setChosenBigId(null);
    }
  }

  function toggleCollapse(id: string) {
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function loadSubjectIntoPanel(b: FamilyBrother) {
    setSubjectId(b.id);
    setChosenBigId(b.bigBrotherId);
    setPledgeClass(b.pledgeClass || "");
    // Bring the panel into view on small screens.
    if (typeof document !== "undefined") {
      document.getElementById("family-assign-panel")?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-phisig-red/[0.04] to-transparent py-16 px-6 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-lg shadow-phisig-red/25 mb-5">
          <IconFamily className="h-8 w-8" accent="rgba(255,255,255,0.85)" />
        </span>
        <h3 className="text-lg font-semibold tracking-tight">No brothers yet</h3>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Add brothers to the directory first, then come back here to build your
          chapter&apos;s big/little family tree.
        </p>
        <a
          href="/admin/brothers"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-phisig-red hover:underline cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> Go to the directory
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Families" value={stats.families} icon={GitBranch} hint="lines with ≥1 little" />
        <StatCard label="Largest family" value={stats.largest} icon={Crown} hint="biggest lineage" />
        <StatCard label="Unassigned" value={stats.unassigned} icon={IconSpark} hint="no big & no littles" />
        <StatCard label="Brothers" value={list.length} icon={Users} hint="in the tree" />
      </div>

      {/* per-pledge-class breakdown (glass strip) */}
      {stats.perPledge.length > 0 && (
        <div className="gs-glass rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-phisig-red mb-2.5">
            Members per pledge class
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.perPledge.map(({ pc, count }) => (
              <button
                key={pc}
                type="button"
                onClick={() => setPledgeFilter((cur) => (cur === pc ? "ALL" : pc))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red focus-visible:ring-offset-1",
                  pledgeFilter === pc
                    ? "border-phisig-red bg-phisig-red text-white shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-phisig-red/50 hover:text-foreground",
                )}
              >
                {pc}
                <span
                  className={cn(
                    "tabular-nums rounded-full px-1.5 text-[10px] font-semibold",
                    pledgeFilter === pc ? "bg-white/20" : "bg-secondary",
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ASSIGN PANEL (admins only) ────────────────────────────────────── */}
      {isAdmin && (
        <AssignPanel
          list={list}
          byId={byId}
          subject={subject}
          subjectId={subjectId}
          setSubjectId={(id) => {
            setSubjectId(id);
            const b = id ? byId.get(id) : null;
            setChosenBigId(b?.bigBrotherId ?? null);
            setPledgeClass(b?.pledgeClass || "");
          }}
          chosenBigId={chosenBigId}
          setChosenBigId={setChosenBigId}
          pledgeClass={pledgeClass}
          setPledgeClass={setPledgeClass}
          bannedAsBig={bannedAsBig}
          pledgeClasses={pledgeClasses}
          onSave={saveAssignPanel}
          onClear={() => subjectId && assign(subjectId, null, undefined)}
          saving={savingId === subjectId && !!subjectId}
          reduce={!!reduce}
        />
      )}

      {/* ── TREE TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a brother to trace their lineage…"
            className="pl-9 pr-9"
            aria-label="Search the family tree"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pledgeFilter !== "ALL" && (
            <Button variant="outline" size="sm" onClick={() => setPledgeFilter("ALL")}>
              <X className="h-3.5 w-3.5" /> {pledgeFilter}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(new Set())}
            className="text-muted-foreground"
            title="Expand every branch"
          >
            Expand all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(new Set(list.map((b) => b.id)))}
            className="text-muted-foreground"
            title="Collapse every branch"
          >
            Collapse all
          </Button>
        </div>
      </div>

      {/* ── THE FOREST ────────────────────────────────────────────────────── */}
      {visibleForest.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-14 px-6 text-center">
          <Search className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No brothers match {query ? <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span> : "this filter"}
            {pledgeFilter !== "ALL" && <> in <span className="font-medium text-foreground">{pledgeFilter}</span></>}.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPledgeFilter("ALL");
            }}
            className="mt-3 text-sm font-medium text-phisig-red hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleForest.map((root) => (
            <div
              key={root.id}
              className="gs-card-glow relative rounded-2xl border border-border bg-card p-3 sm:p-4 overflow-hidden"
            >
              <NodeRow
                node={root}
                isRoot
                collapsed={collapsed}
                onToggle={toggleCollapse}
                onPick={isAdmin ? loadSubjectIntoPanel : undefined}
                selectedId={subjectId}
                searchMatched={searchMatch?.matched ?? null}
                searchHighlight={searchMatch?.highlight ?? null}
                hoverLineage={hoverLineage}
                setHoverLineage={setHoverLineage}
                byId={byId}
                reduce={!!reduce}
                savingId={savingId}
                forceOpen={isFiltering}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer hint */}
      <p className="text-center text-xs text-muted-foreground">
        {isAdmin ? (
          <>Tip: click any brother to load them into the assign panel. Hover to light up their lineage.</>
        ) : (
          <>Hover any brother to light up their lineage path.</>
        )}
      </p>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   ASSIGN PANEL
   ─────────────────────────────────────────────────────────────────────────── */

function AssignPanel({
  list,
  byId,
  subject,
  subjectId,
  setSubjectId,
  chosenBigId,
  setChosenBigId,
  pledgeClass,
  setPledgeClass,
  bannedAsBig,
  pledgeClasses,
  onSave,
  onClear,
  saving,
  reduce,
}: {
  list: FamilyBrother[];
  byId: Map<string, FamilyBrother>;
  subject: FamilyBrother | null;
  subjectId: string;
  setSubjectId: (id: string) => void;
  chosenBigId: string | null;
  setChosenBigId: (id: string | null) => void;
  pledgeClass: string;
  setPledgeClass: (v: string) => void;
  bannedAsBig: Set<string>;
  pledgeClasses: string[];
  onSave: () => void;
  onClear: () => void;
  saving: boolean;
  reduce: boolean;
}) {
  const dirty =
    !!subject &&
    (chosenBigId !== (subject.bigBrotherId ?? null) ||
      (pledgeClass || "") !== (subject.pledgeClass || ""));

  return (
    <div
      id="family-assign-panel"
      className="gs-glass gs-shimmer-border rounded-2xl p-5 scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-sm">
          <UserPlus className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Assign a big</h2>
          <p className="text-xs text-muted-foreground">
            Pick a brother, choose their big, and set their pledge class.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.3fr_0.9fr] lg:items-end">
        {/* Subject picker */}
        <div>
          <Label className="mb-1.5 inline-block text-xs">Brother</Label>
          <SearchableSelect
            options={list.map((b) => ({
              id: b.id,
              label: b.name,
              sublabel: [b.pledgeClass, b.position].filter(Boolean).join(" · ") || undefined,
              headshotUrl: b.headshotUrl,
            }))}
            value={subjectId || null}
            onChange={(id) => setSubjectId(id || "")}
            placeholder="Select a brother…"
            reduce={reduce}
          />
        </div>

        {/* Big picker (searchable, excludes self + descendants) */}
        <div>
          <Label className="mb-1.5 inline-flex items-center gap-1 text-xs">
            Their big
            {subject && (
              <span className="text-[10px] font-normal text-muted-foreground">
                — descendants of {subject.name} are hidden to prevent loops
              </span>
            )}
          </Label>
          <SearchableSelect
            disabled={!subjectId}
            options={list
              .filter((b) => !bannedAsBig.has(b.id))
              .map((b) => ({
                id: b.id,
                label: b.name,
                sublabel: [b.pledgeClass, b.position].filter(Boolean).join(" · ") || undefined,
                headshotUrl: b.headshotUrl,
              }))}
            value={chosenBigId}
            onChange={setChosenBigId}
            placeholder={subjectId ? "Select a big…" : "Pick a brother first"}
            allowClear
            clearLabel="No big (top of a line)"
            reduce={reduce}
          />
        </div>

        {/* Pledge class */}
        <div>
          <Label className="mb-1.5 inline-block text-xs">Pledge class</Label>
          <Input
            value={pledgeClass}
            onChange={(e) => setPledgeClass(e.target.value)}
            placeholder="e.g. Alpha Phi"
            disabled={!subjectId}
            list="family-pledge-classes"
          />
          <datalist id="family-pledge-classes">
            {pledgeClasses.map((pc) => (
              <option key={pc} value={pc} />
            ))}
          </datalist>
        </div>
      </div>

      {/* live preview + actions */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground min-h-[1.25rem]">
          {subject ? (
            chosenBigId ? (
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <Badge className="bg-phisig-red/10 text-phisig-red ring-1 ring-phisig-red/20">
                  {byId.get(chosenBigId)?.name}
                </Badge>
                <CornerDownRight className="h-3.5 w-3.5" />
                <Badge className="bg-secondary text-foreground">{subject.name}</Badge>
                <span>will be a little of {byId.get(chosenBigId)?.name}.</span>
              </span>
            ) : (
              <span>{subject.name} will sit at the top of their own line.</span>
            )
          ) : (
            <span>Select a brother to begin.</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {subject?.bigBrotherId && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={saving}
              title="Remove this brother's big"
            >
              <Link2Off className="h-3.5 w-3.5" /> Clear big
            </Button>
          )}
          <Button size="sm" onClick={onSave} disabled={saving || !subjectId || !dirty}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   SEARCHABLE SELECT — lightweight, keyboard-friendly, avatar-aware.
   Built locally (no heavy combobox dep) to match the project's existing
   hand-rolled UI style.
   ─────────────────────────────────────────────────────────────────────────── */

type Option = { id: string; label: string; sublabel?: string; headshotUrl?: string | null };

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  allowClear,
  clearLabel = "Clear",
  reduce,
}: {
  options: Option[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  reduce: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = value ? options.find((o) => o.id === value) ?? null : null;

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        (o.sublabel || "").toLowerCase().includes(needle),
    );
  }, [q, options]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      // focus the filter input once the popover is painted
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    setActive(0);
  }, [q]);

  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red focus-visible:ring-offset-1",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-phisig-red/50",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <Avatar name={selected.label} url={selected.headshotUrl} size="xs" />
            <span className="flex-1 truncate text-left">{selected.label}</span>
          </>
        ) : (
          <span className="flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
        )}
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={reduce ? { duration: 0.12 } : SPRING}
            className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
            style={{ transformOrigin: "top" }}
          >
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type a name…"
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red"
                />
              </div>
            </div>
            <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
              {allowClear && (
                <li>
                  <button
                    type="button"
                    onClick={() => choose(null)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-secondary cursor-pointer"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border">
                      <Link2Off className="h-3 w-3" />
                    </span>
                    {clearLabel}
                  </button>
                </li>
              )}
              {filtered.length === 0 ? (
                <li className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                  No matches.
                </li>
              ) : (
                filtered.map((o, i) => {
                  const isSel = o.id === value;
                  const isActive = i === active;
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(o.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors cursor-pointer",
                          isActive ? "bg-phisig-red/10" : "hover:bg-secondary",
                        )}
                      >
                        <Avatar name={o.label} url={o.headshotUrl} size="sm" />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">{o.label}</span>
                          {o.sublabel && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {o.sublabel}
                            </span>
                          )}
                        </span>
                        {isSel && <Check className="h-4 w-4 text-phisig-red shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   TREE NODE (recursive, collapsible, lineage-highlighting)
   ─────────────────────────────────────────────────────────────────────────── */

function NodeRow({
  node,
  isRoot,
  collapsed,
  onToggle,
  onPick,
  selectedId,
  searchMatched,
  searchHighlight,
  hoverLineage,
  setHoverLineage,
  byId,
  reduce,
  savingId,
  forceOpen,
}: {
  node: TreeNode;
  isRoot?: boolean;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onPick?: (b: FamilyBrother) => void;
  selectedId: string;
  searchMatched: Set<string> | null;
  searchHighlight: Set<string> | null;
  hoverLineage: Set<string> | null;
  setHoverLineage: (s: Set<string> | null) => void;
  byId: Map<string, FamilyBrother>;
  reduce: boolean;
  savingId: string | null;
  forceOpen?: boolean;
}) {
  const hasKids = node.littles.length > 0;
  const isOpen = forceOpen || !collapsed.has(node.id);

  const isSelected = selectedId === node.id;
  const isSearchHit = !!searchMatched?.has(node.id);
  const inSearchPath = !!searchHighlight?.has(node.id);
  const inHoverPath = !!hoverLineage?.has(node.id);
  const dimmed = (searchMatched && !inSearchPath) || (hoverLineage && !inHoverPath);

  return (
    <div className={cn(!isRoot && "relative")}>
      {/* the node card */}
      <div
        className={cn(
          "group/node relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all",
          dimmed ? "opacity-40" : "opacity-100",
          isSelected
            ? "border-phisig-red bg-phisig-red/[0.06] shadow-sm ring-1 ring-phisig-red/20"
            : isSearchHit
              ? "border-[#f59e0b]/60 bg-[#f59e0b]/[0.06]"
              : inHoverPath
                ? "border-phisig-red/50 bg-phisig-red/[0.05]"
                : "border-border bg-card hover:border-phisig-red/40 hover:bg-secondary/40",
        )}
        onMouseEnter={() => setHoverLineage(lineageOf(node.id, byId))}
        onMouseLeave={() => setHoverLineage(null)}
      >
        {/* collapse toggle */}
        {hasKids ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            disabled={forceOpen}
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
              forceOpen ? "opacity-40" : "hover:bg-secondary hover:text-foreground cursor-pointer",
            )}
            aria-label={isOpen ? "Collapse branch" : "Expand branch"}
            aria-expanded={isOpen}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
          </button>
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
          </span>
        )}

        {/* avatar */}
        <Avatar name={node.name} url={node.headshotUrl} size="md" crown={isRoot && hasKids} />

        {/* identity */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{node.name}</span>
            {isRoot && hasKids && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-[#f59e0b]/15 to-[#fbbf24]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b45309] ring-1 ring-[#f59e0b]/25">
                <Crown className="h-2.5 w-2.5" /> Head
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {node.position && (
              <span className="uppercase tracking-wide font-semibold text-phisig-red">
                {node.position}
              </span>
            )}
            {node.pledgeClass && (
              <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-px font-medium text-foreground/70">
                {node.pledgeClass}
              </span>
            )}
            {hasKids && (
              <span className="inline-flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                {node.littles.length} {node.littles.length === 1 ? "little" : "littles"}
              </span>
            )}
          </div>
        </div>

        {/* saving spinner / pick affordance */}
        {savingId === node.id ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-phisig-red" />
        ) : onPick ? (
          <button
            type="button"
            onClick={() => onPick(node)}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity hover:bg-phisig-red/10 hover:text-phisig-red group-hover/node:opacity-100 focus-visible:opacity-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red"
            title="Edit this brother's big"
          >
            Edit
          </button>
        ) : null}
      </div>

      {/* children — indented + connected */}
      {hasKids && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="kids"
              initial={reduce ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
              transition={reduce ? { duration: 0.12 } : SPRING}
              className="overflow-hidden"
            >
              <div className="relative ml-[1.45rem] mt-1 space-y-1 border-l-2 border-phisig-red/20 pl-3">
                {node.littles.map((kid, idx) => (
                  <motion.div
                    key={kid.id}
                    initial={reduce ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reduce ? { duration: 0 } : { ...SPRING, delay: Math.min(idx * 0.025, 0.2) }}
                    className="relative"
                  >
                    {/* elbow connector from the parent rail to this child */}
                    <span
                      aria-hidden="true"
                      className="absolute -left-3 top-[1.4rem] h-px w-3 bg-phisig-red/30"
                    />
                    <NodeRow
                      node={kid}
                      collapsed={collapsed}
                      onToggle={onToggle}
                      onPick={onPick}
                      selectedId={selectedId}
                      searchMatched={searchMatched}
                      searchHighlight={searchHighlight}
                      hoverLineage={hoverLineage}
                      setHoverLineage={setHoverLineage}
                      byId={byId}
                      reduce={reduce}
                      savingId={savingId}
                      forceOpen={forceOpen}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   SMALL PRESENTATIONAL BITS
   ─────────────────────────────────────────────────────────────────────────── */

function Avatar({
  name,
  url,
  size = "md",
  crown,
}: {
  name: string;
  url?: string | null;
  size?: "xs" | "sm" | "md";
  crown?: boolean;
}) {
  const dims = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
  }[size];

  return (
    <span className="relative inline-flex shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className={cn("rounded-full object-cover ring-1 ring-border", dims)}
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark font-semibold text-white ring-1 ring-white/30",
            dims,
          )}
        >
          {initials(name)}
        </span>
      )}
      {crown && (
        <span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f59e0b] text-white ring-2 ring-card">
          <Crown className="h-2 w-2" />
        </span>
      )}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <div className="gs-card-glow relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-phisig-red/15 to-phisig-red/5 text-phisig-red ring-1 ring-phisig-red/15">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
