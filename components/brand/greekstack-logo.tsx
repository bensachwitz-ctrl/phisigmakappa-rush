import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GREEKSTACK BRAND MARK — the canonical platform glyph, rendered inline.
 * ------------------------------------------------------------------
 * The mark is the Greek temple/pediment glyph (pediment + four columns + base)
 * — the SAME geometry the product already ships for its favicon, maskable PWA
 * icon (app/maskable-icon/route.tsx), the native app icon, and the mobile-shell
 * crest (mobile-shell/index.html CREST_SVG) — recolored into the GreekStack
 * brand palette: a ROYAL-BLUE temple seated in a GOLD rounded tile.
 *
 *   • royal-blue ink  #1d4ed8 → #2563eb  (the exact `gs-gradient-text` blues used
 *     for "stack" in the wordmark, app/globals.css)
 *   • gold tile       #FBBF24 → #F59E0B  (--brand-secondary, the platform gold)
 *
 * It is drawn as a SELF-CONTAINED inline <svg> (no PNG, no Satori, no network
 * fetch) so the brand can never drift between the site header, the marketing
 * nav, the mobile client, the login/onboard surfaces, or an OG card — every
 * surface paints the one canonical vector. (The previous version pointed at
 * /brand/greekstack-mark.png, a navy-temple-on-cream tile whose cream field did
 * not match the royal-blue + gold brand; the rendered mark now matches the
 * wordmark, the maskable icon, and the native icon.)
 *
 * `GreekstackLogo` renders the mark at a square box driven purely by the
 * height/width utility classes (defaults to h-8 w-8), so there is ZERO layout
 * shift and no reflow. `alt`/`aria-label` semantics are preserved: decorative
 * (aria-hidden) wherever it sits beside the "Greekstack" wordmark, and exposed
 * to AT via `title` for the rare icon-only placement.
 *
 * The exported surface — names, props, and signatures (`GreekstackLogo`,
 * `GreekstackWordmark`) — is UNCHANGED, so every existing consumer keeps working
 * without edits. `variant` is accepted and ignored for source compatibility.
 */

type LogoVariant = "tile" | "mono";

/** Royal-blue ink (temple) — the gs-gradient "stack" blues. */
const INK = "#1d4ed8";
const INK_DEEP = "#1e3a8a";
/** Gold tile — the platform --brand-secondary ramp. */
const GOLD = "#F59E0B";
const GOLD_LIGHT = "#FBBF24";

export function GreekstackLogo({
  className,
  title = "Greekstack",
  // `variant` is retained for prop-compatibility with prior callers but no
  // longer changes the rendering — the mark is a single canonical glyph.
  variant: _variant,
  loading: _loading,
  ...rest
}: {
  className?: string;
  title?: string;
  variant?: LogoVariant;
  loading?: "eager" | "lazy";
} & Omit<
  React.SVGProps<SVGSVGElement>,
  "className" | "title" | "viewBox" | "fill" | "xmlns"
>) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const tileId = `gs-tile-${uid}`;
  const inkId = `gs-ink-${uid}`;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn("inline-block", className || "h-8 w-8")}
      {...rest}
    >
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={GOLD_LIGHT} />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
        <linearGradient id={inkId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="0.55" stopColor={INK} />
          <stop offset="1" stopColor={INK_DEEP} />
        </linearGradient>
      </defs>
      {/* Gold rounded tile (squircle) — the brand field. */}
      <rect x="0" y="0" width="48" height="48" rx="11" fill={`url(#${tileId})`} />
      {/* Royal-blue temple: pediment + entablature + four columns + stylobate.
          Coordinates are the canonical 0..24 glyph scaled +centered (×1.5, +6px)
          into the 48-box, so it matches the maskable/native/mobile-shell mark. */}
      <g fill={`url(#${inkId})`}>
        {/* pediment */}
        <path d="M9.9 18.9 24 10.8l14.1 8.1H9.9Z" />
        {/* entablature */}
        <rect x="11.1" y="20.1" width="25.8" height="2.55" rx="0.75" />
        {/* four columns */}
        <rect x="12.9" y="23.1" width="2.85" height="9.3" rx="0.6" />
        <rect x="18.6" y="23.1" width="2.85" height="9.3" rx="0.6" />
        <rect x="26.55" y="23.1" width="2.85" height="9.3" rx="0.6" />
        <rect x="32.25" y="23.1" width="2.85" height="9.3" rx="0.6" />
        {/* stylobate / base */}
        <rect x="11.1" y="32.85" width="25.8" height="2.85" rx="0.9" />
      </g>
    </svg>
  );
}

/**
 * GREEKSTACK WORDMARK LOCKUP — the inline mark + "Greekstack".
 *
 * The "Greek" reads in the foreground ink and "stack" in the platform gradient,
 * so the name itself encodes the brand split. Premium, confident tracking with
 * a hair of negative letter-spacing; the mark and type scale together so the
 * lockup stays optically balanced at every size, with mark-to-text spacing tuned
 * per preset.
 *
 * Props (unchanged signature — safe for all existing consumers):
 *   • size       — preset that scales BOTH the mark and the type together.
 *   • variant    — "default" (gradient "stack") | "mono" (single-ink, footer-safe).
 *   • className   — wrapper overrides.
 *   • markClassName / textClassName — escape hatches for fine control.
 */
const SIZE_MAP = {
  sm: { mark: "h-7 w-7", text: "text-base", gap: "gap-2" },
  md: { mark: "h-8 w-8", text: "text-xl", gap: "gap-2.5" },
  lg: { mark: "h-10 w-10", text: "text-2xl", gap: "gap-3" },
  xl: { mark: "h-12 w-12", text: "text-3xl", gap: "gap-3.5" },
} as const;

export function GreekstackWordmark({
  className,
  size = "md",
  variant = "default",
  markClassName,
  textClassName,
  title = "Greekstack",
}: {
  className?: string;
  size?: keyof typeof SIZE_MAP;
  variant?: "default" | "mono";
  markClassName?: string;
  textClassName?: string;
  title?: string;
}) {
  const s = SIZE_MAP[size];
  const mono = variant === "mono";
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <GreekstackLogo title={title} className={markClassName || s.mark} />
      <span
        className={cn(
          // -0.02em tracking + tight leading = a settled, premium wordmark.
          "font-bold leading-none tracking-[-0.02em]",
          textClassName || s.text
        )}
      >
        {mono ? (
          <span>Greekstack</span>
        ) : (
          <>
            <span className="text-foreground">Greek</span>
            <span className="gs-gradient-text">stack</span>
          </>
        )}
      </span>
    </span>
  );
}
