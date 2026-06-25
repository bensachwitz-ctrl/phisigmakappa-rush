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

/** SignOut — an arrow leaving a framed doorway. */
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

/** Help — a circled question mark with an accent-filled disc. */
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

/** Command — the mac command symbol with a central accent fill. */
export function IconCommand({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="6" height="6" fill={accent} opacity={0.16} stroke="none" />
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </IconBase>
  );
}

/** Grid — a 2x2 layout grid with accent fills in opposing corners. */
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
