import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Member & Alumni DASHBOARD set
 * ────────────────────────────────────────────────────────────────────────────
 * The primary tab-nav + quick-action glyphs for the logged-in brothers and
 * alumni portals. These were the last high-visibility surfaces still drawing
 * generic lucide-react icons in the tab rail (the brand-defining navigation),
 * which broke the made-for-Greek-life feel exactly where members live every day.
 *
 * Each obeys the shared design language of ./icon-base.tsx:
 *   • 24×24 grid, ~1.75px primary line in `currentColor`, round caps/joins.
 *   • a soft brand-accent layer (var(--gs-accent, #38bdf8)) at low opacity
 *     behind the primary line — the two-tone read that makes the set premium.
 *   • a quiet Greek motif (laurel, column, ballot, key) woven in where it
 *     stays legible at 16–24px.
 *
 * Drop-in for the lucide call-sites: same `className` sizing, `currentColor`
 * inheritance, `aria-hidden` by default. Re-exported through ./index.ts.
 */

/** Activity — a pulse/heartbeat line over a soft tile (overview / dashboard feed). */
export function IconActivity({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: panel */}
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      {/* pulse line */}
      <path d="M5.5 12h2.2l1.7-4 2.6 8 1.8-5 1.2 1h3.5" />
    </IconBase>
  );
}

/** ServiceHours — a laurel wreath cradling a clock (service hours earned). */
export function IconServiceHours({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: clock face */}
      <circle cx="12" cy="12" r="5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="12" r="5" />
      {/* hands */}
      <path d="M12 9.3V12l1.9 1.1" />
      {/* laurel sprigs hugging the clock */}
      <path d="M5.2 6.5c-1.8 2.2-1.8 6.8 1 9.6" stroke={accent} opacity={0.55} />
      <path d="M18.8 6.5c1.8 2.2 1.8 6.8-1 9.6" stroke={accent} opacity={0.55} />
    </IconBase>
  );
}

/** Polls — a ballot/clipboard with a ranked-choice fill (chapter polls & voting). */
export function IconPolls({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: sheet */}
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.2" />
      {/* clip */}
      <path d="M9 3.5V5a1.2 1.2 0 0 0 1.2 1.2h3.6A1.2 1.2 0 0 0 15 5V3.5" />
      {/* poll bars (the longest is the leading option, accent-filled) */}
      <path d="M8 11h8" stroke={accent} opacity={0.5} strokeWidth={2.4} />
      <path d="M8 11h8" />
      <path d="M8 14.5h5.5" />
      <path d="M8 8h3" />
    </IconBase>
  );
}

/** Profile — a single member portrait in a soft frame (my profile / account). */
export function IconProfile({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: halo behind the head */}
      <circle cx="12" cy="9" r="3.6" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="9" r="3.6" />
      {/* shoulders */}
      <path d="M5.5 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1" />
    </IconBase>
  );
}

/** Elections — a ballot dropping into a box marked with a check (officer elections). */
export function IconElections({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: ballot box body */}
      <path d="M3.5 12.5h17V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19v-6.5Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M3.5 12.5h17V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19v-6.5Z" />
      {/* slot */}
      <path d="M9 12.5v-1.2h6v1.2" />
      {/* the ballot with a check, sliding in */}
      <path d="M8.5 3.5h7v6h-7z" fill={accent} opacity={0.14} />
      <path d="M8.5 3.5h7v6h-7z" />
      <path d="M10 6.4l1.4 1.4 2.4-2.6" />
    </IconBase>
  );
}

/** Map — a folded map pin marking the chapter / alumni location ("near me"). */
export function IconMap({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: teardrop */}
      <path d="M12 21c4-4.2 6-7.4 6-10.2A6 6 0 0 0 6 10.8C6 13.6 8 16.8 12 21Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12 21c4-4.2 6-7.4 6-10.2A6 6 0 0 0 6 10.8C6 13.6 8 16.8 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </IconBase>
  );
}

/** Graduation — a mortarboard with a tassel (alumni / graduated brothers). */
export function IconGraduation({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: cap top */}
      <path d="M12 4l9 4-9 4-9-4 9-4Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M12 4l9 4-9 4-9-4 9-4Z" />
      {/* head band / chin */}
      <path d="M6.5 10v4.2c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8V10" />
      {/* tassel */}
      <path d="M21 8v4" />
      <circle cx="21" cy="12.6" r="0.9" fill={accent} stroke="none" />
    </IconBase>
  );
}

/** Giving — an open hand lifting a heart (alumni donations / engagement). */
export function IconGiving({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: heart */}
      <path
        d="M12 7.2l-.8-.8a2 2 0 0 0-2.8 2.8L12 12.6l3.6-3.4a2 2 0 0 0-2.8-2.8l-.8.8Z"
        fill={accent}
        opacity={0.2}
        stroke="none"
      />
      <path d="M12 7.2l-.8-.8a2 2 0 0 0-2.8 2.8L12 12.6l3.6-3.4a2 2 0 0 0-2.8-2.8l-.8.8Z" />
      {/* cupped hand */}
      <path d="M4 15.5l3.2 3a3 3 0 0 0 2 .8H17a2.5 2.5 0 0 0 0-5h-3" />
      <path d="M4 15.5l-1.5 1.5" />
    </IconBase>
  );
}

/** Settings — a cog with a Greek-key tooth rhythm (admin console shortcuts). */
export function IconSettings({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" />
    </IconBase>
  );
}

/** AddMember — a member portrait with an accent plus (invite / add brother). */
export function IconAddMember({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9.5" cy="8" r="3.2" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="9.5" cy="8" r="3.2" />
      <path d="M3.5 19v-1a4.5 4.5 0 0 1 4.5-4.5h3" />
      {/* plus */}
      <path d="M17.5 13.5v5M15 16h5" stroke={accent} opacity={0.5} strokeWidth={2.6} />
      <path d="M17.5 13.5v5M15 16h5" />
    </IconBase>
  );
}
