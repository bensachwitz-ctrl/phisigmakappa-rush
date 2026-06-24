import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GREEKSTACK BRAND MARK — the canonical platform glyph, rendered inline.
 * ------------------------------------------------------------------
 * The mark is the ELEVATED CLASSICAL TEMPLE: a pediment over four columns WITH
 * capitals + bases, a gold cornice + medallion (oculus) + architrave, a stepped
 * stylobate, and a gold floor line. It is the SAME geometry the product ships
 * everywhere — the favicon / web icon (app/icon.png, app/apple-icon.png), the
 * maskable PWA icon (app/maskable-icon/route.tsx), the native iOS/Android app
 * icon (scripts/gen-*-assets.mjs rasterize brand/greekstack-seal.svg), and the
 * mobile-shell crest (mobile-shell/index.html CREST_SVG). The single normalized
 * source of truth for the path data is brand/greekstack-seal.svg — every surface
 * paints the one canonical vector, so the brand can never drift.
 *
 * This was elevated out of "generic AI slop" (flat-rectangle columns on a muddy
 * cream raster) into a crafted, premium VECTOR: the capitals + bases are the
 * single biggest craft tell, and the restrained gold accents read as warm,
 * "Greek-life" premium without shouting.
 *
 * TWO presentations, ONE geometry:
 *   • LIGHT (default) — ivory tile #F7F5EE (hairline border #E2DCCB), navy
 *     temple #16264E, gold accents #C8901C. The in-app / header / wordmark mark.
 *   • DARK / navy seal — deep-navy tile #0B1B3A, ivory temple #F4F1E6, gold
 *     accents #E8B53A. Matches the iOS home-screen AppIcon.
 *
 * It is drawn as a SELF-CONTAINED inline <svg> (no PNG, no Satori, no network
 * fetch), pixel-crisp at any size, on a 100-unit viewBox identical to the seal
 * source so the rendered mark is byte-for-byte the same shape as the icon set.
 *
 * `GreekstackLogo` renders at a square box driven purely by the height/width
 * utility classes (defaults to h-8 w-8), so there is ZERO layout shift.
 * `alt`/`aria-label` semantics are preserved via `title`.
 *
 * The exported surface — names, props, and signatures (`GreekstackLogo`,
 * `GreekstackWordmark`) — is UNCHANGED, so every existing consumer keeps working
 * without edits. The legacy `variant` ("tile" | "mono") values still map to the
 * default LIGHT tile; the new "dark"/"seal" values select the navy seal.
 */

/** Legacy variants ("tile" | "mono") + the navy-seal selectors ("dark" | "seal"). */
type LogoVariant = "tile" | "mono" | "dark" | "seal" | "light";

/** LIGHT tile palette (default) — the canonical in-app/header presentation. */
const LIGHT = {
  tile: "#F7F5EE",
  border: "#E2DCCB",
  temple: "#16264E",
  gold: "#C8901C",
} as const;

/** DARK navy-seal palette — matches the iOS home-screen AppIcon. */
const DARK = {
  tile: "#0B1B3A",
  border: "transparent",
  temple: "#F4F1E6",
  gold: "#E8B53A",
} as const;

/**
 * The canonical temple geometry on the 100-unit grid (identical to
 * brand/greekstack-seal.svg). Columns at shaft-x 23/39/55/71 (shaft w6;
 * capitals + bases w9 centered on the shaft).
 */
function TempleMark({ temple, gold }: { temple: string; gold: string }) {
  return (
    <>
      {/* ivory/navy temple group */}
      <g fill={temple}>
        {/* pediment */}
        <path d="M16 44 L50 22 L84 44 Z" />
        {/* entablature */}
        <rect x="14" y="46.5" width="72" height="5" rx="1" />
        {/* four columns — capital + shaft + base */}
        <rect x="21.5" y="52.5" width="9" height="2.2" rx="0.6" />
        <rect x="23" y="54.7" width="6" height="15" />
        <rect x="21.5" y="69.7" width="9" height="2.3" rx="0.6" />
        <rect x="37.5" y="52.5" width="9" height="2.2" rx="0.6" />
        <rect x="39" y="54.7" width="6" height="15" />
        <rect x="37.5" y="69.7" width="9" height="2.3" rx="0.6" />
        <rect x="53.5" y="52.5" width="9" height="2.2" rx="0.6" />
        <rect x="55" y="54.7" width="6" height="15" />
        <rect x="53.5" y="69.7" width="9" height="2.3" rx="0.6" />
        <rect x="69.5" y="52.5" width="9" height="2.2" rx="0.6" />
        <rect x="71" y="54.7" width="6" height="15" />
        <rect x="69.5" y="69.7" width="9" height="2.3" rx="0.6" />
        {/* stepped stylobate (2 steps) */}
        <rect x="18" y="72.5" width="64" height="3.2" rx="0.8" />
        <rect x="13" y="76.2" width="74" height="3.4" rx="0.8" />
      </g>
      {/* restrained gold accents */}
      <g fill={gold}>
        {/* gold cornice under the pediment */}
        <rect x="14" y="43.4" width="72" height="2" rx="1" />
        {/* gold medallion (oculus) in the tympanum */}
        <circle cx="50" cy="36" r="3" />
        {/* gold architrave line on the entablature */}
        <rect x="16" y="51" width="68" height="1" />
        {/* gold floor line under the stylobate */}
        <rect x="13" y="79.9" width="74" height="1.1" />
      </g>
    </>
  );
}

export function GreekstackLogo({
  className,
  title = "Greekstack",
  variant = "light",
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
  const dark = variant === "dark" || variant === "seal";
  const c = dark ? DARK : LIGHT;
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn("inline-block", className || "h-8 w-8")}
      {...rest}
    >
      {/* rounded tile — the brand field (full bleed; corners read clean) */}
      <rect x="0" y="0" width="100" height="100" rx="22" fill={c.tile} />
      {!dark && (
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="21"
          fill="none"
          stroke={c.border}
          strokeWidth="1"
        />
      )}
      <TempleMark temple={c.temple} gold={c.gold} />
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
