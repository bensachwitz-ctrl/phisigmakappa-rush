import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Marketing landing FEATURE EXTRAS
 * ────────────────────────────────────────────────────────────────────────────
 * Bespoke duotone glyphs for the feature grid on the apex marketing landing so
 * EVERY card carries a made-for-Greekstack symbol (zero lucide). They obey the
 * exact design language of ./icon-base.tsx + ./features.tsx:
 *   • 24×24 grid, ~1.75px primary line in `currentColor`, round caps/joins.
 *   • a soft brand-accent layer (var(--gs-accent, #38bdf8)) at low opacity behind
 *     the primary line — the two-tone read that makes the set feel premium.
 *   • a quiet Greek motif woven in where it stays legible at small sizes.
 *
 * Imported DIRECTLY by components/site/marketing-landing.tsx (NOT re-exported
 * through ./index.ts), per the build brief.
 */

/* ── Alumni network ──────────────────────────────────────────────────────────
   A connected node graph — graduated brothers linked into one giving + mentoring
   network. The central node is the chapter; the satellites are alumni. */
export function IconAlumniNetwork({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: connective web behind the nodes */}
      <path
        d="M12 12L6 6M12 12l6-5M12 12l-5.5 7M12 12l6.5 6"
        stroke={accent}
        opacity={0.3}
        strokeWidth={2.4}
      />
      {/* edges (primary) */}
      <path d="M12 12L6 6M12 12l6-5M12 12l-5.5 7M12 12l6.5 6" />
      {/* central chapter node */}
      <circle cx="12" cy="12" r="2.4" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="12" cy="12" r="2.4" />
      {/* alumni satellite nodes */}
      <circle cx="5.5" cy="5.5" r="1.7" />
      <circle cx="18.5" cy="6.5" r="1.7" />
      <circle cx="6" cy="19" r="1.7" />
      <circle cx="18.8" cy="18.3" r="1.7" />
    </IconBase>
  );
}

/* ── Treasury & budgets ──────────────────────────────────────────────────────
   A bank vault door with a budget bar inside — the chapter's treasury: budgets,
   ledgers, and expense tracking. Greek-key handle keeps the thread. */
export function IconTreasury({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: vault body */}
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" fill={accent} opacity={0.14} stroke="none" />
      {/* vault body */}
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      {/* vault dial */}
      <circle cx="9" cy="12" r="3.2" />
      <path d="M9 9.6V12l1.7 1" />
      {/* dial spokes (Greek-key whisper) */}
      <path d="M9 7.2v.9M9 15.9v.9M4.8 12h.9M12.3 12h.9" stroke={accent} opacity={0.5} />
      {/* budget bars on the right face */}
      <path d="M14.5 9h3.2M14.5 12h3.2M14.5 15h2" />
    </IconBase>
  );
}
