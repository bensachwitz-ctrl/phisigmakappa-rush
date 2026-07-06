import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — UI utility set
 * ────────────────────────────────────────────────────────────────────────────
 * The small, high-frequency interface glyphs (checks, chevrons, menu, close,
 * external link, shield-check). Kept restrained — a whisper of the accent layer
 * so they stay cohesive with the feature set without shouting at 16px.
 */

/** Check — a confident tick with a soft accent under-stroke. */
export function IconCheck({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: shadow tick */}
      <path d="M5 13.5l4 4 10-10.5" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M5 12.5l4.5 4.5L19 7" />
    </IconBase>
  );
}

/** CheckCircle — a tick inside a ring with an accent-filled disc. */
export function IconCheckCircle({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </IconBase>
  );
}

/** ArrowRight — a forward arrow; the head carries a faint accent fill. */
export function IconArrowRight({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 6.5l5.5 5.5L14 17.5" fill={accent} opacity={0.16} />
      <path d="M4 12h15.5M14 6.5l5.5 5.5L14 17.5" />
    </IconBase>
  );
}

/** ChevronDown — a downward chevron with a soft accent echo. */
export function IconChevronDown({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 9.5l7 7 7-7" stroke={accent} opacity={0.28} strokeWidth={3.5} />
      <path d="M5 9l7 7 7-7" />
    </IconBase>
  );
}

/** External — an arrow leaving a framed window (opens a new tab / off-site). */
export function IconExternal({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: window */}
      <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" fill={accent} opacity={0.14} stroke="none" />
      <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
      {/* breakout arrow */}
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
    </IconBase>
  );
}

/** Menu — three bars with a Greek-key accent notch on the lead bar. */
export function IconMenu({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" stroke={accent} opacity={0.4} />
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

/** Close — an X with a faint accent shadow stroke. */
export function IconClose({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={accent} opacity={0.26} strokeWidth={3.5} />
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </IconBase>
  );
}

/** ShieldCheck — a shield with an inner tick (verified / secured). */
export function IconShieldCheck({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M8.7 11.5l2.2 2.2 4.2-4.6" />
    </IconBase>
  );
}

/** IconSearch — a magnifying glass with a faint accent filled glass. */
export function IconSearch({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="8" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </IconBase>
  );
}

/** IconSignOut — an arrow leaving a framed doorway. */
export function IconSignOut({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: door frame fill */}
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4v16Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      {/* breakout arrow */}
      <path d="M16 17l5-5-5-5M21 12H9" />
    </IconBase>
  );
}

/** IconCommand — the mac command symbol with a central accent fill. */
export function IconCommand({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="6" height="6" fill={accent} opacity={0.16} stroke="none" />
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </IconBase>
  );
}
/** IconHelp — a circled question mark with an accent-filled disc. */
export function IconHelp({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" strokeWidth={2.5} />
    </IconBase>
  );
}

/** IconChevronLeft — a leftward chevron with a soft accent echo. */
export function IconChevronLeft({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 18.5l-7-7 7-7" stroke={accent} opacity={0.28} strokeWidth={3.5} />
      <path d="M15 18l-6-6 6-6" />
    </IconBase>
  );
}

/** IconChevronRight — a rightward chevron with a soft accent echo. */
export function IconChevronRight({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 18.5l7-7-7-7" stroke={accent} opacity={0.28} strokeWidth={3.5} />
      <path d="M9 18l6-6-6-6" />
    </IconBase>
  );
}

/** IconSpinner — an animating loading ring with an accent sweep. */
export function IconSpinner({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke={accent} opacity={0.4} strokeWidth={3} />
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </IconBase>
  );
}

/** IconAlertCircle — a warning ring with a soft accent fill. */
export function IconAlertCircle({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </IconBase>
  );
}

/** IconDatabase — stacked discs with an accent fill in the top platter. */
export function IconDatabase({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" fill={accent} opacity={0.16} stroke="none" />
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </IconBase>
  );
}

/** IconWand — a magic wand with accent sparkles. */
export function IconWand({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9" stroke={accent} opacity={0.4} strokeWidth={2} />
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72M14 7l3 3" />
    </IconBase>
  );
}

/** IconUpload — a tray and upward arrow with a soft accent tray fill. */
export function IconUpload({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill={accent} opacity={0.14} stroke="none" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </IconBase>
  );
}

/** IconImage — a framed picture with an accent sun/moon. */
export function IconImage({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9" r="2.5" fill={accent} opacity={0.3} stroke="none" />
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </IconBase>
  );
}

/** IconBuilding — a skyline profile with accent window tint. */
export function IconBuilding({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </IconBase>
  );
}

/** IconRocket — a spaceship in flight with accent thrust/flame. */
export function IconRocket({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke={accent} opacity={0.3} strokeWidth={3} />
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </IconBase>
  );
}

/** IconUserPlus — a person profile with an accent plus badge. */
export function IconUserPlus({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="7" r="4" fill={accent} opacity={0.16} stroke="none" />
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" stroke={accent} opacity={0.3} strokeWidth={3} />
      <path d="M19 8v6M22 11h-6" />
    </IconBase>
  );
}

/** IconGrid — a 2x2 layout grid with accent fills in opposing corners. */
export function IconGrid({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill={accent} opacity={0.2} stroke="none" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill={accent} opacity={0.2} stroke="none" />
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}
