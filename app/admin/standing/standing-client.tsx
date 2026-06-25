"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { avatarSrc } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import { IconSpark } from "@/components/brand/icons";
import {
  Trophy, Crown, Search, SlidersHorizontal, Loader2, RotateCcw, Save,
  ChevronDown, ShieldCheck, AlertTriangle, ShieldAlert, Wallet, CalendarCheck,
  HandHeart, BookOpen, } from "lucide-react";
import {
  DEFAULT_POINTS_CONFIG,
  standingLabel,
  standingTone,
  type PointsConfig,
  type Standing,
  type BreakdownRow,
} from "@/lib/points";

type MemberRow = {
  id: string;
  name: string;
  position: string | null;
  headshotUrl: string | null;
  pledgeClass: string | null;
  score: number;
  max: number;
  pct: number;
  standing: Standing;
  breakdown: BreakdownRow[];
};

const DIMENSION_ICON: Record<string, React.ElementType> = {
  dues: Wallet,
  meetings: CalendarCheck,
  service: HandHeart,
  study: BookOpen,
  chores: ShieldCheck,
};

/** Glass surface matching the admin brand-red identity used across sibling pages. */
const GLASS_CARD =
  "rounded-2xl border border-border bg-card/90 backdrop-blur-xl " +
  "shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_10px_30px_-16px_rgba(0,0,0,0.18)]";

// ── Scoring-rules editor field definitions ───────────────────────────────────
const WEIGHT_FIELDS: { key: keyof PointsConfig; label: string; hint: string; icon: React.ElementType }[] = [
  { key: "duesWeight", label: "Dues paid", hint: "Full points when dues are paid", icon: Wallet },
  { key: "meetingsWeight", label: "Meeting attendance", hint: "Scaled by % of meetings attended", icon: CalendarCheck },
  { key: "serviceWeight", label: "Service hours", hint: "Scaled toward the service target", icon: HandHeart },
  { key: "studyWeight", label: "Study hours", hint: "Scaled toward the study target", icon: BookOpen },
  { key: "choresWeight", label: "Chore completion", hint: "Scaled by % of chores completed", icon: ShieldCheck },
];

export function StandingClient({
  initialConfig,
  members,
  canEdit,
  memberNoun,
}: {
  initialConfig: PointsConfig;
  members: MemberRow[];
  canEdit: boolean;
  memberNoun: string;
}) {
  const { push } = useToast();
  const [query, setQuery] = React.useState("");
  const [bandFilter, setBandFilter] = React.useState<"all" | Standing>("all");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);

  // Working copy of the config for the editor (string-typed for inputs).
  const [form, setForm] = React.useState<Record<keyof PointsConfig, string>>(() => toForm(initialConfig));
  const [savedConfig, setSavedConfig] = React.useState<PointsConfig>(initialConfig);
  const [saving, setSaving] = React.useState(false);

  const counts = React.useMemo(() => {
    let good = 0, watch = 0, risk = 0;
    for (const m of members) {
      if (m.standing === "good") good++;
      else if (m.standing === "watch") watch++;
      else risk++;
    }
    const avg = members.length
      ? Math.round(members.reduce((s, m) => s + m.pct, 0) / members.length)
      : 0;
    return { good, watch, risk, avg, total: members.length };
  }, [members]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.position || "").toLowerCase().includes(q) ||
        (m.pledgeClass || "").toLowerCase().includes(q);
      const matchBand = bandFilter === "all" || m.standing === bandFilter;
      return matchQ && matchBand;
    });
  }, [members, query, bandFilter]);

  // The live weight total powers the "points sum to N" helper in the editor.
  const weightSum = React.useMemo(
    () => WEIGHT_FIELDS.reduce((s, f) => s + (parseFloat(form[f.key]) || 0), 0),
    [form]
  );

  function setField(key: keyof PointsConfig, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetToDefaults() {
    setForm(toForm(DEFAULT_POINTS_CONFIG));
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const payload: Record<string, number> = {};
      for (const k of Object.keys(form) as (keyof PointsConfig)[]) {
        payload[k] = parseFloat(form[k]) || 0;
      }
      const res = await fetch("/api/admin/points-config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save");
      setSavedConfig(json.config as PointsConfig);
      setForm(toForm(json.config as PointsConfig));
      push({
        title: "Scoring rules saved",
        description: "New scores apply on the next page load.",
        variant: "success",
      });
    } catch (err: any) {
      push({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-sm shrink-0">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Engagement &amp; standing</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              One motivating number per member, computed from dues, meeting attendance,
              approved service hours, study hours, and chores. Tune what counts - 
              no extra data entry.
            </p>
          </div>
        </div>
        {canEdit ? (
          <Button
            variant={editorOpen ? "secondary" : "outline"}
            onClick={() => setEditorOpen((o) => !o)}
            className="shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Scoring rules
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only
          </span>
        )}
      </div>

      {/* Scoring rules editor (collapsible) */}
      {canEdit && editorOpen && (
        <Card className={GLASS_CARD}>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <IconSpark className="h-4 w-4 text-phisig-red" aria-hidden="true" />
              <h2 className="text-sm font-semibold tracking-tight">Scoring rules</h2>
              <span className="text-[11px] text-muted-foreground">
                Points available now total <span className="font-semibold tabular-nums">{Math.round(weightSum)}</span>
              </span>
            </div>

            {/* Weights */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {WEIGHT_FIELDS.map((f) => (
                <div key={f.key} className="rounded-xl border border-border bg-background/60 p-3">
                  <Label htmlFor={f.key} className="flex items-center gap-1.5 text-xs font-semibold">
                    <f.icon className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                    {f.label}
                  </Label>
                  <Input
                    id={f.key}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="mt-2 tabular-nums"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">{f.hint}</p>
                </div>
              ))}
            </div>

            {/* Targets + thresholds */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <NumberField
                id="serviceHoursTarget"
                label="Service hrs for full credit"
                value={form.serviceHoursTarget}
                onChange={(v) => setField("serviceHoursTarget", v)}
                min={1}
              />
              <NumberField
                id="studyHoursTarget"
                label="Study hrs for full credit"
                value={form.studyHoursTarget}
                onChange={(v) => setField("studyHoursTarget", v)}
                min={1}
              />
              <NumberField
                id="goodThreshold"
                label="Good standing at ≥ (%)"
                value={form.goodThreshold}
                onChange={(v) => setField("goodThreshold", v)}
                min={0}
                max={100}
                tone="emerald"
              />
              <NumberField
                id="watchThreshold"
                label="Needs attention at ≥ (%)"
                value={form.watchThreshold}
                onChange={(v) => setField("watchThreshold", v)}
                min={0}
                max={100}
                tone="amber"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-muted-foreground">
                Below the &ldquo;needs attention&rdquo; threshold is <span className="font-medium text-rose-600">at risk</span>.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={resetToDefaults} disabled={saving}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to defaults
                </Button>
                <Button size="sm" onClick={saveConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save rules
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile label="Active members" value={String(counts.total)} icon={Trophy} />
        <SummaryTile label="Avg standing" value={`${counts.avg}%`} icon={IconSpark} tone="brand" />
        <SummaryTile label="Good standing" value={String(counts.good)} icon={ShieldCheck} tone="emerald" />
        <SummaryTile
          label="Watch / at risk"
          value={String(counts.watch + counts.risk)}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${memberNoun}, position, class…`}
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-xl bg-muted p-1 border border-border self-start">
          {([
            { id: "all", label: "All" },
            { id: "good", label: "Good" },
            { id: "watch", label: "Watch" },
            { id: "risk", label: "At risk" },
          ] as const).map((b) => (
            <button
              key={b.id}
              onClick={() => setBandFilter(b.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                bandFilter === b.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {members.length === 0 ? (
        <Card className="border-border/60 text-center py-12 bg-muted/30">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No active members yet. Add {memberNoun} to start tracking standing.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 text-center py-12 bg-muted/30">
          <CardContent>
            <p className="text-sm text-muted-foreground">No {memberNoun} match the current filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m, i) => (
            <MemberCard
              key={m.id}
              member={m}
              rank={bandFilter === "all" && !query ? members.indexOf(m) : i}
              open={expanded === m.id}
              onToggle={() => setExpanded((cur) => (cur === m.id ? null : m.id))}
            />
          ))}
        </div>
      )}
    </main>
  );
}

// ── Member row + expandable breakdown ────────────────────────────────────────

function MemberCard({
  member,
  rank,
  open,
  onToggle,
}: {
  member: MemberRow;
  rank: number;
  open: boolean;
  onToggle: () => void;
}) {
  const tone = standingTone(member.standing);
  return (
    <Card className={cn("overflow-hidden transition", open && "ring-1 ring-phisig-red/20")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left"
      >
        <CardContent className="p-4 flex items-center gap-3">
          {/* Rank */}
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold tabular-nums shrink-0",
              rank === 0 && "bg-amber-500 text-white",
              rank === 1 && "bg-zinc-300 text-zinc-800",
              rank === 2 && "bg-orange-300 text-orange-900",
              rank > 2 && "bg-secondary text-muted-foreground"
            )}
          >
            {rank === 0 ? <Crown className="h-3.5 w-3.5" aria-hidden="true" /> : rank + 1}
          </span>

          {/* Avatar */}
          {member.headshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc(member.headshotUrl, 56)}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-1 ring-border shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-phisig-red text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
              {member.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Name + meter */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{member.name}</p>
              {member.position && (
                <span className="hidden sm:inline text-[11px] text-muted-foreground truncate">
                  {member.position}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden max-w-[260px]">
                <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${member.pct}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{member.pct}%</span>
            </div>
          </div>

          {/* Score + band */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-base font-bold tabular-nums leading-none">
                {member.score}
                <span className="text-xs font-medium text-muted-foreground">/{member.max}</span>
              </p>
            </div>
            <StandingBadge standing={member.standing} />
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
          </div>
        </CardContent>
      </button>

      {open && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 animate-fade-in">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {member.breakdown.map((row) => {
              const Icon = DIMENSION_ICON[row.key] || IconSpark;
              const rowPct = row.max > 0 ? Math.round((row.points / row.max) * 100) : 0;
              return (
                <div key={row.key} className="rounded-xl border border-border bg-card p-3">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <Icon className="h-3 w-3" aria-hidden="true" /> {row.label}
                  </p>
                  <p className="mt-1.5 text-sm font-bold tabular-nums">
                    {row.points}
                    <span className="text-[11px] font-medium text-muted-foreground">/{row.max}</span>
                  </p>
                  <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-phisig-red" style={{ width: `${rowPct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground truncate" title={row.detail}>
                    {row.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function StandingBadge({ standing }: { standing: Standing }) {
  const tone = standingTone(standing);
  const Icon = standing === "good" ? ShieldCheck : standing === "watch" ? AlertTriangle : ShieldAlert;
  return (
    <Badge
      className={cn(
        "hidden sm:inline-flex items-center gap-1 border-none tabular-nums text-[10px] whitespace-nowrap",
        tone.bg,
        tone.text,
        "ring-1",
        tone.ring
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {standingLabel(standing)}
    </Badge>
  );
}

// ── Small presentational helpers ─────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "default" | "brand" | "emerald" | "amber";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "brand" && "text-phisig-red",
            tone === "emerald" && "text-emerald-600",
            tone === "amber" && "text-amber-600",
            tone === "default" && "text-muted-foreground"
          )}
          aria-hidden="true"
        />
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "emerald" && "text-emerald-600",
          tone === "amber" && "text-amber-600"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  tone,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  tone?: "emerald" | "amber";
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <Label
        htmlFor={id}
        className={cn(
          "text-xs font-semibold",
          tone === "emerald" && "text-emerald-700",
          tone === "amber" && "text-amber-700"
        )}
      >
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 tabular-nums"
      />
    </div>
  );
}

/** Config → string-valued form map for controlled inputs. */
function toForm(c: PointsConfig): Record<keyof PointsConfig, string> {
  return {
    duesWeight: String(c.duesWeight),
    meetingsWeight: String(c.meetingsWeight),
    serviceWeight: String(c.serviceWeight),
    studyWeight: String(c.studyWeight),
    choresWeight: String(c.choresWeight),
    serviceHoursTarget: String(c.serviceHoursTarget),
    studyHoursTarget: String(c.studyHoursTarget),
    goodThreshold: String(c.goodThreshold),
    watchThreshold: String(c.watchThreshold),
  };
}
