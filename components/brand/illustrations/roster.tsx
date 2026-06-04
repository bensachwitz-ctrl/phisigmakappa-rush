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
 * GREEKSTACK ILLUSTRATION — Roster / empty members
 * ────────────────────────────────────────────────────────────────────────────
 * A small stack of member ID cards fanned behind a focal card with a portrait
 * avatar and roster lines — the "your chapter directory is waiting for its first
 * members" scene. The focal card carries a soft brand-accent fill so it reads as
 * the hero; the fanned cards behind suggest a growing roster, and a small plus
 * badge hints the next step (add a member).
 *
 * Duotone + themeable per the shared language (see ./illustration-base.tsx):
 * currentColor linework + a currentColor accent fill softened via fillOpacity,
 * so the whole scene re-themes with the surrounding text colour. aria-hidden, no motion.
 */
export function IllustrationRoster({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
  return (
    <IllustrationBase {...props}>
      <IllustrationGround accent={accent} />

      {/* fanned cards behind (the growing roster) */}
      <g strokeOpacity={0.5}>
        <rect x="40" y="40" width="80" height="58" rx="9" transform="rotate(-7 80 69)" />
        <rect x="42" y="38" width="80" height="58" rx="9" transform="rotate(6 82 67)" />
      </g>

      {/* focal member card */}
      <rect x="44" y="42" width="72" height="58" rx="9" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <rect x="44" y="42" width="72" height="58" rx="9" />
      {/* card header band (membership-card chrome) */}
      <path d="M44 51a9 9 0 0 1 9-9h54a9 9 0 0 1 9 9v1H44v-1Z" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />

      {/* portrait avatar */}
      <circle cx="62" cy="68" r="7" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <circle cx="62" cy="66.5" r="4" />
      <path d="M55.5 76a6.6 6.6 0 0 1 13 0" />

      {/* roster lines */}
      <path d="M80 64h26" />
      <path d="M80 71h26" strokeOpacity={0.55} />
      <path d="M80 78h17" strokeOpacity={0.35} />

      {/* a small "add member" plus, top-right, hinting the next step */}
      <circle cx="118" cy="44" r="11" fill="hsl(var(--background))" />
      <circle cx="118" cy="44" r="11" />
      <path d="M118 39.5v9M113.5 44h9" />
    </IllustrationBase>
  );
}
