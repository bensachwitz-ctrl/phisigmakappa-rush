import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRecentAudit } from "@/lib/audit";
import { isAdminRole, isAdminAuthed } from "@/lib/auth";
import {
  ScrollText, ArrowLeft, User, Vote, Megaphone, Settings, Trash2, Edit3, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * /admin/audit — chapter governance trail. Shows the most recent 50 events
 * (status changes, votes, dues toggles, broadcasts, settings changes,
 * deletions) so the e-board can answer "who did what when" months later.
 *
 * Admin-only because the log surfaces actor names + IPs.
 */
export default async function AuditPage() {
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Faudit");
  if (!isAdminRole()) redirect("/admin");

  const rows = await getRecentAudit(50);

  return (
    <main className="container py-8 max-w-4xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
          <ScrollText className="h-3 w-3" aria-hidden="true" /> Governance
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Every status change, vote, dues toggle, broadcast, and deletion is recorded here.
          Use this when a brother asks "who changed that?" or when nationals does a
          chapter audit. Retained for 1 year, then pruned by a cron job.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No audit entries yet. The log will populate as the chapter takes actions.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ol className="divide-y divide-border" role="list">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <ActionIcon action={r.action} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{r.actorName}</span>
                      <span className="text-muted-foreground"> · {humanAction(r.action)}</span>
                      {r.subjectName && (
                        <> <span className="font-medium text-foreground">{r.subjectName}</span></>
                      )}
                    </p>
                    {r.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{r.details}</p>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums shrink-0 text-right">
                    <p>{format(new Date(r.createdAt), "MMM d")}</p>
                    <p>{format(new Date(r.createdAt), "h:mm a")}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {rows.length >= 50 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Showing the most recent 50 entries. Older entries are kept for 1 year.
        </p>
      )}
    </main>
  );
}

function humanAction(action: string): string {
  switch (action) {
    case "RUSH_STATUS": return "updated PNM status —";
    case "RUSH_NOTES": return "edited notes on";
    case "RUSH_DELETED": return "deleted PNM";
    case "RUSH_VOTE_CAST": return "voted on";
    case "RUSH_VOTE_CHANGE": return "changed vote on";
    case "RUSH_VOTE_CLEARED": return "cleared vote on";
    case "BROTHER_CREATED": return "added brother";
    case "BROTHER_UPDATED": return "updated brother";
    case "BROTHER_DUES": return "toggled dues for";
    case "BROTHER_DELETED": return "removed brother";
    case "EVENT_CREATED": return "created event";
    case "EVENT_UPDATED": return "updated event";
    case "EVENT_DELETED": return "deleted event";
    case "ANNOUNCEMENT_CREATED": return "posted announcement";
    case "BROADCAST_SENT": return "sent broadcast";
    case "SETTINGS_UPDATED": return "changed settings";
    default: return action.replace(/_/g, " ").toLowerCase();
  }
}

function ActionIcon({ action }: { action: string }) {
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
    <span className={cn(
      "inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0",
      cfg.tone === "phisig-red" && "bg-phisig-red-soft text-phisig-red",
      cfg.tone === "amber" && "bg-amber-50 text-amber-700",
      cfg.tone === "emerald" && "bg-emerald-50 text-emerald-700",
      cfg.tone === "blue" && "bg-blue-50 text-blue-700",
      cfg.tone === "rose" && "bg-rose-50 text-rose-700",
      cfg.tone === "muted" && "bg-secondary text-muted-foreground",
    )}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}
