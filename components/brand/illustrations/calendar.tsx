import * as React from "react";
import {
  IllustrationBase,
  IllustrationGround,
  ILLUSTRATION_ACCENT,
  ACCENT_OPACITY,
  ACCENT_OPACITY_STRONG,
  type IllustrationProps,
} from "./illustration-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ILLUSTRATION — Calendar / no events
 * ────────────────────────────────────────────────────────────────────────────
 * A calendar leaf with a soft brand header band, a grid of date cells, one cell
 * pinned/highlighted, and a small location pin floating above — the "no events
 * scheduled yet, here's where they'll live" scene.
 *
 * Duotone + themeable per the shared language: currentColor linework + a
 * currentColor accent fill softened via fillOpacity, aria-hidden, no motion.
 */
export function IllustrationCalendar({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
  return (
    <IllustrationBase {...props}>
      <IllustrationGround accent={accent} />

      {/* calendar body */}
      <rect x="38" y="36" width="84" height="74" rx="10" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <rect x="38" y="36" width="84" height="74" rx="10" />
      {/* header band + binding rings */}
      <path d="M38 50a10 10 0 0 1 10-10h64a10 10 0 0 1 10 10v4H38v-4Z" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <path d="M38 54h84" />
      <path d="M54 32v10M80 32v10M106 32v10" />

      {/* date grid */}
      <g strokeOpacity={0.45}>
        <path d="M52 66h56M52 80h56M52 94h56" />
        <path d="M70 60v40M90 60v40" />
      </g>

      {/* the pinned/highlighted event cell */}
      <rect x="71" y="81" width="18" height="12" rx="3" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <rect x="71" y="81" width="18" height="12" rx="3" />

      {/* floating location pin (the upcoming event) */}
      <path d="M112 30c0-5 4-9 9-9s9 4 9 9c0 6-9 14-9 14s-9-8-9-14Z" fill="hsl(var(--background))" />
      <path d="M112 30c0-5 4-9 9-9s9 4 9 9c0 6-9 14-9 14s-9-8-9-14Z" />
      <circle cx="121" cy="30" r="3.2" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <circle cx="121" cy="30" r="3.2" />
    </IllustrationBase>
  );
}
