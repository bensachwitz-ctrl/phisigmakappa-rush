import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ILLUSTRATION SYSTEM — shared foundation
 * ────────────────────────────────────────────────────────────────────────────
 *
 * A bespoke set of on-brand SPOT ILLUSTRATIONS drawn to sit at the top of empty
 * states, success moments, and other "there's nothing here yet" surfaces. They
 * are the richer cousin of the icon set (see ../icons/icon-base.tsx): where an
 * icon is a single glyph, an illustration is a small, balanced SCENE — a roster
 * of member cards, a calendar with a pinned event, a celebration burst — so a
 * blank tab reads as friendly and finished instead of bare icon-and-text.
 *
 * DESIGN LANGUAGE (every illustration in this folder obeys it):
 *   • 160×140 artboard, optically centered, generous interior margin so the
 *     scene reads cleanly when rendered ~120–160px wide.
 *   • Duotone, exactly like the icon set: the PRIMARY line is
 *     `stroke="currentColor"`, so the whole illustration RE-THEMES per tenant —
 *     set the surrounding text color (e.g. the chapter brand on an admin card,
 *     maroon in the member portal) and the linework follows with zero wiring.
 *   • A SECONDARY soft "accent" fill sits behind the linework to give the scene
 *     warmth and depth. It defaults to the live brand primary
 *     (`hsl(var(--primary) / α)`) and is always low-opacity so it supports the
 *     line rather than fighting it. Pass `accent` to override per call, or just
 *     re-theme via `--primary` / the surrounding `currentColor`.
 *   • ~2px stroke, round caps + joins, matching the icon set's soft modern feel.
 *   • A subtle Greek motif (a column, a pediment, a laurel, a key-fret) is woven
 *     in where it reads at size — made-for-Greek-life, never fussy.
 *   • DECORATIVE by default: `aria-hidden` so screen readers skip straight to
 *     the headline + CTA that always accompany the art. Reduced-motion-safe:
 *     nothing here REQUIRES motion; any sparkle is opacity/transform only and is
 *     collapsed by the global prefers-reduced-motion block in globals.css.
 *
 * USAGE
 *   import { IllustrationRoster } from "@/components/brand/illustrations/roster";
 *   <IllustrationRoster className="text-phisig-red" />       // admin: tenant brand
 *   <IllustrationCalendar className="text-maroon-700" />     // portal: maroon
 *   <IllustrationSearch size={120} accent="hsl(var(--primary) / 0.18)" />
 *
 * SIZING: `size` sets width/height attributes (kept on the 160×140 ratio via the
 * viewBox), but a Tailwind `h-* / w-*` in `className` overrides them, so these
 * are drop-in and responsive. Default ~144px wide.
 */

export interface IllustrationProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  /** Pixel width; height follows the 160×140 viewBox ratio. A Tailwind `w-*`/`h-*` class overrides this. Default 144. */
  size?: number | string;
  /**
   * Colour of the soft secondary "accent" fill. Defaults to `currentColor` so
   * the fill tracks the SAME tenant colour as the linework (it's softened via
   * the ACCENT/ACCENT_STRONG opacity tokens below, not by baking opacity into
   * the colour) — set the surrounding text colour and the whole scene re-themes.
   * Pass a concrete colour (e.g. a maroon, or `hsl(var(--primary))`) to override.
   */
  accent?: string;
}

/**
 * Default accent fill colour — `currentColor`, so the soft fill follows the same
 * tenant colour as the linework. Softness comes from the opacity tokens below,
 * applied as `fillOpacity`, so re-theming is a single text-colour change.
 */
export const ILLUSTRATION_ACCENT = "currentColor";
/** Opacity for soft background accent fills (the "wash" behind the linework). */
export const ACCENT_OPACITY = 0.14;
/** Opacity for the focal accent element of a scene (the hero shape). */
export const ACCENT_OPACITY_STRONG = 0.26;

/**
 * Shared chrome for every Greekstack illustration: a 160×140 viewBox, `fill="none"`,
 * round caps/joins, `aria-hidden` by default, and a merged className. Individual
 * illustrations supply only their scene geometry as children and pass the resolved
 * `accent` colour into their soft-fill layers.
 *
 * Author illustrations like:
 *   export function IllustrationThing({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
 *     return (
 *       <IllustrationBase {...props}>
 *         <rect … fill={accent} stroke="none" />   // soft accent layer
 *         <path … />                               // currentColor linework
 *       </IllustrationBase>
 *     );
 *   }
 */
export const IllustrationBase = React.forwardRef<SVGSVGElement, IllustrationProps>(
  function IllustrationBase({ size = 144, className, children, accent: _accent, ...props }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 160 140"
        width={size}
        height={typeof size === "number" ? Math.round((size as number) * (140 / 160)) : undefined}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-label"] ? undefined : true}
        className={cn("shrink-0", className)}
        {...props}
      >
        {children}
      </svg>
    );
  },
);

/**
 * Shared "ground" the scene can sit on: a soft accent ellipse + a hairline
 * baseline that grounds the objects and gives every illustration a consistent
 * footing. Optional — call inside an illustration before its objects.
 */
export function IllustrationGround({ accent }: { accent: string }) {
  return (
    <>
      <ellipse cx="80" cy="120" rx="58" ry="9" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <path d="M28 120h104" strokeOpacity={0.18} />
    </>
  );
}
