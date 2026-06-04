import * as React from "react";
import { IconBase, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Chapter public rush-site set
 * ────────────────────────────────────────────────────────────────────────────
 * Bespoke duotone glyphs drawn for the CHAPTER-facing rush site (the page a
 * prospective member sees). They obey the same design language as the rest of
 * the set (see ./icon-base.tsx): a `currentColor` primary line plus a soft
 * accent layer with a Greek motif woven in.
 *
 * ── The one difference from the marketing/feature icons ──
 * The marketing glyphs default their accent to the Greekstack PLATFORM sky
 * (#38bdf8). On the chapter site every decorative mark must read in the CHAPTER
 * brand, never platform blue. So these default `accent` to the live chapter
 * primary — `hsl(var(--primary) / 0.55)` — the same runtime CSS var the whole
 * chapter build themes through (re-skins per tenant for free). The primary line
 * still inherits `currentColor`, so wrapping in `text-phisig-red` (= the chapter
 * primary) keeps both layers on-brand with zero per-call wiring.
 *
 * USAGE
 *   <IconHandshake className="h-5 w-5 text-phisig-red" />   // both layers brand-tinted
 *   <IconChip icon={IconBond} tone="brand" />               // hosted in the shared chip
 *
 * Server-safe (pure SVG, no "use client"); `aria-hidden` by default. Imported
 * DIRECTLY from this file (not the barrel) by chapter-landing.tsx + rush-form.tsx
 * so the index barrel stays untouched.
 */

/** Chapter-brand accent — the live per-tenant primary at a low, glaze-friendly alpha. */
export const CHAPTER_ACCENT = "hsl(var(--primary) / 0.55)";

/** Bond — two interlocking rings (brotherhood / sisterhood / lifelong membership). */
export function IconBond({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: left ring fill */}
      <circle cx="9" cy="12" r="5" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </IconBase>
  );
}

/** Scholarship — an open book crowned by a small laurel (academics / GPA). */
export function IconScholarship({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: page spread */}
      <path d="M12 7c-2-1.3-4.5-1.6-7-1v11c2.5-.6 5-.3 7 1 2-1.3 4.5-1.6 7-1V6c-2.5-.6-5-.3-7 1Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M12 7c-2-1.3-4.5-1.6-7-1v11c2.5-.6 5-.3 7 1 2-1.3 4.5-1.6 7-1V6c-2.5-.6-5-.3-7 1Z" />
      <path d="M12 7v11" />
      {/* laurel crown */}
      <path d="M12 5.4c-.7-.7-1.7-1-2.6-.8M12 5.4c.7-.7 1.7-1 2.6-.8" />
    </IconBase>
  );
}

/** Character — a heart inside a guardian shield (integrity / values). */
export function IconCharacter({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      {/* heart */}
      <path d="M12 14.5l-2.6-2.5a1.7 1.7 0 0 1 2.4-2.4l.2.2.2-.2a1.7 1.7 0 0 1 2.4 2.4L12 14.5Z" fill={accent} opacity={0.3} stroke="currentColor" />
    </IconBase>
  );
}

/** Handshake — a giving handshake under a small heart (welcome / no-pressure rush). */
export function IconHandshake({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: heart spark above */}
      <path d="M12 6l-.7-.7a1.7 1.7 0 0 0-2.4 2.4l3.1 3 3.1-3a1.7 1.7 0 0 0-2.4-2.4L12 6Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M3 13l3-2 3 2 2-1.5" />
      <path d="M21 13l-3-2-3 2-2-1.5" />
      <path d="M11 11.5l1.5 1.5a1 1 0 0 0 1.4 0L15 12" />
      <path d="M6 11v5M18 11v5" />
    </IconBase>
  );
}

/** Calendar — a date cell with a confirmed check (schedule / rush week). */
export function IconCalendarStar({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V7Z" fill={accent} opacity={0.18} stroke="none" />
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
      <path d="M9 14.5l2 2 4-4.5" />
    </IconBase>
  );
}

/** Pin — a map marker with an accent dot (the chapter house / where to find us). */
export function IconPin({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" fill={accent} opacity={0.4} stroke="currentColor" />
    </IconBase>
  );
}

/** Mail — an envelope with an accent flap (rush questions / email). */
export function IconMail({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" fill={accent} opacity={0.12} stroke="none" />
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3.5 7.5 12 13l8.5-5.5" />
    </IconBase>
  );
}

/** Phone — a handset with a soft accent body (quick reply / text the schedule). */
export function IconPhone({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z" fill={accent} opacity={0.12} stroke="none" />
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </IconBase>
  );
}

/** Instagram — a camera glyph with an accent lens (daily chapter life). */
export function IconInstagram({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill={accent} opacity={0.12} stroke="none" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17" cy="7" r="0.7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Building — a chapter house with a Greek pediment (FSL / school chapter info). */
export function IconHouse({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: pediment */}
      <path d="M4 9 12 4l8 5H4Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M4 9 12 4l8 5" />
      <path d="M6 9v10M18 9v10M5 19h14" />
      {/* columns */}
      <path d="M10 9v10M14 9v10" />
    </IconBase>
  );
}

/** Sparkle — a four-point star with a companion (FAQ / highlights / rush is on). */
export function IconSparkle({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5c.7 3.6 1.9 4.8 5.5 5.5-3.6.7-4.8 1.9-5.5 5.5-.7-3.6-1.9-4.8-5.5-5.5 3.6-.7 4.8-1.9 5.5-5.5Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M12 3.5c.7 3.6 1.9 4.8 5.5 5.5-3.6.7-4.8 1.9-5.5 5.5-.7-3.6-1.9-4.8-5.5-5.5 3.6-.7 4.8-1.9 5.5-5.5Z" />
      <path d="M17.5 15c.3 1.4.8 1.9 2.2 2.2-1.4.3-1.9.8-2.2 2.2-.3-1.4-.8-1.9-2.2-2.2 1.4-.3 1.9-.8 2.2-2.2Z" />
    </IconBase>
  );
}

/** Shield-check — a guardian shield with a check (anti-hazing / trust / verified). */
export function IconShieldCheck({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9 11.5l2 2 4-4.5" />
    </IconBase>
  );
}

/** Bolt — a lightning bolt with an accent glow (fast reply / responsive). */
export function IconBolt({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12.5 3 5 13h5l-1.5 8L17 11h-5l.5-8Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M12.5 3 5 13h5l-1.5 8L17 11h-5l.5-8Z" />
    </IconBase>
  );
}

/** Crown — a leadership crown (e-board / member of the month). */
export function IconCrown({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8l3.5 3L12 5.5 16.5 11 20 8l-1.5 9h-13L4 8Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M4 8l3.5 3L12 5.5 16.5 11 20 8l-1.5 9h-13L4 8Z" />
      <path d="M5.5 19.5h13" />
    </IconBase>
  );
}

/** User — a single person glyph (full name field). */
export function IconUser({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.4" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20v-1A4.5 4.5 0 0 1 10 14.5h4a4.5 4.5 0 0 1 4.5 4.5v1" />
    </IconBase>
  );
}

/** Book — a single book (major field). */
export function IconBook({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4h11a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 0 5 20.5V5.5A1.5 1.5 0 0 1 6.5 4Z" fill={accent} opacity={0.12} stroke="none" />
      <path d="M6.5 4H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 0 5 19.5V5.5A1.5 1.5 0 0 1 6.5 4Z" />
      <path d="M5 16.5h13" />
    </IconBase>
  );
}

/** Cap — a graduation cap (year / class standing). */
export function IconGradCap({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 9 12 5l9.5 4L12 13 2.5 9Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M2.5 9 12 5l9.5 4L12 13 2.5 9Z" />
      <path d="M6 10.5V15c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-4.5" />
      <path d="M21.5 9v4" />
    </IconBase>
  );
}

/** Camera — a camera glyph with an accent lens (headshot step). */
export function IconCamera({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="7" width="18" height="12" rx="2.5" fill={accent} opacity={0.12} stroke="none" />
      <rect x="3" y="7" width="18" height="12" rx="2.5" />
      <path d="M8.5 7l1.2-2h4.6L15.5 7" />
      <circle cx="12" cy="13" r="3.2" />
    </IconBase>
  );
}

/** Send — a paper plane (submit / share). */
export function IconSend({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 4 3.5 11l6 2.2L20 4Z" fill={accent} opacity={0.16} stroke="none" />
      <path d="M20 4 3.5 11l6 2.2L11.8 20 20 4Z" />
      <path d="M9.5 13.2 20 4" />
    </IconBase>
  );
}

/** Check-circle — a filled-accent circle with a check (success / live validation). */
export function IconCheckCircle({ accent = CHAPTER_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" fill={accent} opacity={0.16} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.2l2.5 2.5L16 9" />
    </IconBase>
  );
}
