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
 * GREEKSTACK ILLUSTRATION — Welcome / generic friendly default
 * ────────────────────────────────────────────────────────────────────────────
 * A classical chapter-house facade — pediment, three columns, a draped banner —
 * the warm, on-brand DEFAULT for any empty surface that doesn't have a more
 * specific scene. This is what the shared EmptyState/PortalEmpty primitives fall
 * back to, so every blank tab gets a finished feel even before a bespoke
 * illustration is chosen.
 *
 * Duotone + themeable per the shared language: currentColor linework + a
 * currentColor accent fill softened via fillOpacity, aria-hidden, no motion.
 */
export function IllustrationWelcome({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
  return (
    <IllustrationBase {...props}>
      <IllustrationGround accent={accent} />

      {/* pediment (the temple roof) */}
      <path d="M80 22l44 24H36l44-24Z" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <path d="M80 22l44 24H36l44-24Z" />
      {/* tympanum accent star */}
      <path
        d="M80 33l2.4 5 5.4 0.5-4 3.6 1.2 5.3-4.9-2.9-4.9 2.9 1.2-5.3-4-3.6 5.4-0.5L80 33Z"
        fill={accent}
        fillOpacity={ACCENT_OPACITY_STRONG}
        stroke="none"
      />

      {/* entablature */}
      <path d="M40 50h80" />

      {/* columns */}
      <g>
        <rect x="48" y="54" width="11" height="48" rx="2" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
        <rect x="48" y="54" width="11" height="48" rx="2" />
        <path d="M50 58v40M53.5 58v40M57 58v40" strokeOpacity={0.35} />

        <rect x="74" y="54" width="11" height="48" rx="2" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
        <rect x="74" y="54" width="11" height="48" rx="2" />
        <path d="M76 58v40M79.5 58v40M83 58v40" strokeOpacity={0.35} />

        <rect x="100" y="54" width="11" height="48" rx="2" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
        <rect x="100" y="54" width="11" height="48" rx="2" />
        <path d="M102 58v40M105.5 58v40M109 58v40" strokeOpacity={0.35} />
      </g>

      {/* base step */}
      <path d="M40 102h80" />
      <path d="M44 108h72" strokeOpacity={0.5} />

      {/* a small draped "welcome" banner across the columns */}
      <path d="M64 70h32l-4 16-12-5-12 5 -4-16Z" fill="hsl(var(--background))" />
      <path d="M64 70h32l-4 16-12-5-12 5 -4-16Z" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <path d="M64 70h32l-4 16-12-5-12 5 -4-16Z" />
      <path d="M74 78h12" strokeOpacity={0.7} />
    </IllustrationBase>
  );
}
