import * as React from "react";
import {
  IllustrationBase,
  IllustrationGround,
  ILLUSTRATION_ACCENT,
  ACCENT_OPACITY,
  ACCENT_OPACITY_STRONG,
  type IllustrationProps,
} from "./illustration-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ILLUSTRATION — Ledger / no budget, dues, or payments
 * ────────────────────────────────────────────────────────────────────────────
 * A treasury ledger card with ruled line-items and a brand-accent coin resting
 * on its corner — the "no dues / budget / payment history yet" scene. Pairs with
 * the treasury surfaces (budget, expenses, reimbursements, dues receipts).
 *
 * Duotone + themeable per the shared language: currentColor linework + a
 * currentColor accent fill softened via fillOpacity, aria-hidden, no motion.
 */
export function IllustrationLedger({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
  return (
    <IllustrationBase {...props}>
      <IllustrationGround accent={accent} />

      {/* ledger page */}
      <rect x="34" y="32" width="78" height="80" rx="9" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <rect x="34" y="32" width="78" height="80" rx="9" />
      {/* spine + header rule */}
      <path d="M46 32v80" strokeOpacity={0.4} />
      <path d="M54 46h48" />

      {/* line items (each a label + an amount chip) */}
      <g>
        <path d="M54 62h22" strokeOpacity={0.6} />
        <rect x="88" y="58" width="16" height="8" rx="2.5" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
        <path d="M54 76h26" strokeOpacity={0.6} />
        <rect x="88" y="72" width="16" height="8" rx="2.5" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
        <rect x="88" y="72" width="16" height="8" rx="2.5" strokeOpacity={0.6} />
        <path d="M54 90h18" strokeOpacity={0.6} />
        <rect x="88" y="86" width="16" height="8" rx="2.5" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
        <rect x="88" y="86" width="16" height="8" rx="2.5" strokeOpacity={0.6} />
      </g>

      {/* brand-accent coin on the corner */}
      <circle cx="116" cy="98" r="14" fill="hsl(var(--background))" />
      <circle cx="116" cy="98" r="14" fill={accent} fillOpacity={ACCENT_OPACITY_STRONG} stroke="none" />
      <circle cx="116" cy="98" r="14" />
      <circle cx="116" cy="98" r="9" strokeOpacity={0.5} />
      <path d="M116 92v12M112.5 94.5h5a2.4 2.4 0 0 1 0 4.8h-5a2.4 2.4 0 0 0 0 4.8h5" />
    </IllustrationBase>
  );
}
