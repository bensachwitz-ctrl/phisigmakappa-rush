"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { avatarSrc } from "@/lib/image-url";
import { IconMail as Mail, IconPhone as Phone, IconGraduation as GraduationCap, IconPin as MapPin, IconThumbsUp as ThumbsUp, IconThumbsDown as ThumbsDown, IconMinus as Minus, IconStar as Star, IconCalendar as Calendar } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

import { IconSpark } from "@/components/brand/icons";
// Mirror of Roster.Rush — kept loose so the modal works against either the
// admin roster or the brother view without re-importing types.
type Rush = {
  id: string;
  name: string;
  email: string;
  phone: string;
  hometown: string | null;
  major: string | null;
  year: string | null;
  status: string;
  voteSum: number;
  voteCount: number;
  attendanceCount: number;
  headshotUrl: string | null;
  createdAt: string;
};

/**
 * PNM comparison modal — opens when the rush chair multi-selects 2-4 PNMs
 * and clicks "Compare". Renders a side-by-side card grid so the e-board
 * can pick between similar candidates without having to open each profile
 * one at a time.
 *
 * Per-row metrics (5 dimensions):
 *   1. Vote breakdown (avg score, total votes)
 *   2. Year + Major
 *   3. Hometown
 *   4. Events attended
 *   5. Cycle age (days in funnel)
 *
 * The "winner" per dimension gets a subtle highlight (best vote avg,
 * best year, most events attended). Not prescriptive — just a visual
 * cue for the e-board to compare faster.
 */
export function PnmCompareModal({
  open, onClose, rushes,
}: {
  open: boolean;
  onClose: () => void;
  rushes: Rush[];
}) {
  // Compute per-rush stats once.
  const stats = React.useMemo(() => rushes.map((r) => {
    const avg = r.voteCount > 0 ? r.voteSum / r.voteCount : 0;
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000)));
    return { rush: r, avg, ageDays };
  }), [rushes]);

  // Find leaders on each dimension (only when 2+ items, only when nonzero).
  const bestAvg = stats.reduce((b, s) => s.avg > b.avg ? s : b, stats[0] ?? { avg: -Infinity }).avg;
  const mostVotes = stats.reduce((b, s) => s.rush.voteCount > b.rush.voteCount ? s : b, stats[0] ?? { rush: { voteCount: -1 } }).rush.voteCount;
  const mostEvents = stats.reduce((b, s) => s.rush.attendanceCount > b.rush.attendanceCount ? s : b, stats[0] ?? { rush: { attendanceCount: -1 } }).rush.attendanceCount;

  if (rushes.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSpark className="h-5 w-5 text-brand-red" aria-hidden="true" />
            Compare {rushes.length} {rushes.length === 1 ? "PNM" : "PNMs"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Side-by-side decision view. Highlighted values lead each row.
          </p>
        </DialogHeader>

        <div
          className={cn(
            "grid gap-3 mt-4",
            rushes.length === 2 && "grid-cols-1 sm:grid-cols-2",
            rushes.length === 3 && "grid-cols-1 sm:grid-cols-3",
            rushes.length >= 4 && "grid-cols-2 lg:grid-cols-4",
          )}
        >
          {stats.map(({ rush: r, avg, ageDays }) => (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
            >
              {/* Header — avatar + name + status */}
              <div className="flex items-start gap-3">
                {r.headshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc(r.headshotUrl, 96)}
                    alt={r.name}
                    className="h-12 w-12 rounded-full object-cover ring-1 ring-border shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-red to-brand-red-dark text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    {r.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold tracking-tight truncate">{r.name}</p>
                  <Badge className="mt-1 text-[10px] uppercase tracking-wider">{r.status.replace("_", " ")}</Badge>
                </div>
              </div>

              {/* Compare rows */}
              <CompareRow
                label="Vote average"
                value={r.voteCount > 0 ? (avg >= 0 ? "+" + avg.toFixed(1) : avg.toFixed(1)) : "-"}
                isLeader={r.voteCount > 0 && avg === bestAvg && rushes.length > 1}
                tone={avg >= 1 ? "emerald" : avg <= -1 ? "rose" : "muted"}
                icon={avg >= 1 ? ThumbsUp : avg <= -1 ? ThumbsDown : Minus}
              />
              <CompareRow
                label="Votes cast"
                value={String(r.voteCount)}
                isLeader={r.voteCount === mostVotes && r.voteCount > 0 && rushes.length > 1}
                icon={Star}
              />
              <CompareRow
                label="Year"
                value={r.year || "-"}
                icon={GraduationCap}
              />
              <CompareRow
                label="Major"
                value={r.major || "-"}
                icon={GraduationCap}
              />
              <CompareRow
                label="Hometown"
                value={r.hometown || "-"}
                icon={MapPin}
              />
              <CompareRow
                label="Events attended"
                value={String(r.attendanceCount)}
                isLeader={r.attendanceCount === mostEvents && r.attendanceCount > 0 && rushes.length > 1}
                icon={Calendar}
              />
              <CompareRow
                label="Days in cycle"
                value={String(ageDays)}
                icon={Calendar}
              />

              {/* Contact (compact) */}
              <div className="border-t border-border pt-3 mt-1 space-y-1 text-xs">
                <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground truncate">
                  <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{r.email}</span>
                </a>
                <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {r.phone}
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompareRow({
  label, value, icon: Icon, isLeader = false, tone = "muted",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  isLeader?: boolean;
  tone?: "muted" | "emerald" | "rose";
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
      isLeader && "bg-emerald-50 ring-1 ring-emerald-200",
    )}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </span>
      <span className={cn(
        "font-semibold tabular-nums",
        tone === "emerald" && "text-emerald-700",
        tone === "rose" && "text-rose-700",
        isLeader && "text-emerald-800",
      )}>
        {value}
        {isLeader && <span className="ml-1 text-[10px] font-medium text-emerald-700" aria-label="leader on this metric">★</span>}
      </span>
    </div>
  );
}
