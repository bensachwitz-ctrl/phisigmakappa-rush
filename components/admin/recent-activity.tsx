import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ScrollText, Vote, Edit3, Megaphone, Settings, Sparkles,
  User, Trash2, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact recent-activity feed — last 8 audit entries with relative
 * timestamps. Renders on /admin so the signed-in brother sees what the
 * chapter just did without leaving the dashboard.
 *
 * Compact on purpose: this is the "ambient awareness" view; the full log
 * lives at /admin/audit. We render the 8 most recent rows in a single
 * column with action icon + actor + verb + subject + "Xm ago".
 *
 * Auto-hides when the audit log is empty (brand-new chapter, day 1).
 */

export type RecentEntry = {
  id: string;
  actorName: string;
  action: string;
  subjectName: string | null;
  details: string | null;
  createdAt: string;
};

export function RecentActivity({ entries }: { entries: RecentEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-phisig-red" aria-hidden="true" />
            Recent chapter activity
          </h3>
          <Link
            href="/admin/audit"
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
          >
            Full log <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <ol className="space-y-2" role="list">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-2.5 text-xs">
              <ActionDot action={e.action} />
              <div className="flex-1 min-w-0 leading-snug">
                <p className="truncate">
                  <span className="font-semibold text-foreground">{e.actorName}</span>
                  <span className="text-muted-foreground"> {humanVerb(e.action)} </span>
                  {e.subjectName && (
                    <span className="font-medium text-foreground">{e.subjectName}</span>
                  )}
                </p>
                {e.details && (
                  <p className="text-[11px] text-muted-foreground tabular-nums truncate">{e.details}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 mt-0.5">
                {relTime(e.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

// Compact action verb — verb-only, since the actor name + subject already
// appear in the line. "voted on" reads naturally between actor + subject.
function humanVerb(action: string): string {
  switch (action) {
    case "RUSH_STATUS": return "updated";
    case "RUSH_NOTES": return "edited notes on";
    case "RUSH_DELETED": return "deleted PNM";
    case "RUSH_VOTE_CAST": return "voted on";
    case "RUSH_VOTE_CHANGE": return "changed vote on";
    case "RUSH_VOTE_CLEARED": return "cleared vote on";
    case "BID_TOKEN_GENERATED": return "issued bid for";
    case "BID_ACCEPTED": return "got bid acceptance from";
    case "BID_DECLINED": return "got bid decline from";
    case "BROTHER_CREATED": return "added";
    case "BROTHER_UPDATED": return "updated";
    case "BROTHER_DUES": return "toggled dues for";
    case "BROTHER_ROLE": return "changed role for";
    case "BROTHER_DELETED": return "removed";
    case "EVENT_CREATED": return "created event";
    case "EVENT_UPDATED": return "updated event";
    case "EVENT_DELETED": return "deleted event";
    case "ANNOUNCEMENT_CREATED": return "posted";
    case "ANNOUNCEMENT_PINNED": return "pinned";
    case "ANNOUNCEMENT_UNPINNED": return "unpinned";
    case "ANNOUNCEMENT_UPDATED": return "edited";
    case "ANNOUNCEMENT_DELETED": return "deleted";
    case "BROADCAST_SENT": return "broadcast to";
    case "SETTINGS_UPDATED": return "saved settings:";
    default: return action.replace(/_/g, " ").toLowerCase();
  }
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActionDot({ action }: { action: string }) {
  const cfg = (() => {
    if (action.startsWith("RUSH_VOTE")) return { icon: Vote, tone: "phisig-red" as const };
    if (action.startsWith("RUSH")) return { icon: Edit3, tone: "amber" as const };
    if (action.startsWith("BROTHER")) return { icon: User, tone: "blue" as const };
    if (action.startsWith("EVENT")) return { icon: Sparkles, tone: "emerald" as const };
    if (action.startsWith("BROADCAST") || action.startsWith("ANNOUNCEMENT")) return { icon: Megaphone, tone: "amber" as const };
    if (action.startsWith("SETTINGS")) return { icon: Settings, tone: "muted" as const };
    if (action.includes("DELETED")) return { icon: Trash2, tone: "rose" as const };
    return { icon: ScrollText, tone: "muted" as const };
  })();
  const Icon = cfg.icon;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0 mt-0.5",
        cfg.tone === "phisig-red" && "bg-phisig-red-soft text-phisig-red",
        cfg.tone === "amber" && "bg-amber-50 text-amber-700",
        cfg.tone === "emerald" && "bg-emerald-50 text-emerald-700",
        cfg.tone === "blue" && "bg-blue-50 text-blue-700",
        cfg.tone === "rose" && "bg-rose-50 text-rose-700",
        cfg.tone === "muted" && "bg-secondary text-muted-foreground",
      )}
    >
      <Icon className="h-2.5 w-2.5" />
    </span>
  );
}
