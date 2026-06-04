import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Vote, CalendarCheck, Clock, Trophy, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/image-url";

/**
 * Brother engagement leaderboard — top 5 brothers in 3 categories. Renders
 * above the directory cards on /admin/brothers so the chapter sees who's
 * pulling their weight (and who isn't) at a glance.
 *
 * Categories:
 *   1. Top voters (most PNM votes cast, all-time)
 *   2. Top RSVPs (most event RSVPs sent — proxy for engagement)
 *   3. Top service hours
 *
 * Designed to drive friendly competition, not shaming. Only top 5 per
 * category, brothers with 0 in a category are omitted. Read-only —
 * brothers see this view too.
 */

export type LeaderboardBrother = {
  id: string;
  name: string;
  position: string | null;
  headshotUrl: string | null;
  pledgeClass: string | null;
  voteCount: number;
  rsvpCount: number;
  serviceHours: number;
};

export function BrotherLeaderboard({ brothers }: { brothers: LeaderboardBrother[] }) {
  // Build three sorted slices. Hide a category if no one has any data
  // (avoids showing "1. Joe — 0 votes" before the chapter has voted).
  const topVoters = [...brothers]
    .filter((b) => b.voteCount > 0)
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 5);
  const topRsvps = [...brothers]
    .filter((b) => b.rsvpCount > 0)
    .sort((a, b) => b.rsvpCount - a.rsvpCount)
    .slice(0, 5);
  const topService = [...brothers]
    .filter((b) => b.serviceHours > 0)
    .sort((a, b) => b.serviceHours - a.serviceHours)
    .slice(0, 5);

  const showAny = topVoters.length > 0 || topRsvps.length > 0 || topService.length > 0;
  if (!showAny) return null;

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shrink-0">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Chapter engagement leaderboard</h3>
            <p className="text-[11px] text-muted-foreground">Top 5 in each category — updates in real time</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <LeaderboardColumn
            title="Top voters"
            icon={Vote}
            tone="phisig-red"
            unit="vote"
            entries={topVoters.map((b) => ({ id: b.id, name: b.name, position: b.position, headshotUrl: b.headshotUrl, count: b.voteCount }))}
          />
          <LeaderboardColumn
            title="Top RSVPs"
            icon={CalendarCheck}
            tone="emerald"
            unit="RSVP"
            entries={topRsvps.map((b) => ({ id: b.id, name: b.name, position: b.position, headshotUrl: b.headshotUrl, count: b.rsvpCount }))}
          />
          <LeaderboardColumn
            title="Top service hours"
            icon={Clock}
            tone="blue"
            unit="hr"
            entries={topService.map((b) => ({ id: b.id, name: b.name, position: b.position, headshotUrl: b.headshotUrl, count: b.serviceHours }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type Entry = {
  id: string;
  name: string;
  position: string | null;
  headshotUrl: string | null;
  count: number;
};

function LeaderboardColumn({
  title, icon: Icon, tone, unit, entries,
}: {
  title: string;
  icon: React.ElementType;
  tone: "phisig-red" | "emerald" | "blue";
  unit: string;
  entries: Entry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3 w-3" aria-hidden="true" /> {title}
        </p>
        <p className="mt-3 text-xs text-muted-foreground italic">No data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" aria-hidden="true" /> {title}
      </p>
      <ol className="mt-2 space-y-1.5" role="list">
        {entries.map((e, i) => (
          <li
            key={e.id}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5",
              i === 0 && "bg-amber-50 ring-1 ring-amber-200",
            )}
          >
            <span className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums shrink-0",
              i === 0 && "bg-amber-500 text-white",
              i === 1 && "bg-zinc-300 text-zinc-800",
              i === 2 && "bg-orange-300 text-orange-900",
              i > 2 && "bg-secondary text-muted-foreground",
            )}>
              {i === 0 ? <Crown className="h-3 w-3" aria-hidden="true" /> : i + 1}
            </span>
            {e.headshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc(e.headshotUrl, 48)}
                alt=""
                className="h-6 w-6 rounded-full object-cover ring-1 ring-border shrink-0"
              />
            ) : (
              <div className={cn(
                "h-6 w-6 rounded-full text-white flex items-center justify-center text-[10px] font-semibold shrink-0",
                tone === "phisig-red" && "bg-phisig-red",
                tone === "emerald" && "bg-emerald-500",
                tone === "blue" && "bg-blue-500",
              )}>
                {e.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{e.name}</p>
              {e.position && (
                <p className="text-[10px] text-muted-foreground truncate">{e.position}</p>
              )}
            </div>
            <Badge className={cn(
              "tabular-nums text-[10px] shrink-0",
              tone === "phisig-red" && "bg-phisig-red-soft text-phisig-red ring-1 ring-phisig-red/20",
              tone === "emerald" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
              tone === "blue" && "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
            )}>
              {e.count} {unit}{e.count === 1 ? "" : "s"}
            </Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}
