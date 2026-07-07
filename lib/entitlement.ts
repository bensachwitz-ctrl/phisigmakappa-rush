import { centralDb, getTenantClient } from "@/lib/prisma";
import { normalizePlan } from "@/lib/platform-billing";

/**
 * PLATFORM-BILLING ENTITLEMENT — "is this chapter allowed to use Greekstack?"
 *
 * This is the soft-gate's source of truth for whether a chapter's PLATFORM
 * subscription (the chapter PAYING Greekstack) is in good standing. It is
 * DISTINCT from `isTenantActive` (lib/prisma.ts), which is the operator's hard
 * on/off switch, and from the per-chapter Stripe CONNECT account a chapter uses
 * to collect dues from its own members.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ FAIL OPEN — by design. This guard exists to show a billing BANNER, never │
 * │ to dark-screen a live chapter. EVERY uncertain path resolves to          │
 * │ `entitled: true`:                                                         │
 * │   • no registry row (unprovisioned / legacy)         → entitled          │
 * │   • operator `isActive` override is true             → entitled          │
 * │   • status ∈ {trialing, active}                      → entitled          │
 * │   • trialEndsAt is still in the future               → entitled          │
 * │   • ANY lookup error / unknown / unset status        → entitled          │
 * │ The function NEVER throws. The only thing that takes a chapter offline    │
 * │ is the operator flipping `isActive=false` (enforced separately in        │
 * │ app/page.tsx via isTenantActive). Billing state only drives the banner.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/** A subscription is "good standing" for entitlement when trialing or active. */
const ENTITLED_STATUSES = new Set(["trialing", "active"]);

export type EntitlementReason =
  | "operator_active" // isActive override (manual)
  | "subscribed" // status is active
  | "trialing" // status is trialing
  | "trial_active" // trialEndsAt in the future (regardless of status string)
  | "no_tenant_row" // unprovisioned / legacy → never block
  | "lookup_error" // registry hiccup → fail open
  | "past_due" // entitled stays true, but surface the dunning state
  | "canceled" // entitled stays true here (soft-gate); banner nudges to re-subscribe
  | "trial_expired" // trial lapsed and no active sub — banner nudges, app still serves
  | "unknown"; // unrecognized/absent status → fail open

export interface Entitlement {
  /** TRUE = serve normally. FALSE is advisory ONLY — drives the banner; the app
   *  is NEVER hard-blocked on this (operator `isActive` is the only hard switch). */
  entitled: boolean;
  /** Narrowed subscription status (trialing|active|past_due|canceled|null). */
  status: string | null;
  /** When the free trial ends (ISO from DB), or null. */
  trialEndsAt: Date | null;
  /** Whole days left in the trial (ceil). 0 once elapsed; null when no trial. */
  daysLeft: number | null;
  /** Machine-readable reason for the resolved state — drives banner copy. */
  reason: EntitlementReason;
  /** The plan slug (e.g. "chapter"), or null. */
  plan: string | null;
}

/** Ceil whole days from now until `when`; null when `when` is null. */
function daysUntil(when: Date | null): number | null {
  if (!when) return null;
  const ms = when.getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Resolve the platform-billing entitlement for a chapter subdomain.
 *
 * NEVER throws and NEVER returns `entitled: false` on uncertainty — see the
 * fail-open contract above. Pass the bare subdomain (e.g. "phisig"); an empty
 * subdomain (the apex) is treated as entitled (the apex has no chapter to gate).
 */
export async function getEntitlement(subdomain: string): Promise<Entitlement> {
  // The apex / no-subdomain context has no chapter to gate — always entitled.
  if (!subdomain) {
    return {
      entitled: true,
      status: null,
      trialEndsAt: null,
      daysLeft: null,
      reason: "no_tenant_row",
      plan: null,
    };
  }

  let row:
    | {
        isActive: boolean;
        subscriptionStatus: string | null;
        trialEndsAt: Date | null;
        plan: string | null;
      }
    | null = null;

  try {
    row = await centralDb.tenant.findUnique({
      where: { subdomain },
      select: {
        isActive: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        plan: true,
      },
    });
  } catch {
    // Registry hiccup → fail open. Never blackhole a live/paying chapter on a
    // transient DB error.
    return {
      entitled: true,
      status: null,
      trialEndsAt: null,
      daysLeft: null,
      reason: "lookup_error",
      plan: null,
    };
  }

  // Unprovisioned / legacy chapter (no registry row) → never block.
  if (!row) {
    return {
      entitled: true,
      status: null,
      trialEndsAt: null,
      daysLeft: null,
      reason: "no_tenant_row",
      plan: null,
    };
  }

  const status = (row.subscriptionStatus || "").trim().toLowerCase() || null;
  const trialEndsAt = row.trialEndsAt ?? null;
  const daysLeft = daysUntil(trialEndsAt);
  const plan = row.plan ?? null;
  const base = { status, trialEndsAt, daysLeft, plan };

  // 1. Operator manual override — isActive===true is an explicit "let them run".
  //    (isActive===false is the operator's HARD suspend and is enforced in
  //    app/page.tsx, not here — this guard is soft and only ever fails open.)
  if (row.isActive === true) {
    // Still report the most informative billing reason so the banner can nudge
    // even an operator-comped chapter that is past_due/expired. Entitlement is
    // unconditionally true here, but the reason reflects real billing state.
    return { entitled: true, ...base, reason: reasonFor(status, daysLeft) };
  }

  // 1b. PLAN-AWARE entitlement (the three owner pricing methods).
  //
  //  • "dues_percentage" — there is NO platform subscription; Greekstack earns
  //    from the dues Connect application fee. The chapter is ALWAYS entitled
  //    regardless of subscriptionStatus/trial. Reason "operator_active" reuses an
  //    existing (banner-suppressing) value so no false "set up billing" nag shows
  //    for a chapter that has no subscription to set up. (We do NOT widen the
  //    EntitlementReason union, to keep every downstream banner/type in sync.)
  //
  //  • "custom" — contact-driven; entitled iff the operator isActive flag is set.
  //    isActive===true was already handled by branch 1 above, so reaching here
  //    means isActive!==true. Per the FAIL-OPEN contract this guard still returns
  //    entitled:true (it NEVER returns false) — actual suspension of a non-active
  //    chapter is enforced by the operator hard switch in app/page.tsx
  //    (isTenantActive), not here. We surface a nudge reason so the banner can
  //    prompt the chapter to finish setup with sales.
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan === "dues_percentage") {
    return { entitled: true, ...base, reason: "operator_active" };
  }
  if (normalizedPlan === "custom") {
    // isActive!==true here (branch 1 owns the active case). Fail open with the
    // most informative reason; the operator hard switch governs real access.
    return { entitled: true, ...base, reason: reasonFor(status, daysLeft) };
  }

  // 2. Subscription in good standing (trialing/active).
  if (status && ENTITLED_STATUSES.has(status)) {
    return {
      entitled: true,
      ...base,
      reason: status === "active" ? "subscribed" : "trialing",
    };
  }

  // 3. Trial window still open (defensive: future trialEndsAt entitles even if
  //    the status string is missing/stale).
  if (daysLeft !== null && daysLeft > 0) {
    return { entitled: true, ...base, reason: "trial_active" };
  }

  // 3b. Read the onboard-seeded paymentDeadline from the tenant's own database
  //     schema. If now > paymentDeadline and there is no active subscription,
  //     we block access by setting entitled:false so the admin-layout locks
  //     them out. Keep lookup/connection errors fail-open.
  let isDeadlineElapsed = false;
  try {
    const tenantDb = getTenantClient(subdomain);
    const deadlineRow = await tenantDb.siteConfig.findUnique({
      where: { key: "billing.paymentDeadline" },
      select: { value: true },
    });
    if (deadlineRow?.value) {
      const deadline = new Date(deadlineRow.value);
      if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
        isDeadlineElapsed = true;
      }
    }
  } catch {
    // fail-open
  }

  if (isDeadlineElapsed) {
    return { entitled: false, ...base, reason: "trial_expired" };
  }

  // 4. Everything else (past_due, canceled, trial_expired, unknown/absent) —
  //    STILL fail open (entitled:true). The reason drives the banner copy; the
  //    app is never hard-blocked here.
  return { entitled: true, ...base, reason: reasonFor(status, daysLeft) };
}

/**
 * SERVER-SIDE WRITE-LOCKOUT PREDICATE — the single source of truth for "is this
 * chapter's PLATFORM subscription in a state that must BLOCK write access?".
 *
 * getEntitlement() is deliberately fail-OPEN for the banner (see the contract at
 * the top of this file): its `entitled` flag only flips false on the hard
 * deadline-elapsed branch. This predicate is the STRICTER, write-blocking read
 * shared by the admin layout (UI lock) AND the server guards (API 402) so the two
 * can never drift:
 *   • deadline elapsed (entitled === false)     → LOCKED
 *   • subscription canceled                      → LOCKED
 *   • subscription unpaid                        → LOCKED
 *   • trial lapsed with no active subscription   → LOCKED (reason "trial_expired")
 * Everything else stays UNLOCKED — trialing, active, past_due (dunning grace),
 * and every uncertain state (unknown / lookup_error / no_tenant_row). We never
 * dark-screen on uncertainty.
 *
 * NOTE this does NOT treat the operator `isActive=true` override as an
 * unconditional pass: getEntitlement still reports the REAL billing `reason`
 * (canceled / trial_expired) for an isActive-comped chapter, so a comped chapter
 * whose Stripe subscription is canceled is correctly locked out of writes.
 */
export function isBillingLockedOut(e: Entitlement): boolean {
  if (!e.entitled) return true;
  return (
    e.status === "canceled" ||
    e.status === "unpaid" ||
    e.reason === "canceled" ||
    e.reason === "trial_expired"
  );
}

/**
 * Pick the most informative banner `reason` for a billing state that is NOT a
 * clean trialing/active. Always advisory — entitlement itself stays true.
 */
function reasonFor(
  status: string | null,
  daysLeft: number | null,
): EntitlementReason {
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  if (daysLeft !== null && daysLeft <= 0) return "trial_expired";
  if (!status) return "unknown";
  return "unknown";
}
