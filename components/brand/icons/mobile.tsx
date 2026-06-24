import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — iOS app-surface set
 * ────────────────────────────────────────────────────────────────────────────
 * The bespoke duotone glyphs the native iOS app surface (app/app/MobileAppClient
 * + app/app/_demo/*) leans on — the last lucide-react call-sites on the mobile
 * screens. Authored so the app reads custom end-to-end instead of borrowing a
 * generic icon font.
 *
 * Every icon obeys the shared language in ./icon-base.tsx:
 *   • 24×24 grid, ~1.75px round-cap/round-join primary line in `currentColor`;
 *   • a soft SECONDARY accent layer (low-opacity fill, or a wider 3.5px under-
 *     stroke for thin marks) in `var(--gs-accent)` so the two-tone read stays
 *     cohesive with the rest of the set;
 *   • `aria-hidden` by default (decorative) — pass `aria-label` to announce.
 *
 * These are promoted through ./index.ts so call-sites import from the public
 * barrel:  import { IconBell, IconWallet } from "@/components/brand/icons";
 */

/** Bell — a notification bell with a soft accent body + clapper. */
export function IconBell({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 16c1.3-1.3 1.7-3 1.7-5.3a3.8 3.8 0 0 1 7.6 0c0 2.3.4 4 1.7 5.3Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M6.5 16c1.3-1.3 1.7-3 1.7-5.3a3.8 3.8 0 0 1 7.6 0c0 2.3.4 4 1.7 5.3Z" />
      <path d="M12 5.4V3.6" />
      <path d="M10.2 19a2 2 0 0 0 3.6 0" />
    </IconBase>
  );
}

/** LogOut — a door frame with an arrow leaving to the right (sign out). */
export function IconLogOut({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
      <path d="M15.5 8.5 19 12l-3.5 3.5" />
      <path d="M19 12H9.5" />
    </IconBase>
  );
}

/** LogIn — a door frame with an arrow entering from the left (sign in). */
export function IconLogIn({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
      <path d="M9 8.5 12.5 12 9 15.5" />
      <path d="M12.5 12H3.5" />
    </IconBase>
  );
}

/** ChevronRight — a forward chevron with a soft accent echo (list/nav rows). */
export function IconChevronRight({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 5.5l6.5 6.5-6.5 6.5" stroke={accent} opacity={0.28} strokeWidth={3.5} />
      <path d="M9 5l7 7-7 7" />
    </IconBase>
  );
}

/** Info — an "i" in a ring with an accent-shaded disc. */
export function IconInfo({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5" />
      <circle cx="12" cy="7.9" r="0.7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Award — a medal disc with ribbon tails (achievements / points). */
export function IconAward({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="9" r="5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="9" r="5" />
      <path d="M9.2 13.2 7.5 21l4.5-2.6 4.5 2.6-1.7-7.8" />
    </IconBase>
  );
}

/** Clock — a clock face with hands and an accent-shaded dial. */
export function IconClock({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </IconBase>
  );
}

/** Heart — a soft heart with an accent fill (favorite / give). */
export function IconHeart({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 7.7l-.8-.9a3.6 3.6 0 0 0-5.3 4.8L12 19l6.1-7.4a3.6 3.6 0 0 0-5.3-4.8l-.8.9Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M12 7.7l-.8-.9a3.6 3.6 0 0 0-5.3 4.8L12 19l6.1-7.4a3.6 3.6 0 0 0-5.3-4.8l-.8.9Z" />
    </IconBase>
  );
}

/** Briefcase — a work case with an accent body + handle (jobs / careers). */
export function IconBriefcase({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="8" width="18" height="11" rx="2" fill={accent} opacity={0.16} stroke="none" />
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
      <path d="M3 12.5h18" />
      <rect x="10.5" y="11.4" width="3" height="2.6" rx="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Building — an office tower with windowed accent body (chapter house / org). */
export function IconBuilding({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="3.5" width="14" height="16.5" rx="1.6" fill={accent} opacity={0.16} stroke="none" />
      <rect x="5" y="3.5" width="14" height="16.5" rx="1.6" />
      <path d="M9 7h2M13 7h2M9 10.5h2M13 10.5h2M9 14h2M13 14h2" />
      <path d="M10 20v-3h4v3" />
    </IconBase>
  );
}

/** ThumbsUp — an endorsement hand with a soft accent palm. */
export function IconThumbsUp({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 10.5l3.2-6a1.8 1.8 0 0 1 3.3 1.3L13 9.5h4.5a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M7 10.5l3.2-6a1.8 1.8 0 0 1 3.3 1.3L13 9.5h4.5a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7Z" />
      <rect x="3.5" y="10.5" width="3.5" height="9" rx="1" />
    </IconBase>
  );
}

/** Key — a vertical key with a ringed bow + teeth (access / credentials). */
export function IconKey({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="7.5" r="4" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="7.5" r="4" />
      <path d="M12 11.5V21" />
      <path d="M12 16h3M12 19h2.5" />
    </IconBase>
  );
}

/** XCircle — a clear/dismiss X inside a ring with an accent disc. */
export function IconXCircle({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </IconBase>
  );
}

/** Car — a compact car with an accent body + wheels (rush / parking / ride). */
export function IconCar({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 14l2-5.2A2.2 2.2 0 0 1 7.6 7.4h8.8a2.2 2.2 0 0 1 2.1 1.4l2 5.2v3.1a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9V14Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M3.5 14l2-5.2A2.2 2.2 0 0 1 7.6 7.4h8.8a2.2 2.2 0 0 1 2.1 1.4l2 5.2v3.1a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9V14Z" />
      <path d="M3.5 14h17" />
      <circle cx="8" cy="17.4" r="1.6" />
      <circle cx="16" cy="17.4" r="1.6" />
    </IconBase>
  );
}

/** Wallet — a billfold with a clasped card pocket + accent body. */
export function IconWallet({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="6" width="17" height="13" rx="2.4" fill={accent} opacity={0.16} stroke="none" />
      <rect x="3.5" y="6" width="17" height="13" rx="2.4" />
      <path d="M15 12.5h5.5V16H15a1.75 1.75 0 0 1 0-3.5Z" />
      <circle cx="16.4" cy="14.25" r="0.7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** PieChart — a ring with one highlighted accent slice (analytics / breakdown). */
export function IconPieChart({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 12V3.5A8.5 8.5 0 0 1 19.36 7.75Z" fill={accent} opacity={0.2} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12V3.5" />
      <path d="M12 12l7.36-4.25" />
    </IconBase>
  );
}

/** QrCode — three finder squares + data modules (scan / check-in). */
export function IconQrCode({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" fill={accent} opacity={0.16} stroke="none" />
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="5.9" y="5.9" width="2.2" height="2.2" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="15.9" y="5.9" width="2.2" height="2.2" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
      <rect x="5.9" y="15.9" width="2.2" height="2.2" rx="0.4" fill="currentColor" stroke="none" />
      <path d="M13.5 13.5h3.2v3.2M20.5 14.2v3.3M14 20.5h2.7M20.5 20.5h.01" />
    </IconBase>
  );
}

/** Gift — a wrapped present with a ribbon + bow + accent box (perks / rewards). */
export function IconGift({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 11.7v7.3a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4v-7.3Z" fill={accent} opacity={0.16} stroke="none" />
      <rect x="3.5" y="8.5" width="17" height="3.4" rx="1" />
      <path d="M5 11.9v7.1a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4v-7.1" />
      <path d="M12 8.5V20.4" />
      <path d="M12 8.5C12 6 10.6 4.5 8.9 4.5a2.1 2.1 0 0 0 0 4Zm0 0c0-2.5 1.4-4 3.1-4a2.1 2.1 0 0 1 0 4Z" />
    </IconBase>
  );
}

/** CalendarPlus — a calendar with an inline plus (add to calendar / new event). */
export function IconCalendarPlus({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V7Z" fill={accent} opacity={0.18} stroke="none" />
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
      <path d="M12 12.3v5M9.5 14.8h5" />
    </IconBase>
  );
}

/** Wand — a magic wand with a star tip + twinkle (AI generate / auto-create). */
export function IconWand({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 19.5l8.5-8.5" stroke={accent} opacity={0.25} strokeWidth={3.5} />
      <path d="M4.5 19.5l8.5-8.5" />
      <path d="M16.8 4.6l.9 2 2.1.3-1.5 1.5.36 2.1-1.86-1-1.86 1 .36-2.1-1.5-1.5 2.1-.3z" fill={accent} opacity={0.25} stroke="none" />
      <path d="M16.8 4.6l.9 2 2.1.3-1.5 1.5.36 2.1-1.86-1-1.86 1 .36-2.1-1.5-1.5 2.1-.3z" />
      <path d="M5.5 6.2h2.4M6.7 5v2.4" />
    </IconBase>
  );
}

/** Megaphone — a bullhorn with sound waves + handle (announce / broadcast). */
export function IconMegaphone({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 14V10a1.5 1.5 0 0 1 .9-1.4L16 4.5v15L5.9 15.4A1.5 1.5 0 0 1 5 14Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M5 14V10a1.5 1.5 0 0 1 .9-1.4L16 4.5v15L5.9 15.4A1.5 1.5 0 0 1 5 14Z" />
      <path d="M16 9a3 3 0 0 1 0 6" />
      <path d="M8 16v2a1.6 1.6 0 0 0 3.2 0v-.7" />
    </IconBase>
  );
}
