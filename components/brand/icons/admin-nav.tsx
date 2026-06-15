import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Admin nav + command-palette set
 * ────────────────────────────────────────────────────────────────────────────
 * The persistent officer chrome — the always-on admin nav bar and the ⌘K
 * command palette — previously mixed ~15 raw lucide-react glyphs in among the
 * bespoke GreekStack icons, so the navigation read as TWO icon families side by
 * side. These close that cohesion gap: every remaining admin destination now
 * has a made-for-Greek-life glyph that obeys the shared design language of
 * ./icon-base.tsx:
 *
 *   • 24×24 grid, ~1.75px primary line in `currentColor`, round caps/joins.
 *   • a soft brand-accent layer (var(--gs-accent, #38bdf8)) at low opacity
 *     behind the primary line — the two-tone read that makes the set premium.
 *   • a quiet Greek motif (column, pediment, laurel, key, scroll) woven in
 *     where it stays legible at 16–24px.
 *
 * Drop-in for the lucide call-sites: identical `className` sizing,
 * `currentColor` inheritance, `aria-hidden` by default. Re-exported via
 * ./index.ts. Concept → former-lucide mapping is noted on each export.
 */

/** Directory — a member portrait inside an open address book (was lucide BookUser). */
export function IconDirectory({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: book block */}
      <path d="M5 4.5h12.5a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 20V4.5Z" fill={accent} opacity={0.14} stroke="none" />
      {/* book + spine */}
      <path d="M6.5 4.5H18a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 0 5 21V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M5 17.5h13" />
      {/* member portrait on the page */}
      <circle cx="11.5" cy="9.4" r="1.9" />
      <path d="M8.6 14c0-1.6 1.3-2.7 2.9-2.7s2.9 1.1 2.9 2.7" />
    </IconBase>
  );
}

/** Standing — a laurel-flanked award medal (chapter standing / leaderboard; was lucide Trophy). */
export function IconStanding({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: medal disc */}
      <circle cx="12" cy="9.5" r="5.2" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="9.5" r="5.2" />
      {/* star on the medal */}
      <path d="M12 7.1l.8 1.6 1.8.26-1.3 1.27.31 1.77L12 12.8l-1.6.96.31-1.77-1.3-1.27 1.8-.26L12 7.1Z" fill={accent} opacity={0.5} stroke="none" />
      {/* ribbons */}
      <path d="M9.4 13.8 8 20l4-2 4 2-1.4-6.2" />
    </IconBase>
  );
}

/** Family — a big/little lineage tree of three linked nodes (was lucide Network). */
export function IconFamilyTree({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: parent node */}
      <circle cx="12" cy="5" r="2.4" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="12" cy="5" r="2.4" />
      {/* connectors big → littles */}
      <path d="M12 7.4v3M12 10.4H6.5v2M12 10.4h5.5v2" />
      {/* the two littles */}
      <circle cx="6.5" cy="15" r="2.4" fill={accent} opacity={0.12} stroke="none" />
      <circle cx="6.5" cy="15" r="2.4" />
      <circle cx="17.5" cy="15" r="2.4" />
    </IconBase>
  );
}

/** Meetings — a calendar leaf with a quorum check (was lucide CalendarCheck). */
export function IconMeetings({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: header band */}
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V7Z" fill={accent} opacity={0.18} stroke="none" />
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
      {/* attendance check */}
      <path d="M8.5 14.5l2.2 2.2 4.3-4.7" />
    </IconBase>
  );
}

/** Risk Desk — a guardian shield raising an alert (was lucide ShieldAlert). */
export function IconRiskDesk({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      {/* alert bang */}
      <path d="M12 8v4" />
      <circle cx="12" cy="15" r="0.55" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Academic — a mortarboard over an open ledger book (GPA / scholarship; was lucide GraduationCap). */
export function IconAcademic({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: cap top */}
      <path d="M12 3.5l9 3.6-9 3.6-9-3.6 9-3.6Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M12 3.5l9 3.6-9 3.6-9-3.6 9-3.6Z" />
      {/* tassel */}
      <path d="M21 7.1v3.4" />
      {/* open book below */}
      <path d="M5 13.2c2-1 4-1 6 .2 2-1.2 4-1.2 6-.2v5.6c-2-1-4-1-6 .2-2-1.2-4-1.2-6-.2v-5.6Z" />
      <path d="M11 13.4v5.6" />
    </IconBase>
  );
}

/** Chores — a checklist clipboard with a ticked task (house duties; was lucide CheckSquare). */
export function IconChores({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: sheet */}
      <rect x="4.5" y="3.8" width="15" height="16.4" rx="2.2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="4.5" y="3.8" width="15" height="16.4" rx="2.2" />
      {/* clip */}
      <path d="M9 3.8V5a1.2 1.2 0 0 0 1.2 1.2h3.6A1.2 1.2 0 0 0 15 5V3.8" />
      {/* checked row */}
      <path d="M8 11l1.4 1.4 2.4-2.6" />
      <path d="M14 11h2.5" stroke={accent} opacity={0.55} />
      {/* second row */}
      <path d="M8 15.6h8" />
    </IconBase>
  );
}

/** Service — a giving hand cradling a small heart (philanthropy hours; was lucide HandHeart). */
export function IconService({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: heart */}
      <path
        d="M12 7.6l-.8-.8a2 2 0 0 0-2.8 2.8L12 13l3.6-3.4a2 2 0 0 0-2.8-2.8l-.8.8Z"
        fill={accent}
        opacity={0.2}
        stroke="none"
      />
      <path d="M12 7.6l-.8-.8a2 2 0 0 0-2.8 2.8L12 13l3.6-3.4a2 2 0 0 0-2.8-2.8l-.8.8Z" />
      {/* cupped hand */}
      <path d="M3.5 15l3.4 3.2a3 3 0 0 0 2.1.8H17a2.5 2.5 0 0 0 0-5h-3.2" />
      <path d="M3.5 15 2 16.6" />
    </IconBase>
  );
}

/** Library — a stack of spined books with a bookmark (documents / bylaws; was lucide BookMarked). */
export function IconLibrary({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: front volume */}
      <rect x="4" y="5.5" width="11" height="14" rx="1.3" fill={accent} opacity={0.14} stroke="none" />
      {/* two leaning volumes */}
      <rect x="4" y="5.5" width="5" height="14" rx="1.2" />
      <rect x="9" y="5.5" width="5" height="14" rx="1.2" />
      {/* third volume, tilted */}
      <path d="M15 6.6l3.4.9a1 1 0 0 1 .7 1.2L17 18.6" />
      {/* bookmark ribbon on the front volume */}
      <path d="M11.5 5.5v4l-1.2-1-1.3 1v-4" fill={accent} opacity={0.4} stroke="currentColor" />
    </IconBase>
  );
}

/** Exports — a document sliding down out of a tray (HQ exports / CSV; was lucide FileDown). */
export function IconExports({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: page */}
      <path d="M6 3.5h7l5 5v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" fill={accent} opacity={0.13} stroke="none" />
      <path d="M13 3.5l5 5h-5v-5Z" fill={accent} opacity={0.22} stroke="none" />
      <path d="M13 3.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13 3.5Z" />
      {/* download arrow */}
      <path d="M11 10.5v4.2M9 12.7l2 2 2-2" />
    </IconBase>
  );
}

/** Payouts — coins flowing into a bank slot (Stripe Connect payouts; was lucide Banknote). */
export function IconPayouts({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: note */}
      <rect x="3" y="6" width="18" height="10" rx="2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3" y="6" width="18" height="10" rx="2" />
      <circle cx="12" cy="11" r="2.2" />
      <path d="M6 8.4v.01M18 13.6v.01" />
      {/* payout arrow dropping below */}
      <path d="M12 16.5v3M10.3 18l1.7 1.7 1.7-1.7" stroke={accent} opacity={0.55} />
      <path d="M12 16.5v3M10.3 18l1.7 1.7 1.7-1.7" />
    </IconBase>
  );
}

/** Billing — a subscription card with a renewal cycle (plan / invoice; was lucide CreditCard). */
export function IconBilling({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: card */}
      <rect x="3" y="5.5" width="18" height="12" rx="2.4" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3" y="5.5" width="18" height="12" rx="2.4" />
      {/* magnetic band */}
      <path d="M3 9.5h18" />
      {/* renewal arc + chip */}
      <path d="M7 13.5h3" />
      <circle cx="16.5" cy="13.5" r="1.6" stroke={accent} opacity={0.6} />
    </IconBase>
  );
}

/** Audit log — an unfurled scroll with ruled entries (governance trail; was lucide ScrollText). */
export function IconAuditLog({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: scroll body */}
      <path d="M7 4.5h9a1.5 1.5 0 0 1 1.5 1.5v11a2.5 2.5 0 0 0 2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5V6A1.5 1.5 0 0 1 7 4.5Z" fill={accent} opacity={0.13} stroke="none" />
      <path d="M7 4.5h9a1.5 1.5 0 0 1 1.5 1.5v11a2.5 2.5 0 0 0 2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5V6A1.5 1.5 0 0 1 7 4.5Z" />
      {/* curled top of the scroll */}
      <path d="M5.5 6a1.5 1.5 0 0 0-1.5 1.5v0A1.5 1.5 0 0 0 5.5 9H7" />
      {/* ruled entries */}
      <path d="M9 8.5h5M9 11.5h5M9 14.5h3" />
    </IconBase>
  );
}

/** Polls — a ballot box receiving a marked slip (chapter polls / voting; was lucide Vote). */
export function IconBallot({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: box body */}
      <path d="M3.5 12.5h17V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19v-6.5Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M3.5 12.5h17V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19v-6.5Z" />
      {/* slot */}
      <path d="M9 12.5v-1.2h6v1.2" />
      {/* the marked slip */}
      <path d="M8.5 3.5h7v6h-7z" fill={accent} opacity={0.13} />
      <path d="M8.5 3.5h7v6h-7z" />
      <path d="M10 6.4l1.4 1.4 2.4-2.6" />
    </IconBase>
  );
}
