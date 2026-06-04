import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICON — Treasury / finance
 * ────────────────────────────────────────────────────────────────────────────
 * The header glyph for the chapter treasury tool (budget + reimbursements).
 * Obeys the shared duotone language defined in ./icon-base.tsx:
 *   • a soft brand-accent fill sits behind the currentColor primary line,
 *   • round caps/joins, ~1.7px stroke on the 24px grid,
 *   • a small Greek motif (the open ledger reads like a pediment / open book).
 *
 * Composition: an open ledger (two facing pages with ruled lines) with a coin
 * resting on the lower-right corner — instantly legible as "the money book".
 *
 *   import { IconTreasury } from "@/components/brand/icons/treasury";
 *   <IconTreasury className="h-6 w-6 text-[var(--gs-blue)]" />
 *
 * NB: this glyph lives outside the `@/components/brand/icons` barrel on purpose
 * (the barrel index.ts is an orchestrator-owned shared file). Import it from
 * this module path directly.
 */
export function IconTreasury({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: the two open ledger pages, filled soft behind the lines */}
      <path
        d="M12 6.2C10.4 5.1 8.4 4.6 6 4.6c-1 0-1.7.1-2 .2v12c.3-.1 1-.2 2-.2 2.4 0 4.4.5 6 1.6 1.6-1.1 3.6-1.6 6-1.6 1 0 1.7.1 2 .2v-12c-.3-.1-1-.2-2-.2-2.4 0-4.4.5-6 1.6Z"
        fill={accent}
        opacity={0.16}
        stroke="none"
      />
      {/* ledger outline — two pages meeting at the spine */}
      <path d="M12 6.2C10.4 5.1 8.4 4.6 6 4.6c-1 0-1.7.1-2 .2v12c.3-.1 1-.2 2-.2 2.4 0 4.4.5 6 1.6 1.6-1.1 3.6-1.6 6-1.6 1 0 1.7.1 2 .2v-12c-.3-.1-1-.2-2-.2-2.4 0-4.4.5-6 1.6Z" />
      {/* the spine / centre fold */}
      <path d="M12 6.2v12" />
      {/* a couple of ruled lines on the left page (the "entries") */}
      <path d="M6.4 8.6c1.4 0 2.6.2 3.6.7M6.4 11.2c1.4 0 2.6.2 3.6.7" />
      {/* coin resting on the lower-right corner — accent fill + minted edge */}
      <circle cx="17.4" cy="17" r="3.4" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="17.4" cy="17" r="3.4" />
      {/* the "$" struck into the coin */}
      <path d="M17.4 15.2v3.6M16.4 15.9h1.4a0.7 0.7 0 0 1 0 1.4h-1.2a0.7 0.7 0 0 0 0 1.4h1.4" />
    </IconBase>
  );
}
