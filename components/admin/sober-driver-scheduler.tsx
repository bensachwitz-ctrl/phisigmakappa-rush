"use client";

// SoberDriverScheduler — the "select + log sober driver" surface for the Risk
// Manager (owner spec: "Risk Mgmt = select + log sober driver").
//
// This is the risk-officer home for sober-driver scheduling. The SAME UI also
// lives on the rush-chair's /admin/rushees page (New Members & Sober Driver
// Schedule sub-tab), but that page is gated on the rushPipeline domain, so a
// Risk Manager who holds risk:write (not rushPipeline) could not reach it. This
// component is rendered at /admin/risk/sober-drivers, gated on the risk domain,
// so a Risk Manager can select + log drivers. It talks to the same
// /api/admin/sober-schedule endpoint (now gated on risk:read / risk:write).
//
// Assignable drivers are the chapter's PLEDGE-status members (the endpoint's
// `pledges`), which are real Brother rows (SoberDriverShift.memberId is a FK to
// Brother) — so an assignment never hits a foreign-key error.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  IconCar as Car,
  IconClock as Clock,
  IconRiskDesk as ShieldAlert,
  IconSpinner as Loader2,
} from "@/components/brand/icons";

type ShiftMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
} | null;

type Shift = {
  id: string;
  day: string;
  shiftHours: string;
  memberId: string;
  member: ShiftMember;
};

type Pledge = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

// The fixed weekend shift grid (mirrors the /admin/rushees sober sub-tab so the
// two surfaces schedule the SAME slots).
const STANDARD_SHIFTS = [
  { day: "Thursday", hours: "22:00-00:00", label: "Thursday Night (10pm-12am)" },
  { day: "Friday", hours: "00:00-02:00", label: "Thursday Late Night (12am-2am)" },
  { day: "Friday", hours: "22:00-00:00", label: "Friday Night (10pm-12am)" },
  { day: "Saturday", hours: "00:00-02:00", label: "Friday Late Night (12am-2am)" },
  { day: "Saturday", hours: "22:00-00:00", label: "Saturday Night (10pm-12am)" },
  { day: "Sunday", hours: "00:00-02:00", label: "Saturday Late Night (12am-2am)" },
] as const;

/** True when a shift is active "right now" in the viewer's browser timezone. */
function isShiftActiveNow(day: string, shiftHours: string): boolean {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (day !== days[now.getDay()]) return false;
  const parts = shiftHours.split("-");
  if (parts.length !== 2) return false;
  const startHour = parseInt(parts[0].split(":")[0], 10);
  const endHour = parseInt(parts[1].split(":")[0], 10);
  const cur = now.getHours();
  return startHour > endHour ? cur >= startHour || cur < endHour : cur >= startHour && cur < endHour;
}

export function SoberDriverScheduler({ canWrite }: { canWrite: boolean }) {
  const { push } = useToast();
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [pledges, setPledges] = React.useState<Pledge[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchSchedule = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sober-schedule");
      const data = await res.json();
      if (data.ok) {
        setShifts(data.shifts || []);
        setPledges(data.pledges || []);
      } else {
        throw new Error(data.error || "Failed to load schedule");
      }
    } catch (err: any) {
      push({ title: err.message || "Failed to load schedule", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [push]);

  React.useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const getShiftDriverId = (day: string, hours: string) =>
    shifts.find((s) => s.day === day && s.shiftHours === hours)?.memberId ?? "";
  const getShiftId = (day: string, hours: string) =>
    shifts.find((s) => s.day === day && s.shiftHours === hours)?.id ?? "";

  const assignDriver = async (day: string, shiftHours: string, memberId: string) => {
    // The first <option> is a placeholder; re-selecting it yields an empty id —
    // don't POST an empty assignment (use Clear to remove a driver).
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
    if (!shiftId) return;
    try {
      const res = await fetch(`/api/admin/sober-schedule?id=${shiftId}`, { method: "DELETE" });
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sober Driver Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select and log the weekly sober driver for each weekend shift. Drivers on an active
            shift glow in the roster automatically.
          </p>
        </div>
        {!canWrite && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only Mode
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 p-4 bg-secondary/40 border border-border rounded-2xl">
        <ShieldAlert className="w-5 h-5 text-phisig-red shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Assign a pledge/new member to each weekend shift. Only PLEDGE-status members can be a sober
          driver; add someone to the roster as a pledge first if they aren't listed.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-phisig-red" /> Fetching shifts…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STANDARD_SHIFTS.map((s, idx) => {
            const driverId = getShiftDriverId(s.day, s.hours);
            const shiftId = getShiftId(s.day, s.hours);
            const isActive = isShiftActiveNow(s.day, s.hours);

            return (
              <Card
                key={idx}
                className={cn(
                  "relative overflow-hidden transition-all",
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/[0.02] shadow-md ring-1 ring-emerald-500/10"
                    : "border-border hover:border-border/60",
                )}
              >
                {isActive && (
                  <div className="absolute right-0 top-0 bg-emerald-500 text-white font-bold text-[8px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Active Now
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <h4 className="text-xs font-bold leading-none">{s.label}</h4>
                      <p className="text-[9px] text-muted-foreground mt-1 capitalize">{s.day} Shift</p>
                    </div>
                    {driverId && (
                      <Badge className="ml-auto bg-emerald-50 text-emerald-800 border border-emerald-100 select-none">
                        <Car className="w-3 h-3 mr-1" /> Assigned
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Assign Driver
                    </Label>
                    <div className="flex gap-2">
                      <select
                        value={driverId}
                        disabled={!canWrite}
                        onChange={(e) => assignDriver(s.day, s.hours, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-background border border-input rounded-md text-xs font-medium outline-none focus:ring-1 focus:ring-ring transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">Select a new member…</option>
                        {pledges.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      {canWrite && driverId && (
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
  );
}
