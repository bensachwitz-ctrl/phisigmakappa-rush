"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Clock, CreditCard, X, ArrowRight } from "lucide-react";

/**
 * SOFT-GATE billing banner (admin shell).
 *
 * Shows a dismissible-per-session strip when the chapter's PLATFORM subscription
 * is NOT cleanly active — e.g. "Trial ends in 5 days — set up billing" or
 * "Payment past due — update billing". Links to /admin/billing.
 *
 * Hard rule (matches the brief): this NEVER blocks the app. It is a banner only.
 * It renders nothing when:
 *   • the subscription is active (entitled via subscription), OR
 *   • billing isn't configured on this deployment (nothing to nudge toward), OR
 *   • the operator override (isActive) is the reason AND there's no billing issue, OR
 *   • we're already on /admin/billing, OR
 *   • the admin dismissed it this session.
 *
 * Dismissal is per-session (sessionStorage) and keyed by reason+day, so a fresh
 * "trial ends in 3 days" can re-surface after a "5 days" dismissal, but won't
 * nag within the same session for the same state.
 */

type Reason =
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

export function BillingBanner(props: {
  reason: Reason;
  status: string | null;
  daysLeft: number | null;
  stripeConfigured: boolean;
}) {
  const { reason, status, daysLeft, stripeConfigured } = props;
  const pathname = usePathname();
  const [dismissed, setDismissed] = React.useState(true); // default hidden until effect decides

  // Decide whether this banner should ever show, independent of dismissal.
  const tone = bannerTone({ reason, status, daysLeft });

  const storageKey = tone ? `gs-billing-banner:${tone.key}` : "";

  React.useEffect(() => {
    if (!tone) {
      setDismissed(true);
      return;
    }
    try {
      const was = sessionStorage.getItem(storageKey);
      setDismissed(was === "1");
    } catch {
      setDismissed(false);
    }
  }, [tone, storageKey]);

  // Never show when: nothing to nudge, not configured, on the billing page, or dismissed.
  if (!tone) return null;
  if (!stripeConfigured) return null;
  if (pathname === "/admin/billing") return null;
  if (pathname?.startsWith("/admin/login")) return null;
  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore — banner just won't persist dismissal this session
    }
  }

  const Icon = tone.icon;

  return (
    <div className={`w-full border-b ${tone.wrap}`} role="status">
      <div className="container flex items-center gap-3 py-2.5 text-sm">
        <Icon className={`h-4 w-4 shrink-0 ${tone.iconColor}`} aria-hidden="true" />
        <p className={`min-w-0 flex-1 ${tone.text}`}>
          <span className="font-medium">{tone.title}</span>
          {tone.body ? <span className="hidden sm:inline"> — {tone.body}</span> : null}
        </p>
        <Link
          href="/admin/billing"
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${tone.cta}`}
        >
          {tone.ctaLabel}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={`shrink-0 rounded-md p-1 transition-colors ${tone.dismiss}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

type Tone = {
  key: string;
  title: string;
  body: string;
  ctaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  wrap: string;
  text: string;
  iconColor: string;
  cta: string;
  dismiss: string;
};

/**
 * Map the entitlement reason → banner tone, or null when no banner is warranted
 * (active subscription / healthy operator-comped / unresolved-but-fine states).
 */
function bannerTone(args: {
  reason: Reason;
  status: string | null;
  daysLeft: number | null;
}): Tone | null {
  const { reason, status, daysLeft } = args;

  // Active subscription → entitled via subscription → no banner.
  if (status === "active" || reason === "subscribed") return null;

  // Past due → red, always show (dunning).
  if (status === "past_due" || reason === "past_due") {
    return {
      key: "past_due",
      title: "Payment past due",
      body: "update your billing to keep your subscription in good standing.",
      ctaLabel: "Update billing",
      icon: AlertTriangle,
      wrap: "border-red-200 bg-red-50",
      text: "text-red-800",
      iconColor: "text-red-600",
      cta: "bg-red-600 text-white hover:bg-red-700",
      dismiss: "text-red-400 hover:bg-red-100 hover:text-red-700",
    };
  }

  // Trial ending → amber. Only nudge inside the final stretch (<= 7 days) so we
  // don't nag from day 1; always show on the last day / expired.
  const trialing = status === "trialing" || reason === "trial_active" || reason === "trialing";
  if (trialing) {
    if (typeof daysLeft === "number" && daysLeft > 7) return null; // early trial — stay quiet
    const dLabel =
      typeof daysLeft === "number" && daysLeft > 0
        ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}`
        : "soon";
    return {
      key: `trial_${typeof daysLeft === "number" ? daysLeft : "x"}`,
      title:
        typeof daysLeft === "number" && daysLeft > 0
          ? `Trial ends in ${dLabel}`
          : "Your trial is ending",
      body: "set up billing so your chapter keeps full access without interruption.",
      ctaLabel: "Set up billing",
      icon: Clock,
      wrap: "border-amber-200 bg-amber-50",
      text: "text-amber-800",
      iconColor: "text-amber-600",
      cta: "bg-amber-500 text-white hover:bg-amber-600",
      dismiss: "text-amber-500 hover:bg-amber-100 hover:text-amber-700",
    };
  }

  // Trial expired / canceled → amber nudge to re-subscribe.
  if (reason === "trial_expired" || status === "canceled" || reason === "canceled") {
    return {
      key: "inactive",
      title:
        reason === "trial_expired" ? "Your free trial has ended" : "Subscription inactive",
      body: "start a subscription to keep full access — your chapter stays online.",
      ctaLabel: "Start subscription",
      icon: CreditCard,
      wrap: "border-amber-200 bg-amber-50",
      text: "text-amber-800",
      iconColor: "text-amber-600",
      cta: "bg-phisig-red text-white hover:opacity-90",
      dismiss: "text-amber-500 hover:bg-amber-100 hover:text-amber-700",
    };
  }

  // operator_active with no billing issue, no_tenant_row, lookup_error, unknown
  // → fail-open, no banner.
  return null;
}
