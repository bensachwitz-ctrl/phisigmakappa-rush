import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICON — Big / Little family lineage
 * ────────────────────────────────────────────────────────────────────────────
 * The header glyph for the Family Tree admin tool. Duotone, in the house style:
 * a soft brand-accent fill behind a `currentColor` primary line, ~1.75px round
 * strokes on the 24×24 grid.
 *
 * MOTIF: a three-generation lineage — one "big" node up top, branching down
 * through connector lines to two "little" nodes below. The connectors form the
 * classic family-tree fork; the accent fill behind the top node reads as the
 * founder/ancestor of the line. Legible at 16–24px, unmistakably "lineage".
 *
 *   <IconFamily />                                  // inherits color + sky accent
 *   <IconFamily className="h-6 w-6 text-primary" /> // Tailwind sizing/colour win
 *   <IconFamily accent="#f59e0b" />                 // gold accent
 */
export function IconFamily({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: soft halo behind the founding "big" node up top */}
      <circle cx="12" cy="4.75" r="3.6" fill={accent} opacity={0.16} stroke="none" />

      {/* connectors — the family fork: trunk drops from the big, then a
          horizontal beam splits down to each little. Drawn first so the
          node rings sit cleanly on top of the line ends. */}
      <path d="M12 7.5v3.25" />
      <path d="M6 14.25v-1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />

      {/* the "big" (top generation) */}
      <circle cx="12" cy="4.75" r="2.4" />

      {/* the two "littles" (bottom generation) */}
      <circle cx="6" cy="17.25" r="2.4" />
      <circle cx="18" cy="17.25" r="2.4" />

      {/* accent dots inside each little — the new members of the line */}
      <circle cx="6" cy="17.25" r="0.85" fill={accent} opacity={0.55} stroke="none" />
      <circle cx="18" cy="17.25" r="0.85" fill={accent} opacity={0.55} stroke="none" />
    </IconBase>
  );
}
