import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GREEKSTACK BRAND MARK — "The Stacked G"
 * ------------------------------------------------------------------
 * One confident geometric monogram that fuses the brand initial with the
 * idea of a platform "stack":
 *
 *   • A bold, single-weight ring forms a modern capital "G" — the brand
 *     initial and, as a closed circle, a quiet nod to unity / a chapter.
 *     The ring opens with a clean, flat mouth on the right.
 *   • A GOLD KEYSTONE wedge seats into that mouth as the G's signature
 *     bar — the one warm, load-bearing accent that locks the form shut.
 *   • Two slim arc "plates" descend beneath the ring, each fainter than the
 *     last, so the mark reads as a STACK of layers — i.e. Greek·STACK —
 *     without a single literal column, temple, or meander.
 *
 * Drawn on a 40×40 grid, optically centered, with ONE consistent stroke
 * weight so the geometry stays crisp and unmistakable from 16px → 64px and
 * up. Royal-blue → sky gradient body + a restrained gold keystone. Three
 * colors, no busy detail — Linear / Vercel / Stripe level of restraint.
 *
 * Variants:
 *   • "tile"  (default) — the glyph sits in a rounded-square gradient chip
 *     with a hairline ring + top sheen. Best for the marketing site, app
 *     icon, favicon, and any surface where the mark needs its own field.
 *   • "mono"  — the bare glyph in `currentColor` (no chip, no gradient).
 *     For dense footers, toolbars, print, or anywhere a single ink reads
 *     better. Inherits text color; the three stacked bar layers differentiate
 *     purely by opacity (single-ink safe).
 *
 * Accessible (role="img" + <title>), self-contained inline SVG (no external
 * asset), unique gradient ids per instance (useId) so multiple marks can
 * coexist on one page, and reduced-motion-safe: the SVG itself never
 * animates — any motion is applied by the consumer to the wrapping element
 * (or to the mark's own className), so it honors prefers-reduced-motion at
 * the call site.
 */

type LogoVariant = "tile" | "mono";

export function GreekstackLogo({
  className,
  title = "Greekstack",
  variant = "tile",
  ...rest
}: {
  className?: string;
  title?: string;
  variant?: LogoVariant;
} & Omit<React.SVGProps<SVGSVGElement>, "className" | "title">) {
  // Stable, collision-proof ids so multiple marks can coexist on one page
  // (e.g. header + footer) without sharing/clobbering gradient defs.
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const bodyGrad = `gs-body-${uid}`;
  const keyGrad = `gs-key-${uid}`;
  const sheen = `gs-sheen-${uid}`;
  const ringGrad = `gs-ring-${uid}`;
  const mono = variant === "mono";

  const ink = mono ? "currentColor" : "#FFFFFF";

  return (
    <svg
      className={className || "h-8 w-8"}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={bodyGrad} x1="5" y1="3" x2="35" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#2563EB" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
        {/* On the tile the G is white; on white-chip contexts we still want a
            faint vertical modeling, so the ring uses near-white→white. In mono
            it is overridden to currentColor below. */}
        <linearGradient id={ringGrad} x1="20" y1="6" x2="20" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E8F1FF" />
        </linearGradient>
        <linearGradient id={keyGrad} x1="22" y1="14" x2="33" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ---- Rounded-square brand chip (tile variant only) ---- */}
      {!mono && (
        <>
          <rect x="0" y="0" width="40" height="40" rx="11" fill={`url(#${bodyGrad})`} />
          {/* top-light sheen for a premium, dimensional finish */}
          <rect x="0" y="0" width="40" height="40" rx="11" fill={`url(#${sheen})`} />
          {/* crisp inner hairline so the chip reads on white AND dark */}
          <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10.25" fill="none" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1" />
        </>
      )}

      {/* ============================================================
          THE GLYPH — "The Stacked G"
          Symmetric grid, optically centered at (20, 20.2).
          On the tile the glyph is white with a gold top layer on the bar.
          In mono everything is the current text color, with the stacked bar
          layers set apart purely by opacity (single-ink safe).
         ============================================================ */}
      {(() => {
        // For mono, scale the glyph up slightly to fill the absent chip padding.
        const gt = mono ? "translate(20 20) scale(1.12) translate(-20 -20)" : undefined;
        const ringFill = mono ? "currentColor" : `url(#${ringGrad})`;
        // Top bar layer = the gold "keystone" plate; the two lower layers are ink.
        const topLayer = mono ? "currentColor" : `url(#${keyGrad})`;

        // THE G is a filled annular sector (a thick ring with a flat ~70° mouth
        // on the right), NOT a stroked-dashed circle: a filled path renders
        // identically in every engine — the browser AND Satori (next/og favicon /
        // OG card) — so the brand can never drift between surfaces. Geometry:
        // centered (20,20), outer r=14.1, inner r=8.7 (≡ a 5.4 stroke on r=11.4),
        // mouth half-angle 35°. The outer/inner arcs wind opposite ways so the
        // default nonzero fill leaves the counter hollow (no fillRule needed).
        const G_PATH =
          "M 31.55 28.087 A 14.1 14.1 0 1 1 31.55 11.913 " +
          "L 27.127 15.01 A 8.7 8.7 0 1 0 27.127 24.99 Z";

        // Stacked crossbar — three layered rungs (a literal "stack") seated in
        // the counter, bridging out to the mouth to close the G. Tuned so the
        // top rung lines up with the upper inner arm of the ring.
        const rungX = 19.4; // springs from just inside the counter centerline
        const rungW = 8.0; // reaches out into the mouth
        const rungH = 1.9;
        return (
          <g transform={gt}>
            {/* THE G — one thick ring with a flat mouth on the right. */}
            <path d={G_PATH} fill={ringFill} />

            {/* STACKED CROSSBAR — three rungs = the platform "stack" AND the G's
                bar. Top rung is the warm GOLD keystone layer (the one load-bearing
                accent); the two below descend in ink + opacity so the eye reads a
                neat stack of layers locked into the letterform. Rounded ends keep
                it friendly at small sizes. */}
            <g>
              <rect x={rungX} y="16.2" width={rungW} height={rungH} rx="0.95" fill={topLayer} fillOpacity={mono ? 0.95 : 1} />
              <rect x={rungX} y="19.05" width={rungW} height={rungH} rx="0.95" fill={ink} fillOpacity={mono ? 0.62 : 0.92} />
              <rect x={rungX} y="21.9" width={rungW} height={rungH} rx="0.95" fill={ink} fillOpacity={mono ? 0.42 : 0.7} />
            </g>
          </g>
        );
      })()}
    </svg>
  );
}

/**
 * GREEKSTACK WORDMARK LOCKUP — the mark + "Greekstack".
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
      <GreekstackLogo
        variant={mono ? "mono" : "tile"}
        title={title}
        className={markClassName || s.mark}
      />
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
