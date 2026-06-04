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
 * GREEKSTACK ILLUSTRATION — Search / no results
 * ────────────────────────────────────────────────────────────────────────────
 * A large magnifier over a short list whose rows have come up empty, with a soft
 * brand-accent lens — the "no results, try clearing your filters" scene. Used
 * when a directory/alumni/search filter returns nothing (distinct from a truly
 * empty surface, which uses IllustrationRoster/Inbox/etc.).
 *
 * Duotone + themeable per the shared language: currentColor linework + a
 * currentColor accent fill softened via fillOpacity, aria-hidden, no motion.
 */
export function IllustrationSearch({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
  return (
    <IllustrationBase {...props}>
      <IllustrationGround accent={accent} />

      {/* the list being searched, faded (no matches) */}
      <g strokeOpacity={0.35}>
        <rect x="30" y="40" width="58" height="58" rx="9" fill={accent} fillOpacity={ACCENT_OPACITY * 0.6} stroke="none" />
        <rect x="30" y="40" width="58" height="58" rx="9" />
        <path d="M40 56h38M40 68h38M40 80h24" />
      </g>

      {/* magnifier — lens */}
      <circle cx="92" cy="60" r="26" fill="hsl(var(--background))" />
      <circle cx="92" cy="60" r="26" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <circle cx="92" cy="60" r="26" />
      {/* lens glare + an empty "no result" dash inside */}
      <path d="M80 52a14 14 0 0 1 9-7" strokeOpacity={0.5} />
      <path d="M84 60h16" strokeOpacity={0.8} />

      {/* handle */}
      <path d="M111 79l16 16" />
      <path d="M109 81l4-4 14 14a2.8 2.8 0 0 1-4 4l-14-14Z" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <path d="M109 81l4-4 14 14a2.8 2.8 0 0 1-4 4l-14-14Z" />
    </IllustrationBase>
  );
}
