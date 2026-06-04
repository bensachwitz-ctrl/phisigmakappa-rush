import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Marketing landing extras (pricing tiers, picker, sales)
 * ────────────────────────────────────────────────────────────────────────────
 * Bespoke duotone glyphs drawn for the apex marketing storefront so EVERY symbol
 * on the page is custom (no lucide). They obey the same design language as
 * ./icon-base.tsx + ./features.tsx:
 *   • 24×24 grid, ~1.75px primary line in `currentColor`, round caps/joins.
 *   • a soft brand-accent layer (var(--gs-accent, #38bdf8)) at low opacity behind
 *     the primary line — the two-tone read that makes the set feel premium.
 *   • a quiet Greek motif (pediment, column, keystone, key-step) woven in where
 *     it stays legible at 16–24px.
 *
 * Imported DIRECTLY by components/site/marketing-landing.tsx (NOT re-exported
 * through ./index.ts), per the build brief.
 */

/* ── Pricing method 1 — "Base platform" ──────────────────────────────────────
   A Greek temple stacked on a platform base: pediment + columns crowned over a
   layered plinth. Reads as "the whole platform, one flat price". */
export function IconPlanBase({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: pediment fill */}
      <path d="M12 3l8 3.6H4L12 3Z" fill={accent} opacity={0.18} stroke="none" />
      {/* pediment (roof) + keystone notch */}
      <path d="M12 3l8 3.6H4L12 3Z" />
      <path d="M11.2 5.1h1.6" />
      {/* three columns */}
      <path d="M7 8.4v7.2M12 8.4v7.2M17 8.4v7.2" />
      {/* entablature */}
      <path d="M5 8.4h14" />
      {/* stacked platform base (two tiers = the "stack") */}
      <rect x="4.5" y="16" width="15" height="2.4" rx="1" fill={accent} opacity={0.16} stroke="none" />
      <path d="M4.5 16h15M3.5 19.2h17" />
    </IconBase>
  );
}

/* ── Pricing method 2 — "Dues-share" ─────────────────────────────────────────
   A percentage mark whose two dots are coins, with a small upward share-arrow —
   "pay as your chapter pays, a small % of dues". */
export function IconPlanDuesShare({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the slash sweep */}
      <path d="M17 5L7 19" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      {/* percent slash */}
      <path d="M17 5L7 19" />
      {/* upper coin */}
      <circle cx="7.5" cy="7.5" r="2.6" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="7.5" cy="7.5" r="2.6" />
      {/* lower coin */}
      <circle cx="16.5" cy="16.5" r="2.6" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="16.5" cy="16.5" r="2.6" />
    </IconBase>
  );
}

/* ── Pricing method 3 — "Custom build" ───────────────────────────────────────
   A blueprint of a temple under a drafting compass — "a system designed for
   your chapter". The pediment keeps the Greek thread; the compass says bespoke. */
export function IconPlanCustom({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: blueprint sheet */}
      <rect x="3" y="6" width="13" height="14" rx="2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3" y="6" width="13" height="14" rx="2" />
      {/* drafted pediment + column lines on the sheet */}
      <path d="M6 12l3.5-2.5L13 12" />
      <path d="M6.5 15h6M6.5 17.5h4" />
      {/* drafting compass legs meeting at a gold-accent pivot, opening over the sheet */}
      <path d="M18 4.5l-2.4 6M18 4.5l2.4 6" />
      <circle cx="18" cy="4.5" r="1.1" fill={accent} opacity={0.5} stroke="currentColor" />
    </IconBase>
  );
}

/* ── School / chapter picker ─────────────────────────────────────────────────
   A graduation cap over a small color swatch — "pick your school + letters and
   the whole site themes to your colors instantly". */
export function IconSchoolPicker({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: mortarboard */}
      <path d="M12 4l9 4-9 4-9-4 9-4Z" fill={accent} opacity={0.18} stroke="none" />
      {/* mortarboard */}
      <path d="M12 4l9 4-9 4-9-4 9-4Z" />
      {/* head strap + tassel */}
      <path d="M6.5 9.6v3.2c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7V9.6" />
      <path d="M21 8v3.5" />
      {/* color swatch chip below (the instant theme) */}
      <rect x="9.4" y="17.4" width="5.2" height="3.4" rx="1" fill={accent} opacity={0.4} stroke="currentColor" />
    </IconBase>
  );
}

/* ── Book a call ─────────────────────────────────────────────────────────────
   A handset paired with a small clock — "grab a 15-minute call". */
export function IconBookCall({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: handset body */}
      <path
        d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
      {/* small clock dial in the open corner */}
      <circle cx="18" cy="6" r="3" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="18" cy="6" r="3" />
      <path d="M18 4.6V6l1 0.7" />
    </IconBase>
  );
}

/* ── Talk to sales ───────────────────────────────────────────────────────────
   A support headset over a chat dot — "talk to a real person (the owner)". */
export function IconTalkToSales({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: headband arc */}
      <path d="M5 13v-1a7 7 0 0 1 14 0v1" fill={accent} opacity={0.14} stroke="none" />
      <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
      {/* ear cups */}
      <rect x="3.5" y="12.5" width="3" height="5.5" rx="1.4" fill={accent} opacity={0.18} stroke="currentColor" />
      <rect x="17.5" y="12.5" width="3" height="5.5" rx="1.4" fill={accent} opacity={0.18} stroke="currentColor" />
      {/* mic boom curving to a chat dot */}
      <path d="M19 18v1.5a2 2 0 0 1-2 2h-3" />
      <circle cx="12.5" cy="21.5" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/* ── Sparkle-free "free month" gift tag ──────────────────────────────────────
   A price/gift tag with a keyhole punch + Greek-key accent — "first month free".
   Used on the recommended pricing card's ribbon. */
export function IconFreeTag({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: tag body */}
      <path
        d="M4 4h7.2a2 2 0 0 1 1.4.6l6.8 6.8a2 2 0 0 1 0 2.8l-4.2 4.2a2 2 0 0 1-2.8 0L5.6 11.6A2 2 0 0 1 5 10.2V4Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      <path d="M4 4h7.2a2 2 0 0 1 1.4.6l6.8 6.8a2 2 0 0 1 0 2.8l-4.2 4.2a2 2 0 0 1-2.8 0L5.6 11.6A2 2 0 0 1 5 10.2V4Z" />
      {/* punch hole */}
      <circle cx="8.5" cy="8.5" r="1.4" />
    </IconBase>
  );
}

/* ── Infinity / unlimited ────────────────────────────────────────────────────
   A clean lemniscate for "unlimited members & officers — never per-seat". */
export function IconUnlimited({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M8 12c0-2 1.4-3.5 3.2-3.5S14 10 16 12s2.8 3.5 4 3.5S22 14 22 12s-1.4-3.5-2.8-3.5S16.8 10 15 12s-3 3.5-4.8 3.5S6.5 14 6.5 12 5.1 8.5 3.7 8.5"
        stroke={accent}
        opacity={0.3}
        strokeWidth={3.5}
      />
      <path d="M8.5 12c0-1.8 1.3-3.2 3-3.2S14 10 15.5 12s2.6 3.2 3.7 3.2S22 13.8 22 12s-1.3-3.2-2.8-3.2S15.5 10 14 12s-2.7 3.2-4.5 3.2S6 13.8 6 12s-1.2-3.2-2.6-3.2" />
    </IconBase>
  );
}

/* ── Stripe / payments ───────────────────────────────────────────────────────
   A coin stack flowing along an arrow — "Stripe Connect treasurer payouts". */
export function IconPayout({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: coin */}
      <ellipse cx="8" cy="7" rx="4.5" ry="2.2" fill={accent} opacity={0.18} stroke="none" />
      <ellipse cx="8" cy="7" rx="4.5" ry="2.2" />
      <path d="M3.5 7v4c0 1.2 2 2.2 4.5 2.2S12.5 12.2 12.5 11V7" />
      <path d="M3.5 11v0" />
      {/* payout arrow to the account */}
      <path d="M13 14h6m0 0l-2.5-2.5M19 14l-2.5 2.5" />
    </IconBase>
  );
}
