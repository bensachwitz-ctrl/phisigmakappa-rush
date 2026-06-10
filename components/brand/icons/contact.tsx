import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Apex sales / contact + legal-chrome set
 * ────────────────────────────────────────────────────────────────────────────
 * The bespoke duotone glyphs the PUBLIC/apex surfaces lean on — the /contact
 * sales page + its forms, and the /terms + /privacy legal chrome + the public
 * nav. These replace the last lucide-react call-sites on those pages so the
 * platform reads custom end-to-end.
 *
 * Every icon obeys the shared language defined in ./icon-base.tsx:
 *   • 24×24 grid, ~1.75px round-cap/round-join primary line in `currentColor`;
 *   • a soft SECONDARY accent layer (a low-opacity fill, or a wider 3.5px under-
 *     stroke for thin marks) in `var(--gs-accent)` so the two-tone read stays
 *     cohesive with the rest of the set;
 *   • `aria-hidden` by default (decorative) — pass `aria-label` to announce.
 *
 * These are imported DIRECTLY (not re-exported through ./index.ts) so the public
 * barrel stays a stable contract:
 *   import { IconMail, IconSend } from "@/components/brand/icons/contact";
 */

/** ArrowLeft — a back arrow; the head carries a faint accent fill (mirror of IconArrowRight). */
export function IconArrowLeft({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 6.5L4.5 12l5.5 5.5" fill={accent} opacity={0.16} />
      <path d="M20 12H4.5M10 6.5L4.5 12l5.5 5.5" />
    </IconBase>
  );
}

/** Mail — a sealed envelope with an accent body + a confident flap crease. */
export function IconMail({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: envelope body */}
      <rect x="3" y="5.5" width="18" height="13" rx="2.4" fill={accent} opacity={0.16} stroke="none" />
      <rect x="3" y="5.5" width="18" height="13" rx="2.4" />
      {/* flap crease — the letter folds into the seal */}
      <path d="M3.6 7L12 13l8.4-6" />
    </IconBase>
  );
}

/** Phone — a handset with a soft accent fill + a small signal tick (call us). */
export function IconPhone({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: handset body */}
      <path
        d="M6.5 3.5h2.6l1.4 4-2 1.4a12 12 0 0 0 5.2 5.2l1.4-2 4 1.4v2.6a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      <path d="M6.5 3.5h2.6l1.4 4-2 1.4a12 12 0 0 0 5.2 5.2l1.4-2 4 1.4v2.6a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </IconBase>
  );
}

/** Calendar — a date grid with a clock hand on the live cell (book a 15-min call). */
export function IconCalendar({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: header band */}
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V7Z" fill={accent} opacity={0.18} stroke="none" />
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
      {/* clock hands on the live date cell — the "15 minutes" cue */}
      <circle cx="14" cy="15" r="3" fill={accent} opacity={0.16} stroke="none" />
      <path d="M14 13.4V15l1.1.8" />
    </IconBase>
  );
}

/** Message — a speech bubble with an accent fill + three dots (talk to sales). */
export function IconMessage({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: bubble */}
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3.5V16H6a2 2 0 0 1-2-2V6Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3.5V16H6a2 2 0 0 1-2-2V6Z" />
      {/* conversation dots */}
      <circle cx="9" cy="10" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Bolt — a lightning strike with an accent glow (fast, personal replies). */
export function IconBolt({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: glow */}
      <path d="M13 2.5L4.5 13.5H11l-1 8L19.5 10H13l0-7.5Z" fill={accent} opacity={0.18} stroke="none" />
      <path d="M13 2.5L4.5 13.5H11l-1 8L19.5 10H13l0-7.5Z" />
    </IconBase>
  );
}

/** Send — a paper plane lifting off, accent trail behind (submit a message). */
export function IconSend({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the body of the plane */}
      <path d="M20.5 3.5L3 10.5l6.5 2.2L20.5 3.5Z" fill={accent} opacity={0.18} stroke="none" />
      {/* plane outline + fold */}
      <path d="M20.5 3.5L3 10.5l6.5 2.2L12 20l2.2-6.3L20.5 3.5Z" />
      <path d="M9.5 12.7L20.5 3.5" />
    </IconBase>
  );
}

/**
 * Spinner — a ring with a bright accent arc; the SVG itself does not animate.
 * Add `className="animate-spin"` at the call-site (it collapses under
 * prefers-reduced-motion via globals.css), so it's a drop-in for Loader2.
 */
export function IconSpinner({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* faint full track */}
      <circle cx="12" cy="12" r="8.5" stroke={accent} opacity={0.25} />
      {/* the moving head — a confident quarter-plus arc in the current color */}
      <path d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5" />
    </IconBase>
  );
}

/** Alert — a rounded triangle with an accent fill + a bang (form error banner). */
export function IconAlert({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: triangle */}
      <path
        d="M12 4.2c.6 0 1.1.3 1.4.8l7 11.6c.6 1-.1 2.4-1.4 2.4H5c-1.3 0-2-1.4-1.4-2.4l7-11.6c.3-.5.8-.8 1.4-.8Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      <path d="M12 4.2c.6 0 1.1.3 1.4.8l7 11.6c.6 1-.1 2.4-1.4 2.4H5c-1.3 0-2-1.4-1.4-2.4l7-11.6c.3-.5.8-.8 1.4-.8Z" />
      {/* the bang */}
      <path d="M12 9.5v4" />
      <circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Scale — balanced scales of justice on a base (Terms of Service). */
export function IconScale({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the two pans */}
      <path d="M3 9.5l2.5 5h-5L3 9.5ZM18.5 9.5L21 14.5h-5l2.5-5Z" fill={accent} opacity={0.18} stroke="none" />
      {/* central beam + post */}
      <path d="M12 4v16M6 20h12M12 6.5l6.5 3M12 6.5L5.5 9.5" />
      {/* the pans (arms of the scale) */}
      <path d="M3 9.5l2.5 5h-5L3 9.5ZM18.5 9.5L21 14.5h-5l2.5-5Z" />
      {/* fulcrum knob */}
      <circle cx="12" cy="5" r="1.1" fill={accent} stroke="none" />
    </IconBase>
  );
}

/** Lock — a padlock with an accent body + keyhole (member portal sign-in). */
export function IconLock({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: lock body */}
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill={accent} opacity={0.16} stroke="none" />
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
      {/* shackle */}
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      {/* keyhole */}
      <circle cx="12" cy="14.6" r="1.2" />
      <path d="M12 15.7V17.4" />
    </IconBase>
  );
}

/** Lifebuoy — a ring buoy with an accent hub + four spokes (support / help). */
export function IconLifebuoy({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the buoy ring */}
      <circle cx="12" cy="12" r="9" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      {/* inner ring — the swimmer's grip */}
      <circle cx="12" cy="12" r="3.6" />
      {/* four rope spokes joining hub to ring */}
      <path d="M4.6 7.4l4.2 2.9M19.4 7.4l-4.2 2.9M4.6 16.6l4.2-2.9M19.4 16.6l-4.2-2.9" />
    </IconBase>
  );
}

/** Book — an open help guide/manual with an accent page + a center spine (FAQ / docs). */
export function IconBook({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the left page fill */}
      <path d="M12 6.5C10.4 5.4 8 5 6 5a16 16 0 0 0-2 .2V18c.7-.1 1.4-.2 2-.2 2 0 4.4.4 6 1.5V6.5Z" fill={accent} opacity={0.16} stroke="none" />
      {/* both pages of the open book */}
      <path d="M12 6.5C10.4 5.4 8 5 6 5a16 16 0 0 0-2 .2V18c.7-.1 1.4-.2 2-.2 2 0 4.4.4 6 1.5 1.6-1.1 4-1.5 6-1.5.6 0 1.3.1 2 .2V5.2A16 16 0 0 0 18 5c-2 0-4.4.4-6 1.5Z" />
      {/* center spine — the live "open guide" cue */}
      <path d="M12 6.5v12.3" />
    </IconBase>
  );
}
