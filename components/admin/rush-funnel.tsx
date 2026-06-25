import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, TrendingDown, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rush funnel visualization — horizontal bar chart with drop-off arrows.
 *
 * Stages (left → right):
 *   1. Submitted   (anyone who filled out the rush form, all statuses)
 *   2. Active      (still in consideration — status === "ACTIVE")
 *   3. Bid         (status in BID_EXTENDED + ACCEPTED + DECLINED)
 *   4. Accepted    (status === "ACCEPTED")
 *
 * Each bar's width is proportional to its count vs the largest stage
 * (almost always Submitted). Below each stage we show the count, the
 * % of total submitted, and the drop-off vs the previous stage.
 *
 * This is the single most important "where is my cycle going" view for
 * the rush chair — it makes funnel leakage immediately visible.
 *
 * Pure CSS / Tailwind — no chart library, no client JS.
 */

export type FunnelStage = {
  id: "submitted" | "active" | "bid" | "accepted";
  label: string;
  count: number;
  tone: "phisig-red" | "amber" | "emerald" | "blue";
  description: string;
};

export function RushFunnel({
  submitted,
  active,
  bid,
  accepted,
}: {
  submitted: number;
  active: number;
  bid: number;
  accepted: number;
}) {
  const stages: FunnelStage[] = [
    { id: "submitted", label: "Submitted",  count: submitted, tone: "blue",       description: "Filled out the rush interest form" },
    { id: "active",    label: "Active",     count: active,    tone: "phisig-red", description: "Still in consideration" },
    { id: "bid",       label: "Bid",        count: bid,       tone: "amber",      description: "Bid extended (any response)" },
    { id: "accepted",  label: "Accepted",   count: accepted,  tone: "emerald",    description: "Joined the chapter" },
  ];

  const max = Math.max(submitted, 1);

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Users className="h-4 w-4 text-phisig-red" aria-hidden="true" />
              Rush funnel
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Where the cycle is leaking - visible drop-off between every stage
            </p>
          </div>
          {submitted > 0 && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
              {Math.round((accepted / submitted) * 100)}% overall conversion
            </span>
          )}
        </div>

        <ol className="space-y-3" role="list" aria-label="Rush conversion funnel">
          {stages.map((stage, i) => {
            const prev = i > 0 ? stages[i - 1] : null;
            const widthPct = (stage.count / max) * 100;
            const stageOfTotalPct = submitted > 0 ? Math.round((stage.count / submitted) * 100) : 0;
            const dropFromPrev = prev && prev.count > 0
              ? Math.round(((prev.count - stage.count) / prev.count) * 100)
              : null;
            return (
              <li key={stage.id}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold tracking-tight">{stage.label}</span>
                    <span className="text-[11px] text-muted-foreground">{stage.description}</span>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                    <span className="font-semibold text-foreground">{stage.count}</span>
                    {submitted > 0 && (
                      <span className="ml-1.5">· {stageOfTotalPct}%</span>
                    )}
                  </div>
                </div>
                <div className="relative h-8 w-full overflow-hidden rounded-md bg-secondary/40">
                  <div
                    role="presentation"
                    className={cn(
                      "h-full rounded-md transition-[width] duration-500 ease-out",
                      stage.tone === "phisig-red" && "bg-phisig-red",
                      stage.tone === "amber" && "bg-amber-500",
                      stage.tone === "emerald" && "bg-emerald-500",
                      stage.tone === "blue" && "bg-blue-500",
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                {dropFromPrev !== null && (
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <ArrowDown className="h-3 w-3" aria-hidden="true" />
                    {dropFromPrev > 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-amber-600" aria-hidden="true" />
                        <span><span className="font-medium text-amber-700">{dropFromPrev}%</span> drop-off from {prev?.label.toLowerCase()}</span>
                      </>
                    ) : dropFromPrev === 0 ? (
                      <span>No drop-off from {prev?.label.toLowerCase()}</span>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                        <span>Growth (shouldn&apos;t happen - likely status change)</span>
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {submitted === 0 && (
          <p className="mt-4 text-xs text-muted-foreground text-center italic">
            No PNMs in the funnel yet - share your public rush form URL.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
