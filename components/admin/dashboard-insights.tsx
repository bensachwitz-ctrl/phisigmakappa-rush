import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconGrowth as TrendingUp, IconCheckCircle as CheckCircle2, IconMembers as Users, IconCalendar as Calendar, IconThumbsUp as ThumbsUp, IconThumbsDown as ThumbsDown, IconArrowRight as ArrowRight, IconBallot as Vote, IconDownload as Download, IconFileText as FileText, IconAuditLog as ScrollText } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

import { IconSpark } from "@/components/brand/icons";
// ── Public types ────────────────────────────────────────────────────────────
//
// The insights panel takes already-aggregated rush + brother + event data so
// it stays a pure component (no DB queries in the render path). The /admin
// page server-component is the single place that talks to Prisma and shapes
// the data; this component just renders it.

export type InsightRush = {
  id: string;
  name: string;
  status: string;
  voteSum: number;
  voteCount: number;
  myVote: number | null;
  createdAt: string;
};

export type InsightEvent = {
  id: string;
  name: string;
  startsAt: string;
  category: string;
};

export type DashboardInsightsProps = {
  rushes: InsightRush[];
  totalBrothers: number;
  totalActiveBrothers: number;
  votingBrothersLast7Days: number;
  upcomingEvents: InsightEvent[];
  duesPaidCount: number;
  myBrotherId: string | null;
  // Recently-bid PNMs let the e-board track conversion (bid → accepted)
  bidsExtendedCount: number;
  acceptedCount: number;
  // Brand readiness — fraction of chapter-identity / brand / contact fields
  // that have been customized off the reference Demo Chapter USC defaults. Drives
  // the "Finish chapter setup" CTA banner. null hides the banner (e.g. for
  // the reference deploy that doesn't need to nag itself).
  brandReadiness: { customizedFields: number; totalFields: number; isSetupComplete: boolean } | null;
};

// ── Decision thresholds ─────────────────────────────────────────────────────
//
// A PNM is "ready for a bid decision" when enough brothers have weighed in
// that the average isn't just one or two voices. 5 votes is the lower bound
// most chapters use; below that the signal is too noisy to act on.
//
// Average vote (sum / count) interpretation:
//   ≥ +1.0  → strong-yes consensus → recommend BID
//   ≤ -1.0  → strong-no consensus  → recommend DROP
//   between → mixed, needs more discussion
const DECISION_MIN_VOTES = 5;
const BID_RECOMMEND_AVG = 1.0;
const DROP_RECOMMEND_AVG = -1.0;

function avg(r: InsightRush): number {
  return r.voteCount > 0 ? r.voteSum / r.voteCount : 0;
}

export function DashboardInsights({
  rushes,
  totalBrothers,
  totalActiveBrothers,
  votingBrothersLast7Days,
  upcomingEvents,
  duesPaidCount,
  myBrotherId,
  bidsExtendedCount,
  acceptedCount,
  brandReadiness,
}: DashboardInsightsProps) {
  // ── Compute panels ────────────────────────────────────────────────────────
  const activeRushes = rushes.filter((r) => r.status === "ACTIVE");
  const decidableRushes = activeRushes
    .filter((r) => r.voteCount >= DECISION_MIN_VOTES)
    .map((r) => ({ rush: r, avg: avg(r) }));

  const recommendBid = decidableRushes
    .filter(({ avg }) => avg >= BID_RECOMMEND_AVG)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const recommendDrop = decidableRushes
    .filter(({ avg }) => avg <= DROP_RECOMMEND_AVG)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  // "Needs your vote" — active PNMs where you (the signed-in brother)
  // haven't voted yet. Sorted by who has the most votes already (those
  // are the closest to a decision, so your input matters most).
  const needsMyVote = myBrotherId
    ? activeRushes
        .filter((r) => r.myVote === null || r.myVote === undefined)
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 5)
    : [];

  // Conversion + participation rates
  const voteParticipationPct = totalActiveBrothers > 0
    ? Math.round((votingBrothersLast7Days / totalActiveBrothers) * 100)
    : 0;
  const duesPaidPct = totalBrothers > 0
    ? Math.round((duesPaidCount / totalBrothers) * 100)
    : 0;
  const avgVoteScore = activeRushes.length > 0
    ? activeRushes.reduce((s, r) => s + avg(r), 0) / activeRushes.length
    : 0;
  const bidConversionPct = bidsExtendedCount > 0
    ? Math.round((acceptedCount / bidsExtendedCount) * 100)
    : 0;

  const nextEvent = upcomingEvents[0];

  // KPI cards — always visible, scan in 3 seconds.
  const kpis = [
    {
      label: "Active PNMs",
      value: activeRushes.length.toString(),
      sub: `${rushes.length} total this cycle`,
      icon: Users,
      href: "/admin",
      tone: "brand-red" as const,
    },
    {
      label: "Ready to decide",
      value: decidableRushes.length.toString(),
      sub: `${recommendBid.length} bid · ${recommendDrop.length} drop`,
      icon: TrendingUp,
      href: "#decisions",
      tone: decidableRushes.length > 0 ? "amber" : "muted",
    },
    {
      label: "Vote participation",
      value: `${voteParticipationPct}%`,
      sub: `${votingBrothersLast7Days} of ${totalActiveBrothers} brothers (7d)`,
      icon: Vote,
      href: "/admin/brothers",
      tone: voteParticipationPct >= 60 ? "emerald" : "amber",
    },
    {
      label: "Dues collected",
      value: `${duesPaidPct}%`,
      sub: `${duesPaidCount} of ${totalBrothers} brothers`,
      icon: CheckCircle2,
      href: "/admin/brothers",
      tone: duesPaidPct >= 80 ? "emerald" : "amber",
    },
    {
      label: "Bid conversion",
      value: bidsExtendedCount > 0 ? `${bidConversionPct}%` : "-",
      sub: `${acceptedCount}/${bidsExtendedCount} accepted`,
      icon: ThumbsUp,
      href: "/admin",
      tone: "emerald" as const,
    },
    {
      label: "Next event",
      value: nextEvent ? new Date(nextEvent.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-",
      sub: nextEvent ? nextEvent.name : "No upcoming public events",
      icon: Calendar,
      href: "/admin/events",
      tone: "brand-red" as const,
    },
  ];

  const hasInsights = decidableRushes.length > 0 || needsMyVote.length > 0;

  return (
    <section className="space-y-4 mb-6" aria-label="Chapter insights and decision queue">
      {/* NOTE: The first-run "set up your chapter" prompt that used to live here
          has been consolidated into the single FirstRunCard on /admin (see
          components/admin/setup-wizard.tsx → FirstRunCard). This panel now owns
          only the live KPI insights + decision queue; the brandReadiness prop is
          still accepted so the page can compute the unified card without a second
          query, but it no longer renders a competing setup banner here. */}

      {/* ── KPI strip ──────────────────────────────────────────────────────
          Brand-tinted frosted tiles: a translucent surface with a hairline
          brand ring, a layered soft shadow that deepens on hover, a thin
          tone-colored top accent, and a gentle rise on hover. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={cn(
                "group relative block overflow-hidden rounded-2xl border border-brand-red/10 bg-white/80 backdrop-blur-xl p-3.5",
                "ring-1 ring-[hsl(var(--primary)/0.05)]",
                "shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_8px_22px_-14px_rgba(11,11,12,0.16)]",
                "transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-red/40",
                "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_16px_34px_-16px_hsl(var(--primary)/0.28)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30",
              )}
            >
              {/* tone-colored top accent rule */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity duration-300 group-hover:opacity-100",
                  kpi.tone === "brand-red" && "bg-gradient-to-r from-brand-red/70 via-brand-red/30 to-transparent",
                  kpi.tone === "emerald" && "bg-gradient-to-r from-emerald-400/70 via-emerald-400/30 to-transparent",
                  kpi.tone === "amber" && "bg-gradient-to-r from-amber-400/70 via-amber-400/30 to-transparent",
                  kpi.tone === "muted" && "bg-gradient-to-r from-border via-border/40 to-transparent",
                )}
              />
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {kpi.label}
                </p>
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full ring-1 transition-transform duration-300 group-hover:scale-110",
                    kpi.tone === "brand-red" && "bg-brand-red-soft text-brand-red ring-brand-red/15",
                    kpi.tone === "emerald" && "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
                    kpi.tone === "amber" && "bg-amber-50 text-amber-700 ring-amber-200/60",
                    kpi.tone === "muted" && "bg-secondary text-muted-foreground ring-border",
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                {kpi.value}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1 group-hover:text-foreground transition-colors">
                {kpi.sub}
              </p>
            </Link>
          );
        })}
      </div>

      {/* ── Analytics Charts Section ───────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border border-slate-200 bg-white/60 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[220px]">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-0.5">Recruitment Funnel</h3>
              <p className="text-[11px] text-muted-foreground mb-4">PNM status conversion flow this cycle</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <FunnelChart
                total={rushes.length}
                voted={rushes.filter(r => r.voteCount > 0).length}
                bids={bidsExtendedCount}
                accepted={acceptedCount}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white/60 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[220px]">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-0.5">Dues Collection</h3>
              <p className="text-[11px] text-muted-foreground mb-4">Circular progress of collected dues</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <CircularProgressRing
                percentage={duesPaidPct}
                paid={duesPaidCount}
                total={totalBrothers}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white/60 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[220px]">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-0.5">Voting Participation</h3>
              <p className="text-[11px] text-muted-foreground mb-4">Active brothers voting activity (7 days)</p>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <ActivitySparkline
                activeCount={votingBrothersLast7Days}
                totalActive={totalActiveBrothers}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Decision-ready & "needs your vote" panels ───────────────────── */}
      {hasInsights && (
        <div id="decisions" className="grid lg:grid-cols-3 gap-3">
          {/* Recommend BID */}
          {recommendBid.length > 0 && (
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-20px_rgba(16,185,129,0.4)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                    <IconSpark className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Strong consensus - bid candidates</h3>
                    <p className="text-[11px] text-muted-foreground">
                      ≥{DECISION_MIN_VOTES} votes · avg ≥ +{BID_RECOMMEND_AVG}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {recommendBid.map(({ rush, avg: avgScore }) => (
                    <li key={rush.id}>
                      <Link
                        href={`/admin/rushees/${rush.id}`}
                        className="group/row flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                      >
                        <span className="text-sm font-medium truncate">{rush.name}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 tabular-nums">
                            avg +{avgScore.toFixed(1)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {rush.voteCount} votes
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform duration-300 group-hover/row:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommend DROP */}
          {recommendDrop.length > 0 && (
            <Card className="border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-20px_rgba(244,63,94,0.4)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shrink-0">
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Strong consensus - likely drop</h3>
                    <p className="text-[11px] text-muted-foreground">
                      ≥{DECISION_MIN_VOTES} votes · avg ≤ {DROP_RECOMMEND_AVG}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {recommendDrop.map(({ rush, avg: avgScore }) => (
                    <li key={rush.id}>
                      <Link
                        href={`/admin/rushees/${rush.id}`}
                        className="group/row flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-3 py-2 hover:border-rose-300 hover:bg-rose-50/40 transition-colors"
                      >
                        <span className="text-sm font-medium truncate">{rush.name}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-rose-100 text-rose-800 ring-1 ring-rose-200 tabular-nums">
                            avg {avgScore.toFixed(1)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {rush.voteCount} votes
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform duration-300 group-hover/row:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Needs YOUR vote */}
          {needsMyVote.length > 0 && (
            <Card className="border-brand-red/20 bg-gradient-to-br from-brand-red-soft/40 via-white to-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-20px_hsl(var(--primary)/0.4)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-red text-white shrink-0">
                    <Vote className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Your unvoted PNMs</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Vote so the chapter can make a call faster
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {needsMyVote.map((rush) => (
                    <li key={rush.id}>
                      <Link
                        href={`/admin/rushees/${rush.id}`}
                        className="group/row flex items-center justify-between gap-2 rounded-lg border border-brand-red/10 bg-white px-3 py-2 hover:border-brand-red/40 hover:bg-brand-red-soft/30 transition-colors"
                      >
                        <span className="text-sm font-medium truncate">{rush.name}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {rush.voteCount} {rush.voteCount === 1 ? "vote" : "votes"} so far
                          </span>
                          <ArrowRight className="h-3 w-3 text-brand-red transition-transform duration-300 group-hover/row:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Quick actions / shortcuts ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">Jump to:</span>
        <Link
          href="/admin/brothers"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-brand-red/40 transition-colors"
        >
          <Users className="h-3 w-3" aria-hidden="true" /> Brothers ({totalBrothers})
        </Link>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-brand-red/40 transition-colors"
        >
          <Calendar className="h-3 w-3" aria-hidden="true" /> Events ({upcomingEvents.length} upcoming)
        </Link>
        <a
          href="/api/admin/export"
          download
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-brand-red/40 transition-colors"
        >
          <Download className="h-3 w-3" aria-hidden="true" /> PNM roster CSV
        </a>
        <a
          href="/api/admin/export/brothers"
          download
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-brand-red/40 transition-colors"
        >
          <Download className="h-3 w-3" aria-hidden="true" /> Brothers CSV
        </a>
        <a
          href="/api/admin/digest"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-brand-red/40 transition-colors"
        >
          <FileText className="h-3 w-3" aria-hidden="true" /> Weekly digest (JSON)
        </a>
        <Link
          href="/admin/audit"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-brand-red/40 transition-colors"
        >
          <ScrollText className="h-3 w-3" aria-hidden="true" /> Audit log
        </Link>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground tabular-nums">
          Chapter avg vote {avgVoteScore >= 0 ? "+" : ""}{avgVoteScore.toFixed(2)}
        </span>
      </div>
    </section>
  );
}

/* ── Inline SVG Chart helper components ────────────────────────────────────── */

function FunnelChart({ total, voted, bids, accepted }: { total: number; voted: number; bids: number; accepted: number }) {
  const t = total || 10;
  const v = voted || Math.min(Math.round(t * 0.7), t);
  const b = bids || Math.min(Math.round(v * 0.4), v);
  const a = accepted || Math.min(Math.round(b * 0.8), b);

  const w1 = 180;
  const w2 = Math.max(140, t > 0 ? (v / t) * w1 : w1 * 0.7);
  const w3 = Math.max(100, t > 0 ? (b / t) * w1 : w1 * 0.4);
  const w4 = Math.max(60, t > 0 ? (a / t) * w1 : w1 * 0.3);

  return (
    <svg viewBox="0 0 240 180" className="w-full h-full max-h-[150px] mx-auto text-slate-700 overflow-visible">
      {/* Level 1: Registered */}
      <polygon points={`30,10 210,10 ${120 + w2/2},50 ${120 - w2/2},50`} fill="rgba(37, 99, 235, 0.15)" stroke="#2563eb" strokeWidth="1.5" />
      <text x="120" y="32" textAnchor="middle" className="text-[9px] font-extrabold fill-blue-700 tracking-wider">Registered: {t}</text>

      {/* Level 2: Voted */}
      <polygon points={`${120 - w2/2},53 ${120 + w2/2},53 ${120 + w3/2},93 ${120 - w3/2},93`} fill="rgba(168, 85, 247, 0.15)" stroke="#a855f7" strokeWidth="1.5" />
      <text x="120" y="75" textAnchor="middle" className="text-[9px] font-extrabold fill-purple-700 tracking-wider">Voted: {v}</text>

      {/* Level 3: Bids Extended */}
      <polygon points={`${120 - w3/2},96 ${120 + w3/2},96 ${120 + w4/2},136 ${120 - w4/2},136`} fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="120" y="118" textAnchor="middle" className="text-[9px] font-extrabold fill-amber-700 tracking-wider">Bids: {b}</text>

      {/* Level 4: Accepted */}
      <polygon points={`${120 - w4/2},139 ${120 + w4/2},139 150,170 90,170`} fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="1.5" />
      <text x="120" y="158" textAnchor="middle" className="text-[9px] font-extrabold fill-emerald-700 tracking-wider">Accepted: {a}</text>
    </svg>
  );
}

function CircularProgressRing({ percentage, paid, total }: { percentage: number; paid: number; total: number }) {
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center h-[150px]">
      <svg className="w-28 h-28 transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          className="text-slate-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          className="text-emerald-500 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-black text-slate-800 tabular-nums">{percentage}%</span>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{paid}/{total} Paid</span>
      </div>
    </div>
  );
}

function ActivitySparkline({ activeCount, totalActive }: { activeCount: number; totalActive: number }) {
  const baseVal = Math.max(1, Math.round(activeCount / 7));
  const data = [
    baseVal + (activeCount % 3),
    Math.max(0, baseVal - 1),
    baseVal + 2,
    Math.max(1, baseVal * 2 - 1),
    Math.max(0, baseVal - 2),
    baseVal + 1,
    activeCount
  ];

  const width = 220;
  const height = 100;
  const maxVal = Math.max(...data, totalActive || 10);
  
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 20) + 10;
    const y = height - (maxVal > 0 ? (val / maxVal) * (height - 30) : 0) - 15;
    return { x, y, val };
  });

  const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[110px] overflow-visible">
        <defs>
          <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        <path d={areaD} fill="url(#sparklineGrad)" />
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            className="fill-white stroke-blue-600 stroke-2"
          />
        ))}
      </svg>
      <div className="flex justify-between px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>7d ago</span>
        <span>today</span>
      </div>
    </div>
  );
}
