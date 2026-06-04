import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICON — Member Directory / Roster
 * ────────────────────────────────────────────────────────────────────────────
 * A bespoke duotone glyph for the chapter Member Directory ("composite") tool.
 * Reads as an ID / membership card: an accent-filled card frame, a portrait
 * avatar (head + shoulders) on the left, and three roster lines on the right
 * suggesting a list of members. A faint accent header band ties it to the
 * IconEvents/IconDashboard family so the set stays cohesive.
 *
 * Obeys the shared icon language (see ./icon-base.tsx): 24×24 grid, currentColor
 * primary line, soft `--gs-accent` secondary layer, round caps/joins, server-safe.
 *
 *   import { IconDirectory } from "@/components/brand/icons/directory";
 *   <IconDirectory className="h-6 w-6 text-[var(--gs-blue)]" />
 */
export function IconDirectory({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the card body fill */}
      <rect x="3" y="5" width="18" height="14" rx="2.5" fill={accent} opacity={0.16} stroke="none" />
      {/* accent: header band (membership-card chrome) */}
      <path d="M3 7.5a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7.5V8H3v-.5Z" fill={accent} opacity={0.28} stroke="none" />
      {/* card frame */}
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      {/* portrait avatar — head */}
      <circle cx="8.5" cy="11" r="1.9" />
      {/* portrait avatar — shoulders */}
      <path d="M5.4 16.2a3.2 3.2 0 0 1 6.2 0" />
      {/* roster lines (the directory list) — the middle line carries the accent */}
      <path d="M14 10.5h4.2" />
      <path d="M14 13h4.2" stroke={accent} opacity={0.55} />
      <path d="M14 15.5h2.8" />
    </IconBase>
  );
}
