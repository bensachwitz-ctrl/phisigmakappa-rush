import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — web migration EXTRAS
 * ────────────────────────────────────────────────────────────────────────────
 * The remaining high-traffic interface glyphs the web surfaces still borrowed
 * from lucide-react (add / download / file / editor toolbar / arrows / status /
 * social …). Drawn fresh here in the shared house language so a full web
 * migration can happen WITHOUT ever mixing a lucide glyph next to a bespoke one
 * on a rendered surface.
 *
 * Every glyph obeys ./icon-base.tsx:
 *   • 24×24 grid, ~1.75px round-cap/round-join primary line in `currentColor`;
 *   • a soft SECONDARY accent layer — a low-opacity fill, or a wider ~3.5px
 *     under-stroke for thin marks — in `var(--gs-accent)` so the two-tone read
 *     stays cohesive with the rest of the set;
 *   • `aria-hidden` by default (decorative) — pass `aria-label` to announce.
 *
 * All are original geometry (no lucide paths). Re-exported through ./index.ts so
 * call-sites import from the public barrel; many migrate via an alias, e.g.
 *   import { IconMembers as Users, IconTrash as Trash2 } from "@/components/brand/icons";
 * which keeps the (fully bespoke) render while leaving huge JSX bodies untouched.
 */

/**
 * Shared component type for a Greekstack icon — a drop-in replacement for
 * lucide-react's `LucideIcon` at typed call-sites (`icon: GsIcon`,
 * `Record<string, GsIcon>`). Every bespoke glyph is assignable to it.
 */
export type GsIcon = React.FC<IconProps>;

/* ── Add / remove ───────────────────────────────────────────────────────── */

/** Plus — a confident cross with a soft accent under-stroke (add / new). */
export function IconPlus({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

/** Minus — a single bar with an accent echo (remove / collapse). */
export function IconMinus({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M5 12h14" />
    </IconBase>
  );
}

/** MinusCircle — a minus inside a ring with an accent disc (disable / exclude). */
export function IconMinusCircle({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.3 12h7.4" />
    </IconBase>
  );
}

/** Circle — a plain ring with a soft accent fill (status dot / radio). */
export function IconCircle({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
    </IconBase>
  );
}

/** Edit — a pencil laid over its stroke with an accent shaft (edit / rename). */
export function IconEdit({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20l1.2-4.2L15 6l3 3L8.2 18.8 4 20Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M4 20l1.2-4.2L15 6l3 3L8.2 18.8 4 20Z" />
      <path d="M13.5 7.5l3 3" />
    </IconBase>
  );
}

/* ── Files / transfer ───────────────────────────────────────────────────── */

/** Download — an arrow dropping into a tray (save / export / download). */
export function IconDownload({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill={accent} opacity={0.14} stroke="none" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M12 3.5v10.5M7.5 9.5l4.5 4.5 4.5-4.5" />
    </IconBase>
  );
}

/** FileText — a page with a folded corner + ruled lines (document / notes). */
export function IconFileText({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-6-6Z" fill={accent} opacity={0.13} stroke="none" />
      <path d="M13 3v6h6" fill={accent} opacity={0.22} stroke="none" />
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9L13 3Z" />
      <path d="M13 3v6h6" />
      <path d="M8.5 13h7M8.5 16.5h7M8.5 9.5h2.5" />
    </IconBase>
  );
}

/** Clipboard — a board with a pinch clip (paste / forms / tasks). */
export function IconClipboard({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V4a3 3 0 0 1 6 0v.5" />
      <rect x="9" y="3" width="6" height="3" rx="1" fill={accent} opacity={0.3} stroke="none" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
    </IconBase>
  );
}

/** Copy — two stacked sheets, the back one accent-tinted (duplicate / copy). */
export function IconCopy({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M5.5 15.5H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5" />
    </IconBase>
  );
}

/** Folder — a tabbed folder with a soft accent body (files / library / group). */
export function IconFolder({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V7.5Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V7.5Z" />
      <path d="M3.5 11h17" />
    </IconBase>
  );
}

/** Receipt — a ledger slip with a torn zigzag foot (invoice / expense). */
export function IconReceipt({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3.5h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V3.5Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M6 3.5h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V3.5Z" />
      <path d="M9 8h6M9 11.5h6M9 15h3" />
    </IconBase>
  );
}

/* ── Money ──────────────────────────────────────────────────────────────── */

/** DollarSign — an S over a spine with an accent under-stroke (money / dues). */
export function IconDollarSign({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5v17" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M12 3.5v17" />
      <path d="M16.5 7A4 4 0 0 0 12.8 5H10.6a3 3 0 0 0 0 6h2.8a3 3 0 0 1 0 6H11a4 4 0 0 1-3.7-2" />
    </IconBase>
  );
}

/** Percent — a slash between two rings with an accent slash (rates / %). */
export function IconPercent({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 18L18 6" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M6 18L18 6" />
      <circle cx="7.5" cy="7.5" r="2.3" />
      <circle cx="16.5" cy="16.5" r="2.3" />
    </IconBase>
  );
}

/** Scale — balanced scales of justice on a base (governance / terms / fairness). */
export function IconScale({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 9.5l2.5 5h-5L3 9.5ZM18.5 9.5L21 14.5h-5l2.5-5Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M12 4v16M6 20h12M12 6.5l6.5 3M12 6.5L5.5 9.5" />
      <path d="M3 9.5l2.5 5h-5L3 9.5ZM18.5 9.5L21 14.5h-5l2.5-5Z" />
      <circle cx="12" cy="5" r="1.1" fill={accent} stroke="none" />
    </IconBase>
  );
}

/** Landmark — a columned civic building on stepped base (bank / institution). */
export function IconLandmark({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5l8 4.5H4l8-4.5Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12 3.5l8 4.5H4l8-4.5Z" />
      <path d="M6 10v7M10 10v7M14 10v7M18 10v7" />
      <path d="M4 17.5h16M3.5 20.5h17" />
    </IconBase>
  );
}

/* ── Arrows / motion ────────────────────────────────────────────────────── */

/** ArrowUp — a shaft + head rising, accent echo (upvote / sort asc). */
export function IconArrowUp({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 19.5v-15" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M12 19.5v-15M6 10.5l6-6 6 6" />
    </IconBase>
  );
}

/** ArrowDown — a shaft + head falling, accent echo (downvote / sort desc). */
export function IconArrowDown({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.5v15" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M12 4.5v15M6 13.5l6 6 6-6" />
    </IconBase>
  );
}

/** ChevronUp — an upward chevron with a soft accent echo. */
export function IconChevronUp({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 15l7-7 7 7" stroke={accent} opacity={0.28} strokeWidth={3.5} />
      <path d="M5 15l7-7 7 7" />
    </IconBase>
  );
}

/** ArrowSort — paired up/down arrows (sortable column / reorder). */
export function IconArrowSort({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 4.5v15M17 19.5v-15" stroke={accent} opacity={0.22} strokeWidth={3} />
      <path d="M7 4.5v15M4 8l3-3.5L10 8" />
      <path d="M17 19.5v-15M14 16l3 3.5 3-3.5" />
    </IconBase>
  );
}

/** Refresh — two rotating arrows around a soft accent hub (sync / reload / retry). */
export function IconRefresh({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.5" fill={accent} opacity={0.1} stroke="none" />
      <path d="M4.8 12a7.2 7.2 0 0 1 12.2-5.2L19.5 9" />
      <path d="M19.5 4v5h-5" />
      <path d="M19.2 12A7.2 7.2 0 0 1 7 17.2L4.5 15" />
      <path d="M4.5 20v-5h5" />
    </IconBase>
  );
}

/** Undo — a back-curving arrow (undo / revert). */
export function IconUndo({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 9h11a5.5 5.5 0 0 1 0 11H9" stroke={accent} opacity={0.22} strokeWidth={3} />
      <path d="M4 9h11a5.5 5.5 0 0 1 0 11H9" />
      <path d="M7.5 5.5 4 9l3.5 3.5" />
    </IconBase>
  );
}

/** Redo — a forward-curving arrow (redo / repeat). */
export function IconRedo({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 9H9a5.5 5.5 0 0 0 0 11h6" stroke={accent} opacity={0.22} strokeWidth={3} />
      <path d="M20 9H9a5.5 5.5 0 0 0 0 11h6" />
      <path d="M16.5 5.5 20 9l-3.5 3.5" />
    </IconBase>
  );
}

/** Reply — an elbow arrow turning down and right (reply / nested / indent). */
export function IconReply({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 5v6a2 2 0 0 0 2 2h9" stroke={accent} opacity={0.24} strokeWidth={3} />
      <path d="M6 5v6a2 2 0 0 0 2 2h9" />
      <path d="M14 9.5l4 3.5-4 3.5" />
    </IconBase>
  );
}

/* ── Trends / analytics ─────────────────────────────────────────────────── */

/** TrendingDown — a falling line breaking out of a frame (decline / churn). */
export function IconTrendingDown({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5v14h16" stroke={accent} opacity={0.18} strokeWidth={2.4} />
      <path d="M4 19V5" />
      <path d="M4 8l5 5 3-2 5.5 5" />
      <path d="M14 16h3.5v-3.5" />
      <path d="M4 19h16" />
    </IconBase>
  );
}

/* ── Devices / tech ─────────────────────────────────────────────────────── */

/** Smartphone — a phone body with a home indicator + accent screen (mobile / app). */
export function IconSmartphone({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill={accent} opacity={0.14} stroke="none" />
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 5h3" />
      <path d="M10.5 18.5h3" />
    </IconBase>
  );
}

/** Monitor — a desktop screen on a stand with an accent panel (device / display). */
export function IconMonitor({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4.5" width="18" height="12" rx="2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M12 16.5V20M9 20h6" />
    </IconBase>
  );
}

/* ── Web / social ───────────────────────────────────────────────────────── */

/** Globe — a wireframe globe with meridians + equator (web / subdomain / world). */
export function IconGlobe({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z" />
    </IconBase>
  );
}

/** Home — a house with a doorway and an accent body (home / dashboard root). */
export function IconHome({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 11l8-6.5L20 11v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V11Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M4 11l8-6.5L20 11v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V11Z" />
      <path d="M9.5 21v-6h5v6" />
    </IconBase>
  );
}

/** Compass — a ringed compass with an accent needle (explore / directory / find). */
export function IconCompass({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" fill={accent} opacity={0.3} stroke="none" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" />
    </IconBase>
  );
}

/** Link — two clasped link loops with an accent bridge (URL / connect / share). */
export function IconLink({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 15l6-6" stroke={accent} opacity={0.3} strokeWidth={3.5} />
      <path d="M9 15l6-6" />
      <path d="M10.5 7l1.5-1.5a3.5 3.5 0 0 1 5 5L15.5 12" />
      <path d="M13.5 17l-1.5 1.5a3.5 3.5 0 0 1-5-5L8.5 12" />
    </IconBase>
  );
}

/** Unlink — clasped loops broken apart with a slash (disconnect / remove link). */
export function IconUnlink({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 7l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M14 17l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
      <path d="M5 5l14 14" stroke={accent} opacity={0.45} strokeWidth={2} />
    </IconBase>
  );
}

/** Instagram — a rounded camera frame with lens + flash (social / gallery). */
export function IconInstagram({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="16.8" cy="7.2" r="0.85" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** LinkedIn — an "in" profile badge with an accent tile (social / careers). */
export function IconLinkedin({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M7.5 10.5V16.5" />
      <circle cx="7.5" cy="7.8" r="0.95" fill="currentColor" stroke="none" />
      <path d="M11 16.5v-3.4a2.1 2.1 0 0 1 4.2 0v3.4M11 10.6v5.9" />
    </IconBase>
  );
}

/** Music — a beamed pair of notes with accent note-heads (audio / playlist). */
export function IconMusic({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 17V6l10-2v10" stroke={accent} opacity={0.22} strokeWidth={3} />
      <path d="M9 17V6l10-2v10" />
      <circle cx="6.6" cy="17.2" r="2.4" fill={accent} opacity={0.2} stroke="none" />
      <circle cx="6.6" cy="17.2" r="2.4" />
      <circle cx="16.6" cy="15.2" r="2.4" />
    </IconBase>
  );
}

/** Party — a cone bursting confetti with accent sparks (celebration / success). */
export function IconParty({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 20.5l4-11 7 7-11 4Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M3.5 20.5l4-11 7 7-11 4Z" />
      <path d="M7.5 9.5l3 3" />
      <path d="M14 4v2.2M18.4 5.6l-1.6 1.6M20 10h-2.2M17.2 12.8l-1.6-1.6" stroke={accent} opacity={0.6} />
    </IconBase>
  );
}

/** Play — a triangle glyph with an accent fill (start / play / launch). */
export function IconPlay({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 5.5l11 6.5-11 6.5V5.5Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M8 5.5l11 6.5-11 6.5V5.5Z" />
    </IconBase>
  );
}

/* ── People ─────────────────────────────────────────────────────────────── */

/** UserCheck — a member portrait with an approving check (approved / verified). */
export function IconUserCheck({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10" cy="8" r="3.6" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="10" cy="8" r="3.6" />
      <path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h3.2" />
      <path d="M15 17.5l2 2 4-4.5" />
    </IconBase>
  );
}

/** UserX — a member portrait with a dismiss X (removed / rejected / blocked). */
export function IconUserX({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10" cy="8" r="3.6" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="10" cy="8" r="3.6" />
      <path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h3.2" />
      <path d="M15.5 15.5l4.5 4.5M20 15.5l-4.5 4.5" />
    </IconBase>
  );
}

/** ThumbsDown — a downturned endorsement hand with a soft accent palm (dislike / no). */
export function IconThumbsDown({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17 13.5l-3.2 6a1.8 1.8 0 0 1-3.3-1.3l.5-3.7H6.5a2 2 0 0 1-2-2.4l1.2-6a2 2 0 0 1 2-1.6H17Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M17 13.5l-3.2 6a1.8 1.8 0 0 1-3.3-1.3l.5-3.7H6.5a2 2 0 0 1-2-2.4l1.2-6a2 2 0 0 1 2-1.6H17Z" />
      <rect x="17" y="4.5" width="3.5" height="9" rx="1" />
    </IconBase>
  );
}

/** GripVertical — a two-column dot handle with an accent rail (drag / reorder). */
export function IconGripVertical({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 4.5v15M14.5 4.5v15" stroke={accent} opacity={0.16} strokeWidth={3.5} />
      <circle cx="9.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/* ── Status / misc ──────────────────────────────────────────────────────── */

/** Star — a five-point star with an accent fill (favorite / featured / rating). */
export function IconStar({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
    </IconBase>
  );
}

/** Flame — a teardrop flame with an accent inner tongue (streak / hot / trending). */
export function IconFlame({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3c1 3 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.2 1.2 1.9 2 2.2C11 8 10 5.5 12 3Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12 3c1 3 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.2 1.2 1.9 2 2.2C11 8 10 5.5 12 3Z" />
      <path d="M12 20a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1.6-2.2-2.6-3.4-1 1.2-2.6 1.8-2.6 3.4A2.6 2.6 0 0 0 12 20Z" fill={accent} opacity={0.3} stroke="none" />
    </IconBase>
  );
}

/** Eye — an almond eye with an accent iris (view / preview / visible). */
export function IconEye({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill={accent} opacity={0.12} stroke="none" />
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" fill={accent} opacity={0.28} stroke="none" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

/** Filter — a funnel narrowing to a stem with an accent body (filter / refine). */
export function IconFilter({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5.5h16l-6 7v6l-4 2v-8L4 5.5Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M4 5.5h16l-6 7v6l-4 2v-8L4 5.5Z" />
    </IconBase>
  );
}

/** Sliders — a settings board of tracks with accent knobs (filters / controls). */
export function IconSliders({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2.1" fill={accent} opacity={0.25} stroke="none" />
      <circle cx="15" cy="8" r="2.1" />
      <circle cx="9" cy="16" r="2.1" fill={accent} opacity={0.25} stroke="none" />
      <circle cx="9" cy="16" r="2.1" />
    </IconBase>
  );
}

/** Hourglass — a timer with accent sand pooling (pending / countdown / waiting). */
export function IconHourglass({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 18.2c0-2.4 3-2.9 3-4.6 0 1.7 3 2.2 3 4.6Z" fill={accent} opacity={0.3} stroke="none" />
      <path d="M6 3.5h12M6 20.5h12" />
      <path d="M7 3.5c0 4 5 4.5 5 8.5 0-4 5-4.5 5-8.5M7 20.5c0-4 5-4.5 5-8.5 0 4 5 4.5 5 8.5" />
    </IconBase>
  );
}

/** History — a clock with a counter-clockwise return arrow (activity / past / log). */
export function IconHistory({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12.5" cy="12.5" r="7.5" fill={accent} opacity={0.12} stroke="none" />
      <path d="M5 8.5A7.5 7.5 0 1 1 4.9 15" />
      <path d="M4.5 5v3.5H8" />
      <path d="M12.5 9v3.5l2.6 1.6" />
    </IconBase>
  );
}

/** LifeBuoy — a ring buoy with an accent hub + rope spokes (support / help / SOS). */
export function IconLifebuoy({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M5.8 6.8l3.7 3.7M18.2 6.8l-3.7 3.7M5.8 17.2l3.7-3.7M18.2 17.2l-3.7-3.7" />
    </IconBase>
  );
}

/* ── Rich-text editor toolbar ───────────────────────────────────────────── */

/** Bold — a stacked "B" with an accent counter (rich-text bold). */
export function IconBold({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7V5Zm0 7h7a3.5 3.5 0 0 1 0 7H7v-7Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7V5Zm0 7h7a3.5 3.5 0 0 1 0 7H7v-7Z" />
    </IconBase>
  );
}

/** Italic — slanted rule between serifs with an accent stroke (rich-text italic). */
export function IconItalic({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.5 4.5l-5 15" stroke={accent} opacity={0.28} strokeWidth={3.5} />
      <path d="M10 4.5h8M6 19.5h8M14.5 4.5l-5 15" />
    </IconBase>
  );
}

/** Heading — a capital "H" with an accent stem (rich-text heading). */
export function IconHeading({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 5v14" stroke={accent} opacity={0.28} strokeWidth={3.5} />
      <path d="M6 5v14M15 5v14M6 12h9" />
    </IconBase>
  );
}

/** List — bulleted rows with accent bullets (rich-text bullet list). */
export function IconList({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.5" cy="6.5" r="1.2" fill={accent} stroke="none" />
      <circle cx="4.5" cy="12" r="1.2" fill={accent} stroke="none" />
      <circle cx="4.5" cy="17.5" r="1.2" fill={accent} stroke="none" />
    </IconBase>
  );
}

/** ListOrdered — numbered rows with accent numerals (rich-text ordered list). */
export function IconListOrdered({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 6.5h10M10 12h10M10 17.5h10" />
      <path d="M4 5.2h1.2v3.3M3.6 8.5h2.4" stroke={accent} opacity={0.85} />
      <path d="M3.6 11.4a1.1 1.1 0 0 1 2 .6c0 .9-2 1.5-2 2.5h2.2" stroke={accent} opacity={0.85} />
    </IconBase>
  );
}

/** Quote — paired quotation blocks with accent fills (blockquote / testimonial). */
export function IconQuote({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 6.5h4V11H5V6.5ZM15 6.5h4V11h-4V6.5Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M9 6.5H5V11h4V6.5Zm0 4.5c0 2-1.1 3.6-3 4.6M19 6.5h-4V11h4V6.5Zm0 4.5c0 2-1.1 3.6-3 4.6" />
    </IconBase>
  );
}

/** Save — a floppy disk with a label slot + accent body (save / persist). */
export function IconSave({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 4.5h11l3 3V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M5 4.5h11l3 3V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z" />
      <path d="M8 4.5v4h6v-4" />
      <rect x="8" y="12" width="8" height="5" rx="0.6" />
    </IconBase>
  );
}

/** Shirt — a crew tee silhouette with an accent body (merch / apparel / swag). */
export function IconShirt({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.5 3.5L12 6l3.5-2.5 4.5 3-2.5 4L15 12.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-7.5L6.5 10.5 4 6.5l4.5-3Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M8.5 3.5L12 6l3.5-2.5 4.5 3-2.5 4L15 12.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-7.5L6.5 10.5 4 6.5l4.5-3Z" />
      <path d="M8.5 3.5A3.5 3.5 0 0 0 12 6a3.5 3.5 0 0 0 3.5-2.5" />
    </IconBase>
  );
}

/* ── Send ───────────────────────────────────────────────────────────────── */

/** Send — a paper plane lifting off with an accent body (submit / send / share). */
export function IconSend({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.5 3.5L3 10.5l6.5 2.2L20.5 3.5Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M20.5 3.5L3 10.5l6.5 2.2L12 20l2.2-6.3L20.5 3.5Z" />
      <path d="M9.5 12.7L20.5 3.5" />
    </IconBase>
  );
}
