"use client";

// RusheesManager — central PNM dashboard (rush-cycle feature 1).
//
// Lives at /admin/rushees. Combines:
//   • Stats row (total PNMs, avg attendance, conversion-to-bid rate, drop-off)
//   • Filter chips (all / hot / 2+ events / no-shows / bid sent / accepted /
//     declined)
//   • Bulk-text sheet (multi-select + send through /api/send-sms)
//   • Add-PNM dialog (POSTs to /api/admin/rushees)
//   • Sortable table with photo + click-through to detail page
//
// "Hot prospect" = active status + voteSum > 0 + impressionCount > 0 OR
// attendance ≥ 2. Heuristic — gives the rush chair a "look here first" pile
// without needing to define a ranking model.
//
// Mobile-first: table collapses to a stacked-card layout below the md
// breakpoint so the rush chair can run the whole thing from their phone.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/image-url";
import { IconSpark } from "@/components/brand/icons";
import {
  Users, Plus, MessageCircle, Search, Loader2, TrendingUp,
  Flame, CalendarCheck, UserX, Send, CheckCircle2, XCircle,
  ArrowRight, Key, Car, Clock, ShieldAlert, Calendar,
} from "lucide-react";

export type RusheeListRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  year: string | null;
  major: string | null;
  hometown: string | null;
  headshotUrl: string | null;
  status: string;
  attendanceCount: number;
  voteSum: number;
  voteCount: number;
  impressionCount: number;
  lastImpressionTone: string | null;
  bidToken: string | null;
  bidRespondedAt: string | null;
  bidResponseChoice: string | null;
  createdAt: string;
};

type FilterId =
  | "all"
  | "hot"
  | "attended2"
  | "noshow"
  | "bidsent"
  | "accepted"
  | "declined";

const FILTERS: { id: FilterId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all",        label: "All",          icon: Users },
  { id: "hot",        label: "Hot prospects", icon: Flame },
  { id: "attended2",  label: "Attended 2+",   icon: CalendarCheck },
  { id: "noshow",     label: "No-shows",      icon: UserX },
  { id: "bidsent",    label: "Bid sent",      icon: Send },
  { id: "accepted",   label: "Accepted",      icon: CheckCircle2 },
  { id: "declined",   label: "Declined",      icon: XCircle },
];

// Tone color map for the "last impression" indicator dot.
const TONE_DOT: Record<string, string> = {
  positive: "bg-emerald-500",
  neutral:  "bg-zinc-400",
  concern:  "bg-amber-500",
};

function statusBadge(status: string) {
  switch (status) {
    case "BID_EXTENDED":
      return <Badge className="bg-amber-100 text-amber-900 ring-1 ring-amber-200">Bid sent</Badge>;
    case "ACCEPTED":
      return <Badge className="bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200">Accepted</Badge>;
    case "DECLINED":
      return <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Declined</Badge>;
    case "DROPPED":
      return <Badge className="bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 line-through">Dropped</Badge>;
    default:
      return <Badge className="bg-sky-50 text-sky-900 ring-1 ring-sky-200">Active</Badge>;
  }
}

function isHot(r: RusheeListRow): boolean {
  if (r.status !== "ACTIVE") return false;
  if (r.attendanceCount >= 2) return true;
  if (r.voteSum > 0 && r.impressionCount > 0) return true;
  return false;
}

export function RusheesManager({ 
  initial,
  initialRushActive = true,
  chapterName = "the Chapter"
}: { 
  initial: RusheeListRow[]; 
  initialRushActive?: boolean;
  chapterName?: string;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [rushes, setRushes] = React.useState<RusheeListRow[]>(initial);
  const [filter, setFilter] = React.useState<FilterId>("all");
  const [query, setQuery] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);

  // New Members & Sober Driver Schedule States
  const [isRushActive, setIsRushActive] = React.useState(initialRushActive);
  const [updatingSettings, setUpdatingSettings] = React.useState(false);
  const [activeSubTab, setActiveSubTab] = React.useState<"directory" | "schedule">("directory");
  const [shifts, setShifts] = React.useState<any[]>([]);
  const [pledges, setPledges] = React.useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = React.useState(false);

  const fetchSchedule = React.useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch("/api/admin/sober-schedule");
      const data = await res.json();
      if (data.ok) {
        setShifts(data.shifts);
        setPledges(data.pledges);
      }
    } catch (err) {
      console.warn("Failed to load schedule", err);
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isRushActive) {
      fetchSchedule();
    }
  }, [isRushActive, fetchSchedule]);

  const toggleRushActive = async () => {
    setUpdatingSettings(true);
    const nextVal = !isRushActive;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          updates: {
            "rush.isActive": nextVal ? "true" : "false"
          }
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update settings");
      }
      setIsRushActive(nextVal);
      push({
        title: nextVal ? "Rush Season Re-opened" : "Rush Season Completed",
        description: nextVal 
          ? "Roster view returned to Recruitment Pipeline." 
          : "Roster view has converted to New Members & Sober Driver Schedule.",
        variant: "success"
      });
      router.refresh();
    } catch (err: any) {
      push({ title: err.message || "Failed to update settings", variant: "destructive" });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const assignDriver = async (day: string, shiftHours: string, memberId: string) => {
    // #16 — the first <option> is a placeholder ("Select a new member..."); if the
    // admin re-selects it, memberId is empty. Don't POST an empty assignment (it
    // errored with a red "Assignment failed" toast). Removing a driver is done
    // with the "Clear" button.
    if (!memberId) return;
    try {
      const res = await fetch("/api/admin/sober-schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ day, shiftHours, memberId }),
      });
      const data = await res.json();
      if (data.ok) {
        push({ title: "Sober driver assigned", variant: "success" });
        fetchSchedule();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      push({ title: err.message || "Assignment failed", variant: "destructive" });
    }
  };

  const removeShift = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/admin/sober-schedule?id=${shiftId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        push({ title: "Assignment removed", variant: "success" });
        fetchSchedule();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      push({ title: err.message || "Removal failed", variant: "destructive" });
    }
  };

  // Helper to check if a shift is active "right now" in the user's browser
  const isShiftActiveNow = (day: string, shiftHours: string): boolean => {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[now.getDay()];
    const currentHour = now.getHours();

    if (day !== currentDay) return false;

    const parts = shiftHours.split("-");
    if (parts.length !== 2) return false;
    const startHour = parseInt(parts[0].split(":")[0], 10);
    const endHour = parseInt(parts[1].split(":")[0], 10);

    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    } else {
      return currentHour >= startHour && currentHour < endHour;
    }
  };

  // Helper to check if a specific member is currently the active sober driver
  const isMemberActiveDriverNow = (email: string, phone: string): boolean => {
    // Check shifts if they match any pledge's contact info
    const activeShifts = shifts.filter(s => isShiftActiveNow(s.day, s.shiftHours));
    return activeShifts.some(s => s.member?.email === email || s.member?.phone === phone);
  };

  // Helper to find driver ID for a specific shift
  const getShiftDriverId = (day: string, shiftHours: string): string => {
    const shift = shifts.find(s => s.day === day && s.shiftHours === shiftHours);
    return shift ? shift.memberId : "";
  };

  const getShiftId = (day: string, shiftHours: string): string => {
    const shift = shifts.find(s => s.day === day && s.shiftHours === shiftHours);
    return shift ? shift.id : "";
  };

  const STANDARD_SHIFTS = [
    { day: "Thursday", hours: "22:00-00:00", label: "Thursday Night (10pm-12am)" },
    { day: "Friday", hours: "00:00-02:00", label: "Thursday Late Night (12am-2am)" },
    { day: "Friday", hours: "22:00-00:00", label: "Friday Night (10pm-12am)" },
    { day: "Saturday", hours: "00:00-02:00", label: "Friday Late Night (12am-2am)" },
    { day: "Saturday", hours: "22:00-00:00", label: "Saturday Night (10pm-12am)" },
    { day: "Sunday", hours: "00:00-02:00", label: "Saturday Late Night (12am-2am)" },
  ];

  // ── Filter + search composition ──────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rushes.filter((r) => {
      // Filter chip
      if (filter === "hot" && !isHot(r)) return false;
      if (filter === "attended2" && r.attendanceCount < 2) return false;
      if (filter === "noshow" && r.attendanceCount > 0) return false;
      if (filter === "bidsent" && r.status !== "BID_EXTENDED") return false;
      if (filter === "accepted" && r.status !== "ACCEPTED") return false;
      if (filter === "declined" && r.status !== "DECLINED") return false;
      // Search
      if (q) {
        const hay = [r.name, r.email, r.phone, r.major, r.year]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rushes, filter, query]);

  // ── Stats row (over the full pool, not the filtered slice) ───────────────
  const stats = React.useMemo(() => {
    const total = rushes.length;
    const avgAttendance = total === 0
      ? 0
      : rushes.reduce((s, r) => s + r.attendanceCount, 0) / total;
    const bids = rushes.filter((r) =>
      r.status === "BID_EXTENDED" || r.status === "ACCEPTED" || r.status === "DECLINED"
    ).length;
    const dropped = rushes.filter((r) => r.status === "DROPPED").length;
    const conversionRate = total === 0 ? 0 : (bids / total) * 100;
    const dropRate = total === 0 ? 0 : (dropped / total) * 100;
    return { total, avgAttendance, conversionRate, dropRate };
  }, [rushes]);

  // Get all accepted new members (either from Rush pipeline status=ACCEPTED or from roster status=PLEDGE)
  const acceptedNewMembers = React.useMemo(() => {
    const fromRushes = rushes
      .filter((r) => r.status === "ACCEPTED")
      .map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        major: r.major,
        year: r.year,
        hometown: r.hometown,
        headshotUrl: r.headshotUrl,
        type: "pnm",
      }));
    const fromPledges = pledges.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      major: p.major,
      year: "Freshman", // default
      hometown: p.hometown,
      headshotUrl: p.headshotUrl,
      type: "pledge",
    }));

    // Merge without duplicates by email
    const seen = new Set<string>();
    const merged = [];
    for (const m of [...fromPledges, ...fromRushes]) {
      if (m.email && seen.has(m.email.toLowerCase())) continue;
      if (m.email) seen.add(m.email.toLowerCase());
      merged.push(m);
    }
    return merged;
  }, [rushes, pledges]);

  return (
    <div className="space-y-6">
      {/* Dynamic Header Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isRushActive ? "PNM dashboard" : "New Members & Sober Driver Schedule"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRushActive 
              ? `Track every prospective new member for ${chapterName} - filter, bulk-text, and send bids.`
              : `Manage associate members and coordinate the weekly sober driver night schedules for ${chapterName}.`
            }
          </p>
        </div>
        <div>
          <Button
            variant={isRushActive ? "destructive" : "outline"}
            size="sm"
            onClick={toggleRushActive}
            disabled={updatingSettings}
            className="shadow-sm font-bold"
          >
            {updatingSettings ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : isRushActive ? (
              <XCircle className="h-4 w-4 mr-1.5" />
            ) : (
              <IconSpark className="h-4 w-4 mr-1.5" />
            )}
            {isRushActive ? "End Rush Season" : "Re-open Rush Season"}
          </Button>
        </div>
      </div>

      {isRushActive ? (
        <>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="PNMs in pipeline"
          value={stats.total.toString()}
          icon={Users}
          accent="text-phisig-red"
        />
        <StatCard
          label="Avg events / PNM"
          value={stats.avgAttendance.toFixed(1)}
          icon={CalendarCheck}
          accent="text-sky-700"
        />
        <StatCard
          label="Bid conversion"
          value={`${stats.conversionRate.toFixed(0)}%`}
          icon={TrendingUp}
          accent="text-emerald-700"
        />
        <StatCard
          label="Drop-off"
          value={`${stats.dropRate.toFixed(0)}%`}
          icon={UserX}
          accent="text-amber-700"
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PNMs"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} disabled={rushes.length === 0}>
            <MessageCircle className="h-4 w-4" /> Bulk text
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add PNM
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter PNMs">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count =
            f.id === "all"
              ? rushes.length
              : f.id === "hot"
                ? rushes.filter(isHot).length
                : f.id === "attended2"
                  ? rushes.filter((r) => r.attendanceCount >= 2).length
                  : f.id === "noshow"
                    ? rushes.filter((r) => r.attendanceCount === 0).length
                    : f.id === "bidsent"
                      ? rushes.filter((r) => r.status === "BID_EXTENDED").length
                      : f.id === "accepted"
                        ? rushes.filter((r) => r.status === "ACCEPTED").length
                        : rushes.filter((r) => r.status === "DECLINED").length;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-phisig-red text-white shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <f.icon className="h-3.5 w-3.5" /> {f.label}
              <span className={cn(
                "ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                active ? "bg-white/20" : "bg-background/70"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      <RusheeTable
        rows={filtered}
        onRowClick={(id) => router.push(`/admin/rushees/${id}`)}
      />
    </>
  ) : (
    <div className="space-y-6">
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveSubTab("directory")}
              className={cn(
                "py-2.5 px-4 text-sm font-semibold border-b-2 transition-all",
                activeSubTab === "directory"
                  ? "border-phisig-red text-phisig-red"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> New Member Roster ({acceptedNewMembers.length})
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab("schedule")}
              className={cn(
                "py-2.5 px-4 text-sm font-semibold border-b-2 transition-all",
                activeSubTab === "schedule"
                  ? "border-phisig-red text-phisig-red"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Car className="w-4 h-4" /> Sober Driving Schedule
              </span>
            </button>
          </div>

          {activeSubTab === "directory" ? (
            <div className="space-y-4">
              {acceptedNewMembers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <UserX className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-semibold">No accepted new members found.</p>
                    <p className="text-xs text-muted-foreground mt-1">Once prospective members accept bids, they will show up here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  {/* min-w keeps all 5 columns reachable on phones — the wrapper
                      scrolls horizontally instead of clipping the Status column
                      (critique council: mobile roster table, 390px). */}
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="text-left py-3 px-4">New Member</th>
                        <th className="text-left py-3 px-4">Contact Info</th>
                        <th className="text-left py-3 px-4">Year / Major</th>
                        <th className="text-left py-3 px-4">Hometown</th>
                        <th className="text-center py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acceptedNewMembers.map((m) => {
                        const onDuty = isMemberActiveDriverNow(m.email || "", m.phone || "");
                        const handleRowClick = () => {
                          if (m.type === "pnm") {
                            router.push(`/admin/rushees/${m.id}`);
                          } else if (m.type === "pledge") {
                            const target = rushes.find(
                              (r) => r.email?.toLowerCase() === m.email?.toLowerCase()
                            );
                            if (target) {
                              router.push(`/admin/rushees/${target.id}`);
                            } else {
                              push({
                                title: "Profile not found",
                                description: `No recruitment record found matching email: ${m.email}`,
                                variant: "destructive",
                              });
                            }
                          }
                        };
                        return (
                          <tr
                            key={m.id}
                            onClick={handleRowClick}
                            className="cursor-pointer border-t border-border hover:bg-secondary/40 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <Thumb headshotUrl={m.headshotUrl} name={m.name} />
                                <div>
                                  <p className="font-bold flex items-center gap-2">
                                    {m.name}
                                    {onDuty && (
                                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                                        <Key className="w-2.5 h-2.5" /> ON DUTY
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground capitalize">{m.type} Account</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="text-xs font-semibold">{m.phone}</p>
                              <p className="text-[10px] text-muted-foreground">{m.email}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="text-xs font-semibold">{m.year}</p>
                              <p className="text-[10px] text-muted-foreground">{m.major || "No major"}</p>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">{m.hometown || "-"}</td>
                            <td className="py-3.5 px-4 text-center">
                              {onDuty ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1 select-none">
                                  <Car className="w-3 h-3" /> Active Driver
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-100 border select-none">
                                  Standby
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex gap-2.5 items-start">
                  <ShieldAlert className="w-5 h-5 text-phisig-red shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Weekly Sober Driving Roster</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Assign new members/pledges to weekend shifts. Drivers on active shifts will show glowing indicators in the roster directory automatically.
                    </p>
                  </div>
                </div>
              </div>

              {loadingSchedule ? (
                <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-phisig-red" /> Fetching shifts...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STANDARD_SHIFTS.map((s, idx) => {
                    const driverId = getShiftDriverId(s.day, s.hours);
                    const shiftId = getShiftId(s.day, s.hours);
                    const isActive = isShiftActiveNow(s.day, s.hours);
                    
                    return (
                      <Card key={idx} className={cn(
                        "relative overflow-hidden transition-all",
                        isActive ? "border-emerald-500/30 bg-emerald-500/[0.02] shadow-md ring-1 ring-emerald-500/10" : "border-slate-100 hover:border-slate-200"
                      )}>
                        {isActive && (
                          <div className="absolute right-0 top-0 bg-emerald-500 text-white font-bold text-[8px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Active Now
                          </div>
                        )}
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 leading-none">{s.label}</h4>
                              <p className="text-[9px] text-muted-foreground mt-1 capitalize">{s.day} Shift</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Assign Driver</Label>
                            <div className="flex gap-2">
                              <select
                                value={driverId}
                                onChange={(e) => assignDriver(s.day, s.hours, e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-background border border-input rounded-md text-xs font-medium outline-none focus:ring-1 focus:ring-ring transition"
                              >
                                <option value="">Select a new member...</option>
                                {/* #3 — SoberDriverShift.memberId is a FK to Brother, but accepted
                                    PNMs live in the Rush table (Rush ids), so assigning one always
                                    errored. Only PLEDGE rows are real Brother rows; show accepted
                                    PNMs DISABLED with a reason so they can't be picked (no FK error)
                                    and the admin knows to make them a pledge first. */}
                                {acceptedNewMembers.map((m) => (
                                  <option key={m.id} value={m.id} disabled={m.type !== "pledge"}>
                                    {m.name} {m.type === "pledge" ? "(Pledge)" : "(Accepted PNM — make a pledge to assign)"}
                                  </option>
                                ))}
                              </select>
                              {driverId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeShift(shiftId)}
                                  className="px-2.5 border-dashed border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AddPnmDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(row) => setRushes((rs) => [row, ...rs])}
      />
      <BulkTextSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        pool={filtered}
      />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <Icon className={cn("h-4 w-4", accent)} />
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function RusheeTable({
  rows, onRowClick,
}: {
  rows: RusheeListRow[];
  onRowClick: (id: string) => void;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="text-left py-3 px-4">PNM</th>
              <th className="text-left py-3 px-4">Year / Major</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-center py-3 px-4">Events</th>
              <th className="text-center py-3 px-4">Vibe</th>
              <th className="text-left py-3 px-4">Bid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onRowClick(r.id)}
                className="cursor-pointer border-t border-border hover:bg-secondary/40 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Thumb headshotUrl={r.headshotUrl} name={r.name} />
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm">
                  <p>{r.year || <span className="text-muted-foreground">-</span>}</p>
                  <p className="text-xs text-muted-foreground">{r.major || "-"}</p>
                </td>
                <td className="py-3 px-4 text-sm tabular-nums">{r.phone}</td>
                <td className="py-3 px-4 text-center font-medium">
                  {r.attendanceCount}
                  {r.attendanceCount === 0 && (
                    <span className="ml-1 text-[10px] text-amber-700">no-show</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {r.lastImpressionTone ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={cn("h-2 w-2 rounded-full", TONE_DOT[r.lastImpressionTone])} />
                      {r.lastImpressionTone}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {statusBadge(r.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onRowClick(r.id)}
            className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-phisig-red/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Thumb headshotUrl={r.headshotUrl} name={r.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium truncate">{r.name}</p>
                  {statusBadge(r.status)}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {[r.year, r.major].filter(Boolean).join(" · ") || r.email}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck className="h-3 w-3" /> {r.attendanceCount}
                  </span>
                  {r.lastImpressionTone && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", TONE_DOT[r.lastImpressionTone])} />
                      {r.lastImpressionTone}
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-phisig-red">
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function Thumb({ headshotUrl, name }: { headshotUrl: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
  if (headshotUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc(headshotUrl, 80)}
          alt={`${name} headshot`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-phisig-red text-white text-xs font-semibold ring-1 ring-phisig-red-dark"
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

// ── Add PNM dialog ──────────────────────────────────────────────────────────
function AddPnmDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (row: RusheeListRow) => void;
}) {
  const { push } = useToast();
  const [form, setForm] = React.useState({
    name: "", email: "", phone: "",
    year: "", major: "", hometown: "",
    source: "",
  });
  const [busy, setBusy] = React.useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      push({ title: "Name, email, phone are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/rushees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to add PNM");
      }
      // Build a list row shape from the create response.
      const created = json.rush as {
        id: string; name: string; email: string; phone: string;
        year: string | null; major: string | null; hometown: string | null; headshotUrl: string | null;
        status: string; createdAt: string;
      };
      onCreated({
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        year: created.year,
        major: created.major,
        hometown: created.hometown || form.hometown || null,
        headshotUrl: created.headshotUrl,
        status: created.status,
        attendanceCount: 0,
        voteSum: 0,
        voteCount: 0,
        impressionCount: 0,
        lastImpressionTone: null,
        bidToken: null,
        bidRespondedAt: null,
        bidResponseChoice: null,
        createdAt: new Date(created.createdAt).toISOString(),
      });
      setForm({ name: "", email: "", phone: "", year: "", major: "", hometown: "", source: "" });
      onOpenChange(false);
      push({ title: "PNM added", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Add failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a PNM</DialogTitle>
          <DialogDescription>
            Add someone manually - they'll show up alongside PNMs who signed up via the public form.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="mb-1 inline-block">Name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 inline-block">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@university.edu" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Phone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="803-555-0100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 inline-block">Year</Label>
              <Input value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="Freshman" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Major</Label>
              <Input value={form.major} onChange={(e) => update("major", e.target.value)} placeholder="Finance" />
            </div>
          </div>
          <div>
            <Label className="mb-1 inline-block">Hometown</Label>
            <Input value={form.hometown} onChange={(e) => update("hometown", e.target.value)} placeholder="Charleston, SC" />
          </div>
          <div>
            <Label className="mb-1 inline-block">Source (how we met)</Label>
            <Input value={form.source} onChange={(e) => update("source", e.target.value)} placeholder="Greene St tabling / John D. referral" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add PNM
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk text sheet ─────────────────────────────────────────────────────────
function BulkTextSheet({
  open, onOpenChange, pool,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pool: RusheeListRow[];
}) {
  const { push } = useToast();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Reset selection on open so a previous filter doesn't carry over silently.
  React.useEffect(() => {
    if (open) {
      setSelected(new Set());
      setBody("");
    }
  }, [open]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(pool.map((p) => p.id)));
  }

  async function send() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      push({ title: "Pick at least one PNM", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      push({ title: "Write a message first", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rushIds: ids, body: body.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Send failed");
      push({
        title: `Sent ${json.sent ?? ids.length}`,
        description: json.mode === "mock" ? "Twilio not configured - logged only." : undefined,
        variant: "success",
      });
      onOpenChange(false);
    } catch (err: any) {
      push({ title: err.message || "Send failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const count = selected.size;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk text PNMs</DialogTitle>
          <DialogDescription>
            Pick recipients and write a short message - we'll personalize with their first name.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="mb-1 inline-block">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hey - heads up, brotherhood event tonight at 8 at the house. Hope to see you there."
              rows={3}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              We'll prefix with "Hey {`{first name}`} - " automatically.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium">{count}</span> selected of {pool.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select all</Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background">
            {pool.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No PNMs to text in the current view.</p>
            ) : (
              <ul className="divide-y divide-border">
                {pool.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                    <Thumb headshotUrl={p.headshotUrl} name={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.phone}</p>
                    </div>
                    {statusBadge(p.status)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={busy || count === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to {count || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
