import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Marketing / feature set
 * ────────────────────────────────────────────────────────────────────────────
 * The product-feature glyphs used across the marketing landing, feature grids,
 * stat tiles, and nav. Each is duotone: a soft brand-accent fill behind a
 * currentColor primary line, with a Greek motif woven in where it stays legible.
 */

/** Recruitment — a rush funnel narrowing a crowd of PNMs to a single bid. */
export function IconRecruitment({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the funnel body */}
      <path
        d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      {/* funnel outline */}
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
      {/* the three candidates entering the top */}
      <circle cx="8.5" cy="3" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="3" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="3" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Dues — a payment card tucked into a wallet, accent coin on top. */
export function IconDues({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: card */}
      <rect x="3" y="7" width="14" height="9" rx="2" fill={accent} opacity={0.16} stroke="none" />
      {/* card */}
      <rect x="3" y="7" width="14" height="9" rx="2" />
      <path d="M3 10.5h14" />
      {/* coin / chip accent */}
      <circle cx="17.5" cy="14.5" r="3.5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="17.5" cy="14.5" r="3.5" />
      <path d="M17.5 13v3M16.3 13.6h1.7a0.6 0.6 0 0 1 0 1.2h-1.7a0.6 0.6 0 0 0 0 1.2h1.7" />
    </IconBase>
  );
}

/** Events — a calendar with a confirmed check (accent date cell). */
export function IconEvents({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: header band */}
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V7Z" fill={accent} opacity={0.18} stroke="none" />
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
      {/* the confirmed check */}
      <path d="M9 14.5l2 2 4-4.5" />
    </IconBase>
  );
}

/** Roles — an officer shield with a keyhole (RBAC / permissions). */
export function IconRoles({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      {/* keyhole */}
      <circle cx="12" cy="10.5" r="1.6" />
      <path d="M12 12.1V15" />
    </IconBase>
  );
}

/** Safety — a guardian shield raising a flag (anti-hazing / report). */
export function IconSafety({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      {/* raised flag */}
      <path d="M10 8v7" />
      <path d="M10 8h4.5l-1.2 1.8 1.2 1.8H10" fill={accent} opacity={0.3} />
    </IconBase>
  );
}

/** White-label — a paint swatch + brush (themeable branding). */
export function IconWhiteLabel({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: swatch */}
      <rect x="3" y="3.5" width="11" height="11" rx="2.5" fill={accent} opacity={0.16} stroke="none" />
      <rect x="3" y="3.5" width="11" height="11" rx="2.5" />
      {/* three colour dots on the swatch */}
      <circle cx="6.3" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="9" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="6.3" cy="9.5" r="0.7" fill="currentColor" stroke="none" />
      {/* brush */}
      <path d="M14 14l5.2-5.2a1.6 1.6 0 0 1 2.3 2.3L16.3 16.3" />
      <path d="M16.3 16.3l-3 3-3 .7.7-3 3-3" fill={accent} opacity={0.18} />
    </IconBase>
  );
}

/** Alumni — a giving handshake under a small heart (engagement / donations). */
export function IconAlumni({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: heart */}
      <path
        d="M12 6.4l-.9-.9a2.2 2.2 0 0 0-3.1 3.1l4 4 4-4a2.2 2.2 0 0 0-3.1-3.1l-.9.9Z"
        fill={accent}
        opacity={0.18}
        stroke="none"
      />
      {/* handshake */}
      <path d="M3 13l3-2 3 2 2-1.5" />
      <path d="M21 13l-3-2-3 2-2-1.5" />
      <path d="M11 11.5l1.5 1.5a1 1 0 0 0 1.4 0L15 12" />
      <path d="M6 11v5M18 11v5" />
    </IconBase>
  );
}

/** Members — a group of people (roster / community). */
export function IconMembers({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: back member */}
      <circle cx="17" cy="8" r="2.4" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M21 18v-1a3 3 0 0 0-3-3" />
      {/* front pair */}
      <circle cx="9" cy="7.5" r="3" />
      <path d="M3.5 18v-1.2A3.8 3.8 0 0 1 7.3 13h3.4a3.8 3.8 0 0 1 3.8 3.8V18" />
    </IconBase>
  );
}

/** Dashboard — a paneled layout with a Greek-column accent tile. */
export function IconDashboard({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: hero tile */}
      <rect x="3" y="3" width="8" height="8" rx="1.6" fill={accent} opacity={0.18} stroke="none" />
      <rect x="3" y="3" width="8" height="8" rx="1.6" />
      <rect x="13" y="3" width="8" height="5" rx="1.6" />
      <rect x="13" y="10" width="8" height="11" rx="1.6" />
      <rect x="3" y="13" width="8" height="8" rx="1.6" />
    </IconBase>
  );
}

/** Growth — an upward trend line breaking out of a frame. */
export function IconGrowth({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: area under the curve */}
      <path d="M4 16l4-3 3 2 6.5-7V19H4v-3Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M4 19V5" />
      <path d="M4 16l4-3 3 2 5.5-6" />
      {/* arrow head */}
      <path d="M16.5 9H20v3.5" />
      <path d="M4 19h16" />
    </IconBase>
  );
}

/** Security — a padlock with an accent body (data protection). */
export function IconSecurity({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: lock body */}
      <rect x="5" y="10" width="14" height="10" rx="2.4" fill={accent} opacity={0.16} stroke="none" />
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      {/* shackle */}
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      {/* keyhole */}
      <circle cx="12" cy="14.5" r="1.3" />
      <path d="M12 15.6V17.2" />
    </IconBase>
  );
}

/** Subdomain — a globe threaded by a link (your-chapter.greekstack.app). */
export function IconSubdomain({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      {/* meridians */}
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z" />
      {/* link node */}
      <circle cx="16.5" cy="16.5" r="1.2" fill={accent} opacity={0.5} />
    </IconBase>
  );
}

/** Launch — a rocket lifting off (go live / publish). */
export function IconLaunch({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: exhaust plume */}
      <path d="M9 15c-1.5 1-2 3.5-2 5 1.5 0 4-.5 5-2" fill={accent} opacity={0.2} stroke="none" />
      {/* fuselage */}
      <path d="M12 3c3 1.5 5 4.5 5 8l-3 3h-4l-3-3c0-3.5 2-6.5 5-8Z" />
      {/* fins */}
      <path d="M9 13l-3 1 1.5 2.5M15 13l3 1-1.5 2.5" />
      {/* window */}
      <circle cx="12" cy="9" r="1.6" fill={accent} opacity={0.35} />
      {/* exhaust flick */}
      <path d="M9 15c-1.5 1-2 3.5-2 5 1.5 0 4-.5 5-2" />
    </IconBase>
  );
}

/** Spark — a four-point sparkle with a small companion (highlights / AI / new). */
export function IconSpark({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: glow */}
      <path
        d="M12 3.5c.7 3.6 1.9 4.8 5.5 5.5-3.6.7-4.8 1.9-5.5 5.5-.7-3.6-1.9-4.8-5.5-5.5 3.6-.7 4.8-1.9 5.5-5.5Z"
        fill={accent}
        opacity={0.18}
        stroke="none"
      />
      <path d="M12 3.5c.7 3.6 1.9 4.8 5.5 5.5-3.6.7-4.8 1.9-5.5 5.5-.7-3.6-1.9-4.8-5.5-5.5 3.6-.7 4.8-1.9 5.5-5.5Z" />
      {/* companion sparkle */}
      <path d="M17.5 15c.3 1.4.8 1.9 2.2 2.2-1.4.3-1.9.8-2.2 2.2-.3-1.4-.8-1.9-2.2-2.2 1.4-.3 1.9-.8 2.2-2.2Z" />
    </IconBase>
  );
}
