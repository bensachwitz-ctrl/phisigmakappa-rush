import * as React from "react";
import { IconBase, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICON — Unified Chapter Calendar tool
 * ────────────────────────────────────────────────────────────────────────────
 * Bespoke duotone glyph drawn for the /admin/calendar aggregation tool (the
 * unified month + agenda timeline that merges Events + Meetings + the dues
 * deadline). Obeys the shared design language (see ./icon-base.tsx): a
 * `currentColor` primary line plus a soft accent layer with a small motif —
 * here a date-grid stack with three color-able "event" dots that nod to the
 * three aggregation sources the calendar timeline blends together.
 *
 * Like the other CHAPTER-facing glyphs (see ./chapter.tsx), the accent defaults
 * to the live per-tenant primary — `hsl(var(--primary) / 0.55)` — so the
 * decorative layer always reads in the CHAPTER brand, never platform blue. The
 * primary line still inherits `currentColor`, so wrapping in `text-brand-red`
 * (= the chapter primary) keeps both layers on-brand with zero per-call wiring.
 *
 * Server-safe (pure SVG, no "use client"); `aria-hidden` by default. Imported
 * DIRECTLY from this file (NOT the index barrel) so the barrel stays untouched.
 *
 * USAGE
 *   <IconCalendarTool className="h-7 w-7 text-brand-red" />     // both layers brand-tinted
 *   <IconChip icon={IconCalendarTool} tone="brand" size="lg" />  // hosted in the shared chip
 */

/** Chapter-brand accent — the live per-tenant primary at a low, glaze-friendly alpha. */
export const CALENDAR_ACCENT = "hsl(var(--primary) / 0.55)";

/**
 * Calendar — a date grid with a stacked "today" cell and three event dots.
 * The dots echo the three timeline sources (events / meetings / dues) the
 * unified calendar aggregates into one view.
 */
export function IconCalendarTool({ accent = CALENDAR_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the calendar header band */}
      <path d="M3.5 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.5h-17V8Z" fill={accent} opacity={0.18} stroke="none" />
      {/* body + binder rings */}
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.25v3.5M16 3.25v3.5" />
      {/* "today" highlight cell (accent-filled) */}
      <rect x="6" y="12" width="4" height="3.6" rx="1" fill={accent} opacity={0.35} stroke="currentColor" />
      {/* three source dots on the agenda row */}
      <circle cx="14" cy="13.7" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="17" cy="13.7" r="0.85" fill={accent} opacity={0.9} stroke="none" />
      <circle cx="14" cy="17.4" r="0.85" fill={accent} opacity={0.9} stroke="none" />
      <circle cx="17" cy="17.4" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17.4" r="0.85" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
