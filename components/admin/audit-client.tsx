"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ScrollText, User, Vote, Megaphone, Settings, Trash2, Edit3, Sparkles,
  Search, X, Filter, CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  actorName: string;
  action: string;
  subjectType: string;
  subjectId: string | null;
  subjectName: string | null;
  details: string | null;
  createdAt: string;
};

/**
 * Client-side audit log viewer with three filters:
 *   - Free-text search across actor name, subject name, details
 *   - Subject-type chips (Rush / Brother / Event / Announcement / Broadcast / Settings)
 *   - Actor-name chips (all unique actors from the loaded slice)
 *
 * All filtering is in-memory against the 50 server-rendered rows — keeps
 * the page snappy and avoids round-trips. If a chapter needs to search
 * beyond the most-recent 50, the cron-prune ensures the log stays under
 * a year so the slice is always representative.
 */
export function AuditClient({ initialRows }: { initialRows: Row[] }) {
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);
  const [actorFilter, setActorFilter] = React.useState<string | null>(null);

  // Unique actor list — derived from the loaded slice so the chip set
  // matches what the user is actually looking at.
  const actors = React.useMemo(() => {
    const seen = new Set<string>();
    for (const r of initialRows) seen.add(r.actorName);
    return Array.from(seen).sort();
  }, [initialRows]);

  // Unique subject types — same idea.
  const types = React.useMemo(() => {
    const seen = new Set<string>();
    for (const r of initialRows) if (r.subjectType) seen.add(r.subjectType);
    return Array.from(seen).sort();
  }, [initialRows]);

  const filtered = React.useMemo(() => {
    let list = initialRows;
    if (typeFilter) list = list.filter((r) => r.subjectType === typeFilter);
    if (actorFilter) list = list.filter((r) => r.actorName === actorFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) =>
        r.actorName.toLowerCase().includes(q) ||
        (r.subjectName || "").toLowerCase().includes(q) ||
        (r.details || "").toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialRows, query, typeFilter, actorFilter]);

  const hasActiveFilter = !!query.trim() || !!typeFilter || !!actorFilter;

  if (initialRows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No audit entries yet. The log will populate as the chapter takes actions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actor name, subject, or details…"
          className="pl-9 pr-9"
          aria-label="Search audit log"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter chip rows */}
      {(types.length > 0 || actors.length > 0) && (
        <div className="space-y-2 text-xs">
          {types.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground font-medium flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3" aria-hidden="true" /> Subject:
              </span>
              {types.map((t) => (
                <FilterChip
                  key={t}
                  label={t}
                  active={typeFilter === t}
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                />
              ))}
            </div>
          )}
          {actors.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground font-medium flex items-center gap-1 mr-1">
                <User className="h-3 w-3" aria-hidden="true" /> Actor:
              </span>
              {actors.map((a) => (
                <FilterChip
                  key={a}
                  label={a}
                  active={actorFilter === a}
                  onClick={() => setActorFilter(actorFilter === a ? null : a)}
                />
              ))}
            </div>
          )}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => { setQuery(""); setTypeFilter(null); setActorFilter(null); }}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" aria-hidden="true" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-[11px] text-muted-foreground">
        {hasActiveFilter
          ? `${filtered.length} of ${initialRows.length} entries match`
          : `${initialRows.length} most recent entries`}
      </p>

      {/* Entries */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No entries match these filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ol className="divide-y divide-border" role="list">
              {filtered.map((r) => (
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

      {initialRows.length >= 50 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing the most recent 50 entries. Older entries are kept for 1 year then auto-pruned.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  label, active, onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/30",
        active
          ? "border-phisig-red bg-phisig-red-soft text-phisig-red"
          : "border-border bg-card text-muted-foreground hover:border-phisig-red/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
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
    case "BID_TOKEN_GENERATED": return "generated bid link for";
    case "BID_ACCEPTED": return "accepted bid —";
    case "BID_DECLINED": return "declined bid —";
    case "BROTHER_CREATED": return "added brother";
    case "BROTHER_UPDATED": return "updated brother";
    case "BROTHER_DUES": return "toggled dues for";
    case "BROTHER_ROLE": return "changed role for";
    case "BROTHER_DELETED": return "removed brother";
    case "DUES_CHECKOUT_STARTED": return "started dues checkout for";
    case "DUES_PAID": return "received dues payment from";
    case "DUES_PAID_MANUAL": return "marked dues paid for";
    case "DUES_FAILED": return "saw failed dues payment from";
    case "DUES_REFUNDED": return "refunded dues for";
    case "DUES_SETTINGS_CHANGED": return "changed dues settings";
    case "EVENT_CREATED": return "created event";
    case "EVENT_UPDATED": return "updated event";
    case "EVENT_DELETED": return "deleted event";
    case "ANNOUNCEMENT_CREATED": return "posted announcement";
    case "ANNOUNCEMENT_PINNED": return "pinned announcement";
    case "ANNOUNCEMENT_UNPINNED": return "unpinned announcement";
    case "ANNOUNCEMENT_UPDATED": return "edited announcement";
    case "ANNOUNCEMENT_DELETED": return "deleted announcement";
    case "BROADCAST_SENT": return "sent broadcast to";
    case "SETTINGS_UPDATED": return "changed settings —";
    default: return action.replace(/_/g, " ").toLowerCase();
  }
}

function ActionIcon({ action }: { action: string }) {
  const cfg = (() => {
    if (action.startsWith("RUSH_VOTE")) return { icon: Vote, tone: "phisig-red" as const };
    if (action.startsWith("RUSH")) return { icon: Edit3, tone: "amber" as const };
    if (action.startsWith("DUES")) return { icon: CreditCard, tone: "emerald" as const };
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
