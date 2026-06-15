import React from "react";
import { AlertTriangle, Clock, CreditCard, X, ArrowRight } from "lucide-react";
import { resolveBillingTone } from "@/lib/billing-banner-tone";

/**
 * MobileBillingBanner — the member-facing advisory platform-billing strip.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors the WEB admin's soft-gate banner (components/admin/billing-banner.tsx)
 * on the mobile dashboard so a member sees the SAME advisory state the web admin
 * does — "Trial ends in N days", "Payment past due", … . It is driven by the
 * `billing` block the /api/mobile/data payload now carries (getEntitlement's
 * machine-readable reason/status/daysLeft).
 *
 * HARD RULE (matches lib/entitlement.ts fail-open contract): this is ADVISORY
 * ONLY. It never blocks the dashboard. It renders nothing when:
 *   • there is no billing block (demo session, or an older payload), OR
 *   • the resolver says no banner is warranted (active / healthy / fail-open), OR
 *   • the member dismissed it this session.
 *
 * Dismissal is per-session (sessionStorage), keyed by the resolved tone key, so a
 * fresh "trial ends in 3 days" can re-surface after a "5 days" dismissal but
 * won't nag twice for the same state in one session. The CTA deep-links to the
 * admin billing screen (officers reach it; non-officers still see the heads-up).
 */

export interface MobileBillingInfo {
  reason: string;
  status: string | null;
  daysLeft: number | null;
  plan?: string | null;
}

export function MobileBillingBanner({
  billing,
  /** Officers can act on billing; everyone sees the advisory. When false we drop
   *  the CTA to a quiet "Ask an officer" hint instead of a dead link. */
  canManage = false,
}: {
  billing: MobileBillingInfo | null | undefined;
  canManage?: boolean;
}) {
  const tone = billing
    ? resolveBillingTone({
        reason: billing.reason,
        status: billing.status,
        daysLeft: billing.daysLeft,
      })
    : null;

  const storageKey = tone ? `gs-mobile-billing:${tone.key}` : "";
  const [dismissed, setDismissed] = React.useState(true); // hidden until effect decides

  React.useEffect(() => {
    if (!tone) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(sessionStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [tone, storageKey]);

  if (!tone) return null;
  if (dismissed) return null;

  const isDanger = tone.severity === "danger";
  const Icon = isDanger ? AlertTriangle : tone.key === "inactive" ? CreditCard : Clock;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* best-effort — banner just won't persist dismissal this session */
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2.5 rounded-2xl border p-3 ${
        isDanger
          ? "border-red-200 bg-red-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          isDanger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
        }`}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-bold ${isDanger ? "text-red-800" : "text-amber-900"}`}>
          {tone.title}
        </p>
        <p className={`mt-0.5 text-[12px] leading-snug ${isDanger ? "text-red-700/90" : "text-amber-800/90"}`}>
          {tone.body}
        </p>
        {canManage ? (
          <a
            href="/admin/billing"
            className={`mt-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-[12px] font-bold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-400"
                : "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400"
            }`}
          >
            {tone.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <p className="mt-1.5 text-[11px] font-medium text-slate-500">
            Ask a chapter officer to review billing.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss billing notice"
        className={`-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 ${
          isDanger
            ? "text-red-400 hover:bg-red-100 hover:text-red-700 focus-visible:ring-red-300"
            : "text-amber-500 hover:bg-amber-100 hover:text-amber-700 focus-visible:ring-amber-300"
        }`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
