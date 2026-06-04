import * as React from "react";
import {
  IllustrationBase,
  ILLUSTRATION_ACCENT,
  ACCENT_OPACITY,
  ACCENT_OPACITY_STRONG,
  type IllustrationProps,
} from "./illustration-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ILLUSTRATION — Celebrate / success & onboarding finish
 * ────────────────────────────────────────────────────────────────────────────
 * A laurel-wreathed checkmark medallion on a starburst, framed by a soft
 * confetti scatter — the "it worked! your site is live" moment. Built for the
 * onboarding success screen and any other delightful confirmation. The confetti
 * is static (it's the SHAPE that conveys celebration), so it's fully
 * reduced-motion-safe; a caller may add an opacity/transform reveal around it.
 *
 * Duotone + themeable per the shared language: currentColor linework + a
 * currentColor accent fill softened via fillOpacity. The medallion uses the
 * strong accent so it reads as the hero even against a dark success panel (set
 * `currentColor` to a light tone there and the linework stays crisp).
 */
export function IllustrationCelebrate({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
  return (
    <IllustrationBase {...props}>
      {/* starburst behind the medallion (energy) */}
      <g strokeOpacity={0.45}>
        <path d="M80 12v12M80 116v12M16 70h12M132 70h12M35 25l8 8M125 25l-8 8M35 115l8-8M125 115l-8-8" />
      </g>

      {/* confetti scatter (static shapes = celebration, motion-free) */}
      <g stroke="none">
        <rect x="30" y="44" width="7" height="7" rx="1.5" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} transform="rotate(18 33 47)" />
        <rect x="120" y="38" width="6" height="6" rx="1.5" fill={accent} fillOpacity={ACCENT_OPACITY} transform="rotate(-22 123 41)" />
        <circle cx="44" cy="92" r="3.4" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} />
        <circle cx="118" cy="96" r="3" fill={accent} fillOpacity={ACCENT_OPACITY} />
        <rect x="104" y="20" width="5.5" height="5.5" rx="1.4" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} transform="rotate(30 107 23)" />
        <circle cx="26" cy="66" r="2.6" fill={accent} fillOpacity={ACCENT_OPACITY} />
        <circle cx="134" cy="64" r="2.6" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} />
      </g>

      {/* medallion disc */}
      <circle cx="80" cy="70" r="32" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <circle cx="80" cy="70" r="32" />
      <circle cx="80" cy="70" r="25" strokeOpacity={0.4} />

      {/* the success check */}
      <path d="M68 70l8 8 16-17" strokeWidth={3} />

      {/* laurel sprigs hugging the medallion (the Greek motif) */}
      <path d="M50 88c-7-6-9-15-7-24" strokeOpacity={0.8} />
      <path d="M44 70.5c2.5 0.5 4.5-0.3 6-2M45 77c2.6 0.4 4.7-0.5 6.2-2.3M48 83c2.6 0.2 4.6-0.8 6-2.6" strokeOpacity={0.7} />
      <path d="M110 88c7-6 9-15 7-24" strokeOpacity={0.8} />
      <path d="M116 70.5c-2.5 0.5-4.5-0.3-6-2M115 77c-2.6 0.4-4.7-0.5-6.2-2.3M112 83c-2.6 0.2-4.6-0.8-6-2.6" strokeOpacity={0.7} />
    </IllustrationBase>
  );
}
