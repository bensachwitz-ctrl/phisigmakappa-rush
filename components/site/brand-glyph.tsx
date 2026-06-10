"use client";

/**
 * BrandGlyph — Greekstack's bespoke, cohesive icon system.
 *
 * Replaces the prior AI-generated `/brand/gen/*.png` tiles, which (a) baked a
 * dark navy box into the raster (the "black box" artifact) and (b) read as
 * generic AI-slop. These are hand-authored, single-stroke SVG glyphs on a 24×24
 * grid, painted in the platform brand gradient inside a soft, frosted, rounded
 * tile — transparent by construction (no box artifact possible), pixel-crisp at
 * any size, and unmistakably one deliberate family.
 *
 * Every concept the old `name`/`img` props referenced maps here, so call-sites
 * change only the import, not the keys. Decorative by default (aria-hidden).
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/** Canonical concept keys + legacy aliases (the old PNG stems) → one glyph each. */
export type BrandGlyphName =
  | "recruitment"
  | "dues"
  | "treasury"
  | "events"
  | "portal"
  | "officers"
  | "announcements"
  | "branding"
  | "alumni"
  | "letters"
  | "brotherhood"
  | "bid"
  | "trophy"
  | "gavel"
  | "ballot"
  | "chat"
  | "network"
  | "shield"
  | "checkin"
  // legacy PNG stems (kept so call-sites can pass the old names unchanged)
  | "feat-recruitment"
  | "feat-dues"
  | "feat-treasury"
  | "feat-events"
  | "feat-portal"
  | "feat-officers"
  | "feat-announcements"
  | "feat-branding"
  | "feat-alumni"
  | "gl-letters"
  | "gl-brotherhood"
  | "gl-bid"
  | "gl-trophy"
  | "gl-gavel"
  | "gl-ballot"
  | "icon-chat"
  | "icon-dues"
  | "icon-events"
  | "icon-network"
  | "icon-recruitment"
  | "icon-shield";

function normalize(name: string): keyof typeof PATHS {
  const k = name.replace(/^(feat-|gl-|icon-)/, "");
  return (k in PATHS ? k : "letters") as keyof typeof PATHS;
}

/**
 * Path geometry per concept. Each entry returns the inner SVG (drawn on a 24×24
 * viewBox) so a single <svg> wrapper sets stroke/fill once. Strokes use
 * currentColor; a couple of glyphs add a soft accent fill at low opacity.
 */
const PATHS: Record<string, React.ReactNode> = {
  // Recruitment — person + plus (grow the chapter)
  recruitment: (
    <>
      <circle cx="9.5" cy="8" r="3.2" />
      <path d="M4 19.5c0-3 2.6-5 5.5-5s5.5 2 5.5 5" />
      <path d="M18.5 7v6M15.5 10h6" />
    </>
  ),
  // Dues — card with a check (paid)
  dues: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 14.5l2 2 3.5-3.8" />
    </>
  ),
  // Treasury — coin stack / growth bars
  treasury: (
    <>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.5" />
      <path d="M5.5 6.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5" />
      <path d="M5.5 11.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5" />
    </>
  ),
  // Events — calendar with a star
  events: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      <path d="M12 12l1 2.1 2.3.2-1.7 1.5.5 2.2L12 18.4l-2.1 1.2.5-2.2L8.7 16l2.3-.2z" />
    </>
  ),
  // Portal — secure window / login frame
  portal: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M3.5 8h17" />
      <circle cx="12" cy="14" r="2.4" />
      <path d="M12 16.4V18" />
    </>
  ),
  // Officers — laurel / leadership crown
  officers: (
    <>
      <path d="M4 8l3.5 3 4.5-6 4.5 6 3.5-3-1.6 9.5H5.6z" />
      <path d="M5.6 17.5h12.8" />
    </>
  ),
  // Announcements — megaphone
  announcements: (
    <>
      <path d="M4 10v4l2 .5 1.5 4h2L8 14.5l9 3.5V6L8 9.5H6a2 2 0 0 0-2 2z" />
      <path d="M17 9.5a3.5 3.5 0 0 1 0 5" />
    </>
  ),
  // Branding — paint swatch + brush
  branding: (
    <>
      <rect x="3.5" y="3.5" width="11" height="11" rx="2.5" />
      <path d="M14.5 7.5l5 5a2 2 0 0 1 0 2.8l-3.7 3.7a2 2 0 0 1-2.8 0L8 14" />
      <circle cx="7" cy="11" r="1" />
    </>
  ),
  // Alumni — graduation cap + network node
  alumni: (
    <>
      <path d="M12 4L2.5 8.5 12 13l9.5-4.5z" />
      <path d="M6.5 10.5v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
      <path d="M21.5 8.5v4.5" />
    </>
  ),
  // Letters — Greek meander / stacked letters mark
  letters: (
    <>
      <path d="M4 6h16M6 6v12M18 6v12M6 18h5M13 18h5" />
      <path d="M9 10h6M9 14h6" />
    </>
  ),
  // Brotherhood — clasped hands / bond
  brotherhood: (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="16" cy="8" r="2.6" />
      <path d="M3.5 19c0-2.5 2-4.3 4.5-4.3 1.2 0 2.3.4 3 1.1.8-.7 1.9-1.1 3-1.1 2.5 0 4.5 1.8 4.5 4.3" />
    </>
  ),
  // Bid — envelope with a seal (the bid extended)
  bid: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
      <circle cx="17.5" cy="15.5" r="2.4" />
    </>
  ),
  // Trophy — chapter excellence
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.5a2.5 2.5 0 0 0 2.5 4M17 5h2.5a2.5 2.5 0 0 1-2.5 4" />
      <path d="M12 13v3M9 19.5h6M10 16.5h4l.5 3h-5z" />
    </>
  ),
  // Gavel — governance / compliance
  gavel: (
    <>
      <path d="M11.5 4.5l4 4M9.5 6.5l4 4" />
      <path d="M13.5 8.5l-7 7 1.5 1.5 7-7" />
      <path d="M5 20h7" />
    </>
  ),
  // Ballot — anonymous elections
  ballot: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M9 9V5.5L15 4v5" />
      <path d="M9.5 14.5l1.7 1.7 3.3-3.4" />
    </>
  ),
  // Chat — message / group chat
  chat: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5z" />
      <path d="M8.5 8.5h7M8.5 11.5h4" />
    </>
  ),
  // Network — connected directory
  network: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="17.5" r="2.2" />
      <circle cx="19" cy="17.5" r="2.2" />
      <path d="M10.8 6.8L6.2 15.5M13.2 6.8l4.6 8.7M7 17.5h10" />
    </>
  ),
  // Shield — security / data isolation
  shield: (
    <>
      <path d="M12 3.5l7 2.5v5c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6z" />
      <path d="M8.8 11.7l2.2 2.2 4.2-4.4" />
    </>
  ),
  // Check-in — QR / scan
  checkin: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </>
  ),
};

const TILE_SIZE = {
  xs: "h-6 w-6 rounded-lg",
  sm: "h-9 w-9 rounded-xl",
  md: "h-11 w-11 rounded-2xl",
  lg: "h-14 w-14 rounded-2xl",
} as const;

const ICON_SIZE = {
  xs: "h-3.5 w-3.5",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
} as const;

/**
 * A glyph rendered inside a soft frosted brand tile — the standard
 * landing/feature presentation. Drop-in replacement for the old <GlyphTile>.
 */
export function BrandGlyph({
  name,
  size = "md",
  className = "",
  tone = "platform",
}: {
  name: BrandGlyphName | string;
  size?: keyof typeof TILE_SIZE;
  className?: string;
  /** `platform` = blue→sky brand gradient tile (default, marketing). `brand`
   *  inherits currentColor for chapter-tinted contexts. */
  tone?: "platform" | "brand";
}) {
  const key = normalize(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        TILE_SIZE[size],
        tone === "platform"
          ? "bg-gradient-to-br from-blue-500/14 to-sky-400/10 ring-1 ring-inset ring-blue-500/15 text-blue-600"
          : "bg-[color:currentColor]/[0.10] ring-1 ring-inset ring-current/15",
        className,
      )}
    >
      <BrandGlyphIcon name={key} className={ICON_SIZE[size]} />
    </span>
  );
}

/**
 * The bare glyph (no tile) for inline placement where the caller supplies its
 * own container — e.g. the demo's brand-colored gradient launchers.
 */
export function BrandGlyphIcon({
  name,
  className,
}: {
  name: BrandGlyphName | string;
  className?: string;
}) {
  const key = normalize(name);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[key]}
    </svg>
  );
}

export default BrandGlyph;
