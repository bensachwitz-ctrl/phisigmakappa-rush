/**
 * lib/billing-banner-tone.ts — PURE entitlement→banner-tone resolver.
 * ─────────────────────────────────────────────────────────────────────────────
 * The single source of truth for "given an entitlement reason/status/daysLeft,
 * SHOULD we show a billing banner, and what does it say?". Both the WEB admin
 * banner (components/admin/billing-banner.tsx) and the MOBILE dashboard banner
 * (app/app/_demo/surfaces — surfaced via the /api/mobile/data payload) consume
 * this so the two surfaces never drift in copy or in the show/hide decision.
 *
 * PURE + isomorphic: no React, no DOM, no env. Safe to import from a server
 * route, a client component, and the vitest suite alike. Returns `null` when no
 * banner is warranted (healthy/active/operator-comped/fail-open-fine states) so
 * callers render nothing — preserving the FAIL-OPEN contract (the banner is
 * advisory; it never blocks the app).
 */

/** Mirrors lib/entitlement.ts EntitlementReason (kept as a local string union to
 *  stay import-light and decoupled — the values are identical). */
export type BillingReason =
  | "operator_active"
  | "subscribed"
  | "trialing"
  | "trial_active"
  | "no_tenant_row"
  | "lookup_error"
  | "past_due"
  | "canceled"
  | "trial_expired"
  | "unknown";

/** Visual severity — lets each surface map to its own palette/icon. */
export type BillingSeverity = "warning" | "danger";

/** A resolved banner tone (surface-agnostic). `null` from `resolveBillingTone`
 *  means "show nothing". */
export interface BillingTone {
  /** Stable de-dupe key (drives per-session dismissal keying). */
  key: string;
  /** Severity → palette/icon choice (warning=amber, danger=red). */
  severity: BillingSeverity;
  /** Short bold headline, e.g. "Trial ends in 5 days". */
  title: string;
  /** One-line supporting copy. */
  body: string;
  /** Action label, e.g. "Set up billing". */
  ctaLabel: string;
}

/**
 * Resolve the banner tone for a billing state, or `null` when no banner is
 * warranted. Identical decision logic to the web admin's `bannerTone`, lifted
 * here so both surfaces share it.
 *
 *   • active / subscribed                  → null (healthy)
 *   • past_due                             → danger (always; dunning)
 *   • trialing / trial_active (≤7 days)    → warning ("Trial ends in N days")
 *   • trialing with >7 days left           → null (don't nag from day 1)
 *   • trial_expired / canceled             → warning (re-subscribe nudge)
 *   • operator_active / no_tenant_row /
 *     lookup_error / unknown               → null (fail-open, nothing to nudge)
 */
export function resolveBillingTone(args: {
  reason: BillingReason | string;
  status: string | null;
  daysLeft: number | null;
}): BillingTone | null {
  const { reason, status, daysLeft } = args;

  // Active subscription → entitled via subscription → no banner.
  if (status === "active" || reason === "subscribed") return null;

  // Past due → danger, always show (dunning).
  if (status === "past_due" || reason === "past_due") {
    return {
      key: "past_due",
      severity: "danger",
      title: "Payment past due",
      body: "Update your billing to keep your chapter's subscription in good standing.",
      ctaLabel: "Update billing",
    };
  }

  // Trial ending → warning. Only nudge inside the final stretch (≤7 days) so we
  // don't nag from day 1; always show on the last day / when expiring.
  const trialing =
    status === "trialing" || reason === "trial_active" || reason === "trialing";
  if (trialing) {
    if (typeof daysLeft === "number" && daysLeft > 7) return null; // early trial — stay quiet
    const dLabel =
      typeof daysLeft === "number" && daysLeft > 0
        ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}`
        : "soon";
    return {
      key: `trial_${typeof daysLeft === "number" ? daysLeft : "x"}`,
      severity: "warning",
      title:
        typeof daysLeft === "number" && daysLeft > 0
          ? `Trial ends in ${dLabel}`
          : "Your trial is ending",
      body: "Set up billing so your chapter keeps full access without interruption.",
      ctaLabel: "Set up billing",
    };
  }

  // Trial expired / canceled → warning nudge to re-subscribe.
  if (reason === "trial_expired" || status === "canceled" || reason === "canceled") {
    return {
      key: "inactive",
      severity: "warning",
      title:
        reason === "trial_expired"
          ? "Your free trial has ended"
          : "Subscription inactive",
      body: "Start a subscription to keep full access — your chapter stays online.",
      ctaLabel: "Start subscription",
    };
  }

  // operator_active (no billing issue), no_tenant_row, lookup_error, unknown
  // → fail-open, no banner.
  return null;
}
