"use client";

import * as React from "react";
import { IconCalendar as Calendar, IconClock as Clock } from "@/components/brand/icons";

/**
 * Live ticking countdown to the next public rush event.
 *
 * Receives the ISO datetime string of the next event from a server component
 * (so the SSR HTML carries an initial chip even if JS never runs). Updates
 * every second client-side. When the timestamp passes, the component renders
 * a live "Happening now" chip until the event end (or 4h after start if no
 * end was provided).
 *
 * If no event is scheduled (`startsAt === null`), renders a quiet "Schedule
 * drops in August" placeholder — never the bare "Loading…" empty state.
 */
export function RushCountdown({
  startsAt,
  endsAt,
  eventName,
  eventLocation,
}: {
  startsAt: string | null;
  endsAt: string | null;
  eventName: string | null;
  eventLocation: string | null;
}) {
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    if (!startsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startsAt]);

  if (!startsAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/20 bg-white/95 backdrop-blur px-3 py-1 text-xs font-medium text-phisig-red shadow-sm">
        <Calendar className="h-3 w-3" /> Fall &apos;26 schedule drops in August
      </span>
    );
  }

  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 4 * 60 * 60 * 1000;
  const diffToStart = start - now;
  const diffToEnd = end - now;
  const isLive = diffToStart <= 0 && diffToEnd > 0;
  const isPast = diffToEnd <= 0;

  if (isPast) {
    // Schedule rolled past the last event we know about — server should send
    // a fresh next event on the next render. Show a quiet placeholder.
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/20 bg-white/95 backdrop-blur px-3 py-1 text-xs font-medium text-phisig-red shadow-sm">
        <Calendar className="h-3 w-3" /> More rush events coming
      </span>
    );
  }

  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red bg-phisig-red px-3 py-1 text-xs font-semibold text-white shadow-md shadow-phisig-red/30">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        Happening now: {eventName}
        {eventLocation && <span className="opacity-90 font-normal hidden sm:inline">· {eventLocation}</span>}
      </span>
    );
  }

  // Pre-event countdown.
  const totalSec = Math.floor(diffToStart / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  // Compact display for >24h, full for <24h.
  const compact = days >= 1
    ? `${days}d ${hours}h ${minutes}m`
    : `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/30 bg-white/95 backdrop-blur px-3 py-1 text-xs font-semibold text-phisig-red shadow-sm">
      <Clock className="h-3 w-3" />
      <span className="hidden sm:inline">Next event:</span>
      <span className="font-semibold">{eventName || "Rush"}</span>
      <span className="opacity-70 font-normal">in</span>
      <span className="tabular-nums">{compact}</span>
    </span>
  );
}
