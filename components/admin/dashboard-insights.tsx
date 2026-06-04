import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, AlertCircle, CheckCircle2, Clock, Users, Calendar,
  ThumbsUp, ThumbsDown, Sparkles, ArrowRight, Vote, Mail,
  Download, FileText, Palette, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  // that have been customized off the reference Phi Sig USC defaults. Drives
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
      tone: "phisig-red" as const,
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
      value: bidsExtendedCount > 0 ? `${bidConversionPct}%` : "—",
      sub: `${acceptedCount}/${bidsExtendedCount} accepted`,
      icon: ThumbsUp,
      href: "/admin",
      tone: "emerald" as const,
    },
    {
      label: "Next event",
      value: nextEvent ? new Date(nextEvent.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
      sub: nextEvent ? nextEvent.name : "No upcoming public events",
      icon: Calendar,
      href: "/admin/events",
      tone: "phisig-red" as const,
    },
  ];

  const hasInsights = decidableRushes.length > 0 || needsMyVote.length > 0;

  return (
    <section className="space-y-4 mb-6" aria-label="Chapter insights and decision queue">
      {/* ── Brand readiness banner — only shown when chapter identity is
          still mostly defaults. Tells a brand-new chapter where to go to
          re-brand the site from "Phi Sig Gamma Triton USC" to their own
          identity. Hides itself once enough fields are customized. */}
      {brandReadiness && !brandReadiness.isSetupComplete && (
        <Link
          href="/admin/setup"
          className="group block rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-white p-4 hover:border-amber-400 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white shrink-0">
              <Palette className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold tracking-tight text-amber-900">
                Finish chapter setup — {brandReadiness.customizedFields}/{brandReadiness.totalFields} identity fields customized
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                The site is still rendering with the Phi Sig Gamma Triton USC reference defaults.
                Run the 5-minute setup wizard to re-brand page titles, social cards, footer attribution, and the Knowledge Panel record.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 shrink-0 group-hover:translate-x-0.5 transition-transform">
              Open wizard <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 ml-12">
            <div
              className="h-1.5 rounded-full bg-amber-100 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={brandReadiness.totalFields}
              aria-valuenow={brandReadiness.customizedFields}
              aria-label="Chapter setup progress"
            >
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.round((brandReadiness.customizedFields / brandReadiness.totalFields) * 100)}%` }}
              />
            </div>
          </div>
        </Link>
      )}

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group block rounded-2xl border border-border bg-card p-3.5 transition-all hover:border-phisig-red/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/30"
            >
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {kpi.label}
                </p>
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                    kpi.tone === "phisig-red" && "bg-phisig-red-soft text-phisig-red",
                    kpi.tone === "emerald" && "bg-emerald-50 text-emerald-700",
                    kpi.tone === "amber" && "bg-amber-50 text-amber-700",
                    kpi.tone === "muted" && "bg-secondary text-muted-foreground",
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

      {/* ── Decision-ready & "needs your vote" panels ───────────────────── */}
      {hasInsights && (
        <div id="decisions" className="grid lg:grid-cols-3 gap-3">
          {/* Recommend BID */}
          {recommendBid.length > 0 && (
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Strong consensus — bid candidates</h3>
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
                        className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                      >
                        <span className="text-sm font-medium truncate">{rush.name}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 tabular-nums">
                            avg +{avgScore.toFixed(1)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {rush.voteCount} votes
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
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
            <Card className="border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shrink-0">
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Strong consensus — likely drop</h3>
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
                        className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-3 py-2 hover:border-rose-300 hover:bg-rose-50/40 transition-colors"
                      >
                        <span className="text-sm font-medium truncate">{rush.name}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-rose-100 text-rose-800 ring-1 ring-rose-200 tabular-nums">
                            avg {avgScore.toFixed(1)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {rush.voteCount} votes
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
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
            <Card className="border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/40 via-white to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-phisig-red text-white shrink-0">
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
                        className="flex items-center justify-between gap-2 rounded-lg border border-phisig-red/10 bg-white px-3 py-2 hover:border-phisig-red/40 hover:bg-phisig-red-soft/30 transition-colors"
                      >
                        <span className="text-sm font-medium truncate">{rush.name}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {rush.voteCount} {rush.voteCount === 1 ? "vote" : "votes"} so far
                          </span>
                          <ArrowRight className="h-3 w-3 text-phisig-red" aria-hidden="true" />
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
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-phisig-red/40 transition-colors"
        >
          <Users className="h-3 w-3" aria-hidden="true" /> Brothers ({totalBrothers})
        </Link>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-phisig-red/40 transition-colors"
        >
          <Calendar className="h-3 w-3" aria-hidden="true" /> Events ({upcomingEvents.length} upcoming)
        </Link>
        <a
          href="/api/admin/export"
          download
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-phisig-red/40 transition-colors"
        >
          <Download className="h-3 w-3" aria-hidden="true" /> PNM roster CSV
        </a>
        <a
          href="/api/admin/export/brothers"
          download
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-phisig-red/40 transition-colors"
        >
          <Download className="h-3 w-3" aria-hidden="true" /> Brothers CSV
        </a>
        <a
          href="/api/admin/digest"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-phisig-red/40 transition-colors"
        >
          <FileText className="h-3 w-3" aria-hidden="true" /> Weekly digest (JSON)
        </a>
        <Link
          href="/admin/audit"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 hover:bg-secondary hover:border-phisig-red/40 transition-colors"
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
