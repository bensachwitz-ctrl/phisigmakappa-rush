import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICON SYSTEM — shared foundation
 * ────────────────────────────────────────────────────────────────────────────
 *
 * A bespoke, cohesive duotone icon set drawn specifically for Greekstack so the
 * product stops borrowing a generic icon font and feels custom end-to-end.
 *
 * DESIGN LANGUAGE (every icon in this folder obeys it):
 *   • 24×24 grid, geometric + confident, optically balanced (≈20px live area
 *     with a 2px breathing margin) so they read cleanly at 16–24px.
 *   • The PRIMARY line is `stroke="currentColor"` — it inherits the surrounding
 *     text color, so icons theme automatically (brand primary, muted, white on
 *     a gradient chip, etc.) with zero per-call wiring.
 *   • A SECONDARY "accent" layer (a soft fill or a second stroke) sits behind /
 *     beside the primary line in the brand accent. It defaults to
 *     `var(--gs-accent, #38bdf8)` (Greekstack sky) and is always rendered at a
 *     low opacity so it never fights the primary line — this two-tone read is
 *     what makes the set feel premium. Pass `accent` to override per-icon, or
 *     set `--gs-accent` globally to retint the whole set.
 *   • ~1.75px stroke, round caps + joins everywhere for a soft, modern feel.
 *   • A subtle Greek motif (a column, a pediment, a laurel sprig, a Greek-key
 *     corner, or a geometric letter accent) is woven in where it reads at small
 *     sizes — enough to feel made-for-Greek-life, never fussy.
 *
 * BRAND PALETTE the set is tuned for:
 *   royal blue #2563eb (primary)  ·  sky #38bdf8 (secondary/accent)  ·  gold #f59e0b (accent-alt)
 *
 * USAGE
 *   <IconRecruitment />                      // inherits text color + default sky accent
 *   <IconDues className="h-5 w-5 text-primary" />   // Tailwind sizing/colour win
 *   <IconEvents size={20} accent="#f59e0b" />        // gold accent
 *
 * SIZING: `size` sets the SVG width/height attributes, but a Tailwind `h-* / w-*`
 * in `className` overrides them (utility classes beat presentation attributes),
 * so these are true drop-in replacements for the lucide call-sites that size via
 * className. `aria-hidden` defaults to true (decorative); pass `aria-label` +
 * `aria-hidden={false}` (or `role="img"`) when an icon must be announced.
 */

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  /** Pixel size for width & height. A Tailwind `h-* / w-*` class overrides this. Default 24. */
  size?: number | string;
  /** Stroke width on the 24px grid. Default 1.75. */
  strokeWidth?: number;
  /**
   * Colour of the secondary duotone layer. Defaults to the Greekstack sky accent
   * via a themeable CSS var so the whole set can be retinted from one place.
   */
  accent?: string;
}

/** Default accent — Greekstack sky (#38bdf8), themeable via the `--gs-accent` CSS var. */
export const GS_ACCENT = "var(--gs-accent, #38bdf8)";

/**
 * Shared chrome for every Greekstack icon: fixed 24×24 viewBox, `fill="none"`,
 * round caps/joins, sensible stroke defaults, `aria-hidden` by default, and a
 * merged className. Individual icons only supply their geometry as children and
 * pass the resolved `accent` colour down to their secondary layer.
 *
 * Author icons like:
 *   export function IconThing({ accent = GS_ACCENT, ...props }: IconProps) {
 *     return (
 *       <IconBase {...props}>
 *         <path d="…" fill={accent} opacity={0.18} stroke="none" />   // accent layer
 *         <path d="…" />                                              // primary line
 *       </IconBase>
 *     );
 *   }
 */
export const IconBase = React.forwardRef<SVGSVGElement, IconProps>(function IconBase(
  { size = 24, strokeWidth = 1.75, className, children, accent: _accent, ...props },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn("shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
});
