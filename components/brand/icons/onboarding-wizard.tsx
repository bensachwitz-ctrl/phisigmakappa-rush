import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Onboarding wizard chrome (school · org · preview · pricing)
 * ────────────────────────────────────────────────────────────────────────────
 * NEW bespoke duotone glyphs added for the signup-wizard upgrade (school picker,
 * org crest, editable live preview, and the pricing-method step). They obey the
 * exact same design language as the rest of the set (see ./icon-base.tsx): 24×24
 * grid, `currentColor` primary line, low-opacity `var(--gs-accent)` secondary
 * layer, round caps/joins, ~1.75px stroke, a quiet Greek motif where it reads.
 *
 * INTENTIONALLY NOT re-exported from ./index.ts — these are imported DIRECTLY by
 * the wizard so the public barrel stays a stable, curated surface:
 *
 *   import { IconSchool, IconCrest } from "@/components/brand/icons/onboarding-wizard";
 *
 * Every symbol here replaces what would otherwise be a lucide glyph in the
 * wizard, keeping the flow custom end-to-end.
 */

/** School / University — a mortarboard cap over a column base (campus + academia). */
export function IconSchool({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: mortarboard board */}
      <path d="M12 4.2 21 8l-9 3.8L3 8l9-3.8Z" fill={accent} opacity={0.18} stroke="none" />
      {/* mortarboard */}
      <path d="M12 4.2 21 8l-9 3.8L3 8l9-3.8Z" />
      {/* tassel + button */}
      <path d="M21 8v3.4" />
      <circle cx="21" cy="12" r="0.7" fill="currentColor" stroke="none" />
      {/* head-band beneath the cap (the “campus” base read) */}
      <path d="M7 9.6v3.4c0 1.6 2.2 2.8 5 2.8s5-1.2 5-2.8V9.6" />
    </IconBase>
  );
}

/** Crest — a heraldic chapter shield with a Greek-letter notch (the org identity). */
export function IconCrest({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: shield body */}
      <path
        d="M12 3.2 19 5.4v5.1c0 4.4-3 7.6-7 9.3-4-1.7-7-4.9-7-9.3V5.4L12 3.2Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      {/* shield outline */}
      <path d="M12 3.2 19 5.4v5.1c0 4.4-3 7.6-7 9.3-4-1.7-7-4.9-7-9.3V5.4L12 3.2Z" />
      {/* chevron + a small column motif inside (Greek-life heraldry) */}
      <path d="M8.4 11.2 12 8.6l3.6 2.6" />
      <path d="M12 12.2v4" />
    </IconBase>
  );
}

/** Live preview — a small browser window with a “magic” spark (your site forming). */
export function IconPreview({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: window body */}
      <rect x="3" y="4.5" width="18" height="14" rx="2.2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3" y="4.5" width="18" height="14" rx="2.2" />
      {/* chrome bar + dots */}
      <path d="M3 8.5h18" />
      <circle cx="5.6" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="7.6" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      {/* spark — the “coming together” flourish */}
      <path d="M14.5 12.4l1 2.1 2.1 1-2.1 1-1 2.1-1-2.1-2.1-1 2.1-1 1-2.1Z" fill={accent} stroke="none" />
    </IconBase>
  );
}

/** Pricing — a price tag with a coin (choose how you pay). The pricing-step glyph. */
export function IconPricing({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: tag body */}
      <path
        d="M4 4.5h6.2a2 2 0 0 1 1.42.59l7 7a2 2 0 0 1 0 2.82l-4.7 4.7a2 2 0 0 1-2.82 0l-7-7A2 2 0 0 1 3.5 11V6a1.5 1.5 0 0 1 1.5-1.5Z"
        fill={accent}
        opacity={0.14}
        stroke="none"
      />
      <path d="M4 4.5h6.2a2 2 0 0 1 1.42.59l7 7a2 2 0 0 1 0 2.82l-4.7 4.7a2 2 0 0 1-2.82 0l-7-7A2 2 0 0 1 3.5 11V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      {/* tag hole */}
      <circle cx="7.5" cy="8" r="1.15" />
    </IconBase>
  );
}

/** Base plan — a stacked-coins / receipt read (flat monthly or per-semester fee). */
export function IconCoins({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: front coin */}
      <ellipse cx="9" cy="15.5" rx="5.5" ry="2.4" fill={accent} opacity={0.16} stroke="none" />
      {/* front coin stack */}
      <ellipse cx="9" cy="9.5" rx="5.5" ry="2.4" />
      <path d="M3.5 9.5v6c0 1.33 2.46 2.4 5.5 2.4s5.5-1.07 5.5-2.4v-6" />
      <path d="M3.5 12.5c0 1.33 2.46 2.4 5.5 2.4s5.5-1.07 5.5-2.4" />
      {/* back coin (depth) */}
      <path d="M15 7.2c2.7.24 4.7 1.2 4.7 2.4 0 .86-1.02 1.6-2.6 2" />
    </IconBase>
  );
}

/** Dues-share — a percent symbol in a ring (a % of dues, $0 upfront). */
export function IconPercent({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: ring */}
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.12} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      {/* slash + two beads = % */}
      <path d="M15 9 9 15" />
      <circle cx="9.4" cy="9.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="14.6" r="1.15" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Semester — a calendar with a check (per-term billing cadence). */
export function IconCalendar({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: calendar body */}
      <rect x="3.5" y="5" width="17" height="15" rx="2.2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3.5" y="5" width="17" height="15" rx="2.2" />
      {/* binding rings + header rule */}
      <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
      {/* term check */}
      <path d="M9 14.2l2 2 3.6-3.8" />
    </IconBase>
  );
}

/** Settings cog — a gear (the “edit anytime in Admin → Settings” reassurance). */
export function IconSettingsGear({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: hub */}
      <circle cx="12" cy="12" r="3" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="12" cy="12" r="3" />
      {/* eight teeth */}
      <path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.84 1.84M7.24 16.76 5.4 18.6M18.6 18.6l-1.84-1.84M7.24 7.24 5.4 5.4" />
    </IconBase>
  );
}

/** Pencil — inline-edit affordance on the editable preview fields. */
export function IconPencil({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: nib */}
      <path d="M4 20l1.2-4 11-11 2.8 2.8-11 11L4 20Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M4 20l1.2-4 11-11 2.8 2.8-11 11L4 20Z" />
      {/* ferrule + the edit underline */}
      <path d="M14.5 6.5 17.5 9.5" />
    </IconBase>
  );
}
