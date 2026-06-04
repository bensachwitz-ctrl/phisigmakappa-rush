import type Stripe from "stripe";
import { centralDb } from "@/lib/prisma";

/**
 * PLATFORM BILLING helpers — the chapter PAYING Greekstack.
 *
 * Distinct from lib/stripe-connect.ts (a chapter collecting dues from its OWN
 * members via a connected Express account). Here, the platform's single Stripe
 * account (STRIPE_SECRET_KEY) bills each chapter — or earns from its dues — per
 * the chapter's chosen `plan`. The chapter↔customer↔subscription mapping is
 * persisted on the central `public."Tenant"` row (stripeCustomerId /
 * stripeSubscriptionId / subscriptionStatus / trialEndsAt / plan), NOT in any
 * tenant schema.
 *
 * THREE owner pricing methods + a contact-driven plan (Tenant.plan):
 *   • "monthly"          — Stripe subscription $50/mo, 30-DAY FREE TRIAL (first
 *                          month free). interval=month.
 *   • "semester"         — Stripe subscription $250 billed every 6 months
 *                          (interval=month, interval_count=6). No trial.
 *   • "dues_percentage"  — NO platform subscription. The chapter is entitled
 *                          always; Greekstack earns via the dues Connect
 *                          application fee = 1.5% for the FIRST dues cycle, then
 *                          3% after (see DUES_INTRO_FEE_PCT / DUES_STANDARD_FEE_PCT
 *                          and app/api/dues/checkout). Nothing is charged here.
 *   • "custom"           — contact-driven; entitled iff the operator isActive
 *                          flag is set. No self-serve checkout (talk to sales).
 *
 * Set STRIPE_PLATFORM_PRICE_ID (monthly) / STRIPE_PLATFORM_SEMESTER_PRICE_ID
 * (semester) to real recurring Stripe Prices to use dashboard-managed prices;
 * otherwise we fall back to inline price_data per plan so the flow is
 * self-contained and works without pre-creating a Price object.
 */

/** The set of plan slugs a chapter row can carry. */
export type PlatformPlan = "monthly" | "semester" | "dues_percentage" | "custom";

/** The two SELF-SERVE subscription plans (the only ones billing/checkout mints). */
export type SubscriptionPlan = "monthly" | "semester";

/** Legacy default plan slug. Kept for back-compat with any pre-existing row /
 *  consumer that stamped "chapter"; treated as the monthly subscription. */
export const PLATFORM_PLAN = "monthly";

/** All recognized plan slugs (for validation / iteration). */
export const PLATFORM_PLANS: readonly PlatformPlan[] = [
  "monthly",
  "semester",
  "dues_percentage",
  "custom",
] as const;

/** True when `plan` is one of the self-serve Stripe subscription plans. */
export function isSubscriptionPlan(
  plan: string | null | undefined,
): plan is SubscriptionPlan {
  return plan === "monthly" || plan === "semester";
}

/**
 * Normalize a raw `plan` string off a Tenant row / request into a known slug.
 * Unknown/empty/legacy values resolve to "monthly" (the historical default —
 * a $50/mo subscription with a trial), so an unprovisioned or legacy "chapter"
 * row keeps the prior behavior.
 */
export function normalizePlan(plan: string | null | undefined): PlatformPlan {
  const p = (plan || "").trim().toLowerCase();
  if (p === "semester") return "semester";
  if (p === "dues_percentage" || p === "dues" || p === "percentage") {
    return "dues_percentage";
  }
  if (p === "custom") return "custom";
  // "monthly", "chapter" (legacy), "", and anything unrecognized → monthly.
  return "monthly";
}

// ── Per-plan price + presentation ────────────────────────────────────────────

export const PLATFORM_PLAN_CURRENCY = "usd";

/** MONTHLY plan — $50/mo, 30-day free trial. */
export const PLATFORM_MONTHLY_PRICE_CENTS = 5000; // $50.00 / mo
export const PLATFORM_MONTHLY_INTERVAL = "month";
export const PLATFORM_MONTHLY_INTERVAL_COUNT = 1;
export const PLATFORM_TRIAL_DAYS = 30; // first month free

/** SEMESTER plan — $250 billed every 6 months. No trial. */
export const PLATFORM_SEMESTER_PRICE_CENTS = 25000; // $250.00 / 6 mo
export const PLATFORM_SEMESTER_INTERVAL = "month";
export const PLATFORM_SEMESTER_INTERVAL_COUNT = 6;

// ── Dues Connect application-fee percentages (dues_percentage plan only) ──────
// Greekstack's cut of each member's dues charge, taken as the Stripe Connect
// application_fee on the chapter's destination charge. Intro rate applies to the
// FIRST dues cycle only; the webhook flips dues.introFeeUsed → "true" on the
// first successful dues payment so every later cycle uses the standard rate.
export const DUES_INTRO_FEE_PCT = 1.5; // first dues cycle
export const DUES_STANDARD_FEE_PCT = 3.0; // every cycle after
/** SiteConfig flag (per chapter) marking the intro dues cycle as consumed. */
export const DUES_INTRO_FEE_USED_KEY = "dues.introFeeUsed";

/**
 * Resolve the dues Connect application-fee percentage for a dues_percentage
 * chapter: 1.5% until the intro cycle is used, then 3%. `introUsed` is the
 * truthiness of the chapter's `dues.introFeeUsed` SiteConfig flag.
 *
 * Returns 0 for any chapter NOT on the dues_percentage plan — those keep their
 * existing dues behavior (no platform fee unless an admin set dues.platformFeePct).
 */
export function duesPlatformFeePct(
  plan: string | null | undefined,
  introUsed: boolean,
): number {
  if (normalizePlan(plan) !== "dues_percentage") return 0;
  return introUsed ? DUES_STANDARD_FEE_PCT : DUES_INTRO_FEE_PCT;
}

/** Human-facing plan name (page + checkout line item). */
export function planDisplayName(plan: string | null | undefined): string {
  switch (normalizePlan(plan)) {
    case "semester":
      return "Greekstack Chapter — Semester";
    case "dues_percentage":
      return "Greekstack Chapter — Dues %";
    case "custom":
      return "Greekstack Chapter — Custom";
    case "monthly":
    default:
      return "Greekstack Chapter";
  }
}

/** Short price label for the plan ("$50/mo", "$250 every 6 months", "1.5% of dues…"). */
export function planPriceLabel(plan: string | null | undefined): string {
  switch (normalizePlan(plan)) {
    case "semester":
      return `$${dollars(PLATFORM_SEMESTER_PRICE_CENTS)} every 6 months`;
    case "dues_percentage":
      return `${DUES_INTRO_FEE_PCT}% of dues this semester, then ${DUES_STANDARD_FEE_PCT}%`;
    case "custom":
      return "Custom pricing";
    case "monthly":
    default:
      return `$${dollars(PLATFORM_MONTHLY_PRICE_CENTS)}/mo`;
  }
}

/** Whole-dollar string when cents are an exact dollar, else 2-dp. */
function dollars(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

// Back-compat aliases — the legacy single-plan constants several existing
// consumers (e.g. app/admin/billing/page.tsx) import directly. They now describe
// the MONTHLY plan (the historical default). Kept so no consumer breaks.
export const PLATFORM_PLAN_NAME = planDisplayName("monthly");
export const PLATFORM_PLAN_PRICE_CENTS = PLATFORM_MONTHLY_PRICE_CENTS;
export const PLATFORM_PLAN_INTERVAL = PLATFORM_MONTHLY_INTERVAL;

/** The Checkout line-item shape (resolved via indexed access so it works
 *  regardless of how the Stripe SDK re-exports the nested Checkout namespace). */
type CheckoutLineItem = NonNullable<
  Stripe.Checkout.SessionCreateParams["line_items"]
>[number];

/**
 * The subscription Checkout line item for a given self-serve plan. Prefers a
 * configured recurring Price id (STRIPE_PLATFORM_PRICE_ID for monthly,
 * STRIPE_PLATFORM_SEMESTER_PRICE_ID for semester); else inline price_data with
 * the correct interval/interval_count.
 *
 * Defaults to the monthly plan so the legacy zero-arg call site keeps working.
 */
export function platformLineItem(
  plan: SubscriptionPlan = "monthly",
): CheckoutLineItem {
  if (plan === "semester") {
    const semesterPriceId = (
      process.env.STRIPE_PLATFORM_SEMESTER_PRICE_ID || ""
    ).trim();
    if (semesterPriceId) return { price: semesterPriceId, quantity: 1 };
    return {
      quantity: 1,
      price_data: {
        currency: PLATFORM_PLAN_CURRENCY,
        recurring: {
          interval: PLATFORM_SEMESTER_INTERVAL,
          interval_count: PLATFORM_SEMESTER_INTERVAL_COUNT,
        },
        unit_amount: PLATFORM_SEMESTER_PRICE_CENTS,
        product_data: {
          name: planDisplayName("semester"),
          description:
            "Greekstack platform subscription — one chapter, billed every 6 months.",
        },
      },
    };
  }

  // monthly (default)
  const priceId = (process.env.STRIPE_PLATFORM_PRICE_ID || "").trim();
  if (priceId) return { price: priceId, quantity: 1 };
  return {
    quantity: 1,
    price_data: {
      currency: PLATFORM_PLAN_CURRENCY,
      recurring: {
        interval: PLATFORM_MONTHLY_INTERVAL,
        interval_count: PLATFORM_MONTHLY_INTERVAL_COUNT,
      },
      unit_amount: PLATFORM_MONTHLY_PRICE_CENTS,
      product_data: {
        name: planDisplayName("monthly"),
        description: "Greekstack platform subscription — one chapter.",
      },
    },
  };
}

/**
 * Build the `subscription_data` block for a self-serve subscription Checkout.
 * Stamps metadata.subdomain + metadata.plan (the webhook routing/labeling keys)
 * and, for the MONTHLY plan ONLY when the chapter has never subscribed, a 30-day
 * trial. The semester plan never trials. `neverSubscribed` gates the trial so a
 * chapter that already trialed/canceled doesn't get a fresh free month on
 * re-subscribe.
 */
export function platformSubscriptionData(args: {
  plan: SubscriptionPlan;
  subdomain: string;
  neverSubscribed: boolean;
}): NonNullable<Stripe.Checkout.SessionCreateParams["subscription_data"]> {
  const { plan, subdomain, neverSubscribed } = args;
  const data: NonNullable<
    Stripe.Checkout.SessionCreateParams["subscription_data"]
  > = {
    metadata: { subdomain, plan },
  };
  if (plan === "monthly" && neverSubscribed) {
    data.trial_period_days = PLATFORM_TRIAL_DAYS;
  }
  return data;
}

/**
 * Resolve (and persist) the Stripe Customer for a chapter. Reuses the stored
 * `stripeCustomerId` when present (and still valid); otherwise creates a new
 * Customer, stamps `metadata.subdomain` (so the webhook can route by it even
 * when the event object carries no metadata), and writes the id back onto the
 * central Tenant row. Returns the customer id.
 *
 * `email`/`name` are best-effort labels for the Stripe dashboard.
 */
export async function getOrCreatePlatformCustomer(
  stripe: Stripe,
  args: {
    subdomain: string;
    existingCustomerId?: string | null;
    email?: string | null;
    name?: string | null;
  },
): Promise<string> {
  const { subdomain, existingCustomerId, email, name } = args;

  // Reuse a stored customer if it still exists (deleted customers must be
  // re-created or Stripe rejects the checkout/portal session).
  if (existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(existingCustomerId);
      if (existing && !(existing as any).deleted) {
        return existingCustomerId;
      }
    } catch {
      // Fall through to create a fresh customer below.
    }
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    name: name || subdomain,
    metadata: { subdomain },
  });

  // Persist the new customer id on the central registry row (best-effort — a
  // write failure here doesn't break checkout; the webhook can still resolve the
  // tenant by metadata.subdomain, and we re-link by customer id on the next call).
  await centralDb.tenant
    .update({ where: { subdomain }, data: { stripeCustomerId: customer.id } })
    .catch(() => {});

  return customer.id;
}

/**
 * Resolve the canonical apex/site URL for success/cancel/return links. Prefers
 * the chapter's own Host (passed in) so the post-checkout redirect lands back on
 * the chapter's subdomain rather than the platform apex.
 */
export function billingReturnOrigin(host: string | null): string {
  if (host && !host.includes("localhost")) return `https://${host}`;
  if (host && host.includes("localhost")) return `http://${host}`;
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}
