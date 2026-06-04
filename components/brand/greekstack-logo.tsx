import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GREEKSTACK BRAND MARK — "The Keystone Stack"
 * ------------------------------------------------------------------
 * A custom, ownable monogram that fuses GREEK LIFE + PLATFORM STACK:
 *
 *   • a Greek temple PEDIMENT (gable roof) crowned by a GOLD KEYSTONE
 *     at the apex — the single load-bearing wedge that holds an arch /
 *     a chapter together;
 *   • a column built as a literal STACK of three descending tiers
 *     (a "stack" of platform layers), each a notch narrower so the eye
 *     reads upward momentum;
 *   • a plinth carved with a GREEK-KEY (meander) step — the unmistakable
 *     classical motif — grounding the whole mark.
 *
 * Geometry is drawn on a 40×40 grid, symmetric about x=20, with generous
 * corner radii so it stays crisp and legible from 20px → 48px and beyond.
 * Royal-blue → sky gradient body + a warm gold keystone accent.
 *
 * Variants:
 *   • "tile"  (default) — mark sits in a rounded-square gradient chip with a
 *     hairline ring. Best on the marketing site, app icon, favicon, and any
 *     light/dark background where the mark needs its own field.
 *   • "mono"  — the bare glyph in `currentColor` (no chip, no gradient). For
 *     footers, dense toolbars, print, or anywhere a single-color mark reads
 *     better. Inherits text color; the keystone is differentiated by opacity.
 *
 * Accessible (role="img" + <title>), self-contained inline SVG (no external
 * asset), and reduced-motion-safe (the SVG itself does not animate; any motion
 * is applied by the consumer to a wrapping element).
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
  const mono = variant === "mono";

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
        <linearGradient id={bodyGrad} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#2563EB" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id={keyGrad} x1="13" y1="6" x2="27" y2="15" gradientUnits="userSpaceOnUse">
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
          THE GLYPH
          On the tile, the glyph is white with a gold keystone.
          In mono, the glyph is the current text color and the keystone
          is differentiated purely by opacity (single-ink safe).
          Symmetric about x=20.
         ============================================================ */}
      {(() => {
        const ink = mono ? "currentColor" : "#FFFFFF";
        const keyFill = mono ? "currentColor" : `url(#${keyGrad})`;
        const keyOpacity = mono ? 0.55 : 1;
        // For mono, scale the glyph up slightly to fill the absent chip padding.
        const gt = mono ? "translate(20 20) scale(1.16) translate(-20 -20)" : undefined;
        return (
          <g transform={gt}>
            {/* PEDIMENT — temple gable. An open chevron (stroke) reads as a
                roofline, not a solid triangle. The apex dips to y=10.0 to cradle
                the keystone so the two pieces lock into one form. */}
            <path
              d="M9.4 16.4 L20 10.0 L30.6 16.4"
              fill="none"
              stroke={ink}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* GOLD KEYSTONE — a true architectural wedge (trapezoid, wider at
                top) seated into the apex of the gable. The single load-bearing
                stone that holds the arch — i.e. the chapter — together. */}
            <path
              d="M16.5 6.0 L23.5 6.0 L21.7 11.6 L18.3 11.6 Z"
              fill={keyFill}
              fillOpacity={keyOpacity}
              stroke={mono ? "none" : "#FFFFFF"}
              strokeOpacity={mono ? 0 : 0.18}
              strokeWidth="0.5"
              strokeLinejoin="round"
            />

            {/* COLUMN AS A STACK — three descending tiers (platform layers).
                Each tier narrows toward the top → upward momentum + a real
                "stack". Tiers share one centerline (x=20). */}
            <g fill={ink}>
              <rect x="13.6" y="18.4" width="12.8" height="3.7" rx="1.5" />
              <rect x="14.9" y="23.1" width="10.2" height="3.7" rx="1.5" opacity="0.82" />
              <rect x="16.2" y="27.8" width="7.6" height="3.7" rx="1.5" opacity="0.66" />
            </g>

            {/* PLINTH with a carved GREEK-KEY (meander) step. A clean foundation
                bar with two meander notches cut from it — the unmistakable
                classical motif, legible even at 20px. */}
            <g fill={ink}>
              <rect x="9.0" y="32.6" width="22" height="3.1" rx="1.4" />
              {/* meander notches (cut as background-colored steps on the tile;
                  on mono they'd be invisible, so we skip them there and let the
                  solid plinth carry the base). */}
              {!mono && (
                <g fill={`url(#${bodyGrad})`}>
                  <rect x="13.1" y="33.4" width="2.0" height="1.5" rx="0.4" />
                  <rect x="19.0" y="32.6" width="2.0" height="1.6" rx="0.4" />
                  <rect x="24.9" y="33.4" width="2.0" height="1.5" rx="0.4" />
                </g>
              )}
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
 * so the name itself encodes the brand split. Tight, confident tracking.
 *
 * Props:
 *   • size       — preset that scales BOTH the mark and the type together so
 *                  the lockup stays optically balanced at any scale.
 *   • variant    — "default" (gradient "stack") | "mono" (single-ink, footer-safe).
 *   • className   — wrapper overrides.
 *   • markClassName / textClassName — escape hatches for fine control.
 */
const SIZE_MAP = {
  sm: { mark: "h-7 w-7", text: "text-base", gap: "gap-2" },
  md: { mark: "h-8 w-8", text: "text-xl", gap: "gap-2.5" },
  lg: { mark: "h-10 w-10", text: "text-2xl", gap: "gap-3" },
  xl: { mark: "h-12 w-12", text: "text-3xl", gap: "gap-3" },
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
          "font-bold tracking-tight leading-none",
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
