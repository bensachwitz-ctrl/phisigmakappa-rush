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
 * SELF-SERVE pricing methods + contact-driven plans (Tenant.plan):
 *   • "monthly"          — Stripe subscription $50/mo, 30-DAY FREE TRIAL (first
 *                          month free). interval=month. PLUS the $200 rush cycle
 *                          billed EACH SEMESTER (recurring every 6 months, via
 *                          platformRushChargeLineItem()).
 *   • "yearly"           — Stripe subscription $800/yr (interval=year). No trial.
 *                          ALL rush-cycle fees included (the "best value" plan).
 *   • "semester"         — LEGACY. $250 billed every 6 months. No trial. Hidden in
 *                          the UI but kept mintable for any pre-existing row.
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
export type PlatformPlan = "monthly" | "yearly" | "semester" | "dues_percentage" | "custom";

/** The SELF-SERVE subscription plans (the only ones billing/checkout mints). */
export type SubscriptionPlan = "monthly" | "yearly" | "semester";

/** Legacy default plan slug. Kept for back-compat with any pre-existing row /
 *  consumer that stamped "chapter"; treated as the monthly subscription. */
export const PLATFORM_PLAN = "monthly";

/** All recognized plan slugs (for validation / iteration). */
export const PLATFORM_PLANS: readonly PlatformPlan[] = [
  "monthly",
  "yearly",
  "semester",
  "dues_percentage",
  "custom",
] as const;

/** True when `plan` is one of the self-serve Stripe subscription plans. */
export function isSubscriptionPlan(
  plan: string | null | undefined,
): plan is SubscriptionPlan {
  return plan === "monthly" || plan === "yearly" || plan === "semester";
}

/**
 * Normalize a raw `plan` string off a Tenant row / request into a known slug.
 * Unknown/empty/legacy values resolve to "monthly" (the historical default —
 * a $50/mo subscription with a trial), so an unprovisioned or legacy "chapter"
 * row keeps the prior behavior.
 */
export function normalizePlan(plan: string | null | undefined): PlatformPlan {
  const p = (plan || "").trim().toLowerCase();
  if (p === "yearly" || p === "annual" || p === "annually" || p === "year") return "yearly";
  if (p === "semester") return "semester";
  if (p === "dues_percentage" || p === "dues" || p === "percentage") {
    return "dues_percentage";
  }
  if (p === "custom") return "custom";
  // "monthly", "chapter" (legacy), "", and anything unrecognized → monthly.
  return "monthly";
}

// ── Brand identity for invoices / receipts / statements ──────────────────────
// Greek Stack is the BILLING ENTITY the chapter pays (the customer is always the
// chapter). These strings make every Stripe-issued invoice, hosted invoice page,
// and card statement read as a professional "Greek Stack" charge. The account-
// level logo + legal business name still come from the Stripe Dashboard (the
// restricted API key can't set those — see STRIPE-BRANDING-TODO.md); these
// session-level fields are everything the API CAN brand and are applied on every
// checkout flow for consistency.
export const GREEKSTACK_BRAND_NAME = "Greek Stack";
export const GREEKSTACK_SITE = "greekstack.vercel.app";
export const GREEKSTACK_SITE_URL = "https://greekstack.vercel.app";
/** Support contact stamped on every Greek Stack-issued invoice (PDF + hosted
 *  page). Defaults to the owner support inbox; env-configurable via
 *  SUPPORT_CONTACT_EMAIL / NEXT_PUBLIC_SUPPORT_EMAIL.
 *  OWNER-KEYS: monitor this inbox (or set the env) before launch. */
export const GREEKSTACK_SUPPORT_EMAIL =
  process.env.SUPPORT_CONTACT_EMAIL ||
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  "workbenjaminsachwitz@gmail.com";

/**
 * Footer line shown on every Greek Stack-issued invoice (PDF + hosted page).
 * Carries the brand, the site, and a support contact so a treasurer who opens
 * the invoice months later knows exactly who charged them and where to get help.
 */
export function platformInvoiceFooter(): string {
  return `Greek Stack · ${GREEKSTACK_SITE_URL} · Questions? ${GREEKSTACK_SUPPORT_EMAIL}`;
}

/**
 * `invoice_settings` for a SUBSCRIPTION checkout — issues the invoice from the
 * platform's own Stripe account ("self") so the account-level Greek Stack
 * branding (logo + business name set in the Dashboard) is applied, and stamps
 * the branded footer. Safe to spread into `subscription_data`.
 */
export function platformSubscriptionInvoiceSettings(): NonNullable<
  Stripe.Checkout.SessionCreateParams["subscription_data"]
>["invoice_settings"] {
  return {
    issuer: { type: "self" },
  };
}

/**
 * `invoice_creation` block for a PAYMENT-mode checkout (one-off charges like the
 * member dues flow). Enables a real Stripe invoice for the payment, branded with
 * the Greek Stack footer + a human description. `descriptionText` lets the caller
 * pass a per-charge line (e.g. "Chapter dues — Spring '26"); falls back to a
 * generic Greek Stack line.
 */
export function platformInvoiceCreation(
  descriptionText?: string,
): NonNullable<Stripe.Checkout.SessionCreateParams["invoice_creation"]> {
  return {
    enabled: true,
    invoice_data: {
      description: (descriptionText || "Paid via Greek Stack").trim(),
      footer: platformInvoiceFooter(),
    },
  };
}

/**
 * The human-readable description Stripe stamps onto the SUBSCRIPTION'S invoices
 * (shown on the invoice PDF + hosted page). Reads "Greek Stack platform
 * subscription — <Chapter>" so the chapter sees a professional, self-identifying
 * line item. `chapterName` is the chapter's display name (the customer);
 * fall back to a generic line when unknown.
 */
export function platformSubscriptionDescription(
  plan: string | null | undefined,
  chapterName?: string | null,
): string {
  const who = (chapterName || "").trim();
  const base = `Greek Stack platform subscription`;
  const planWord =
    normalizePlan(plan) === "yearly"
      ? " (annual)"
      : normalizePlan(plan) === "semester"
        ? " (semester)"
        : " (monthly)";
  return who ? `${base}${planWord} — ${who}` : `${base}${planWord}`;
}

// ── Per-plan price + presentation ────────────────────────────────────────────

export const PLATFORM_PLAN_CURRENCY = "usd";

/** MONTHLY plan — $50/mo, 30-day free trial. */
export const PLATFORM_MONTHLY_PRICE_CENTS = 5000; // $50.00 / mo
export const PLATFORM_MONTHLY_INTERVAL = "month";
export const PLATFORM_MONTHLY_INTERVAL_COUNT = 1;
export const PLATFORM_TRIAL_DAYS = 30; // first month free

/** SEMESTER plan — $250 billed every 6 months. No trial. (Legacy.) */
export const PLATFORM_SEMESTER_PRICE_CENTS = 25000; // $250.00 / 6 mo
export const PLATFORM_SEMESTER_INTERVAL = "month";
export const PLATFORM_SEMESTER_INTERVAL_COUNT = 6;

/** YEARLY plan — $800 billed once a year. Rush cycles INCLUDED (no per-rush fee).
 *  No trial — the chapter pays the discounted annual rate up front ("best value"). */
export const PLATFORM_YEARLY_PRICE_CENTS = 80000; // $800.00 / yr
export const PLATFORM_YEARLY_INTERVAL = "year";
export const PLATFORM_YEARLY_INTERVAL_COUNT = 1;

/** RUSH-CYCLE add-on — $200 billed EACH SEMESTER (a recurring subscription on a
 *  6-month interval), billed ONLY to MONTHLY chapters (yearly includes rush).
 *  Mint via platformRushChargeLineItem() in a subscription (mode:"subscription")
 *  Checkout. It is a SEPARATE subscription from the $50/mo platform plan, tagged
 *  metadata.kind="rush_cycle" so the platform webhook never confuses the two. */
export const PLATFORM_RUSH_CYCLE_PRICE_CENTS = 20000; // $200.00 / semester (every 6 months)
export const PLATFORM_RUSH_INTERVAL = "month";
export const PLATFORM_RUSH_INTERVAL_COUNT = 6; // each semester

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

/**
 * Minimal structural shape of the tenant Prisma client this helper needs — just
 * `siteConfig.upsert`. Keeps this lib decoupled from a concrete PrismaClient
 * import while accepting BOTH the webhook's tenant client and the cron's `db`.
 */
type SiteConfigUpserter = {
  siteConfig: {
    upsert: (args: {
      where: { key: string };
      update: { value: string };
      create: { key: string; value: string };
    }) => Promise<unknown>;
  };
};

/**
 * Consume the dues_percentage intro fee on a chapter's FIRST successful dues
 * payment. SHARED by BOTH the webhook (/api/dues/webhook) and the reconcile-
 * stripe safety-net cron so the two paths apply the SAME PAID-side effect — a
 * dues payment first confirmed by the cron (a dropped webhook, exactly the
 * cron's purpose) must still flip the flag, or the chapter would be billed the
 * 1.5% intro rate forever (permanent platform under-collection).
 *
 * The plan signal rides in the Checkout session metadata (`platformPlan ===
 * "dues_percentage"`, with `introFeeUsed` snapshotted at checkout) — Stripe
 * POSTs the webhook with no Host, and the cron resolves the tenant by schema,
 * so metadata is the authoritative, already-routed signal in both paths.
 *
 * Idempotent (upsert to "true") + best-effort: any DB failure is swallowed and
 * surfaced via the caller-supplied `onError` so a confirmed payment is never
 * re-driven. Returns true only when it actually flipped the flag (so the caller
 * can log the consumption). No-op (returns false) for any non-dues_percentage
 * session, an already-consumed session, or on error.
 */
export async function markDuesIntroFeeUsedFromSession(
  db: SiteConfigUpserter,
  session: Stripe.Checkout.Session,
  onError?: (e: unknown) => void,
): Promise<boolean> {
  try {
    const meta = (session.metadata as Record<string, string> | null) || null;
    if (!meta || meta.platformPlan !== "dues_percentage") return false;
    // Already consumed (the checkout snapshotted it as used) → nothing to write.
    if (meta.introFeeUsed === "true") return false;

    await db.siteConfig.upsert({
      where: { key: DUES_INTRO_FEE_USED_KEY },
      update: { value: "true" },
      create: { key: DUES_INTRO_FEE_USED_KEY, value: "true" },
    });
    return true;
  } catch (e) {
    onError?.(e);
    return false;
  }
}

/** Human-facing plan name (page + checkout line item). */
export function planDisplayName(plan: string | null | undefined): string {
  switch (normalizePlan(plan)) {
    case "yearly":
      return "Greekstack Chapter — Yearly";
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
    case "yearly":
      return `$${dollars(PLATFORM_YEARLY_PRICE_CENTS)}/year`;
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

  if (plan === "yearly") {
    const yearlyPriceId = (process.env.STRIPE_PLATFORM_YEARLY_PRICE_ID || "").trim();
    if (yearlyPriceId) return { price: yearlyPriceId, quantity: 1 };
    return {
      quantity: 1,
      price_data: {
        currency: PLATFORM_PLAN_CURRENCY,
        recurring: {
          interval: PLATFORM_YEARLY_INTERVAL,
          interval_count: PLATFORM_YEARLY_INTERVAL_COUNT,
        },
        unit_amount: PLATFORM_YEARLY_PRICE_CENTS,
        product_data: {
          name: planDisplayName("yearly"),
          description:
            "Greekstack platform subscription — one chapter, billed yearly. All rush-cycle fees included.",
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
 * RECURRING Checkout line item for the $200-each-semester rush add-on (use with
 * mode:"subscription" — Stripe bills it every 6 months). Billed to MONTHLY
 * chapters; YEARLY chapters include rush, so callers must NOT mint this for them
 * (guard with rushCycleBillable). Prefers STRIPE_PLATFORM_RUSH_PRICE_ID (must be
 * a RECURRING every-6-months Price — lookup_key greekstack_rush_semester), else
 * inline price_data with the same cadence.
 */
export function platformRushChargeLineItem(): CheckoutLineItem {
  const rushPriceId = (process.env.STRIPE_PLATFORM_RUSH_PRICE_ID || "").trim();
  if (rushPriceId) return { price: rushPriceId, quantity: 1 };
  return {
    quantity: 1,
    price_data: {
      currency: PLATFORM_PLAN_CURRENCY,
      recurring: {
        interval: PLATFORM_RUSH_INTERVAL,
        interval_count: PLATFORM_RUSH_INTERVAL_COUNT,
      },
      unit_amount: PLATFORM_RUSH_CYCLE_PRICE_CENTS,
      product_data: {
        name: "Greekstack — Rush Cycle",
        description:
          "Rush / recruitment on the monthly plan — $200 each semester (billed every 6 months).",
      },
    },
  };
}

/** True when this plan owes a per-rush-cycle fee: MONTHLY does; YEARLY includes
 *  rush; semester/dues_percentage/custom are handled out-of-band (no rush fee). */
export function rushCycleBillable(plan: string | null | undefined): boolean {
  return normalizePlan(plan) === "monthly";
}

/**
 * Build the `subscription_data` block for a self-serve subscription Checkout.
 * Stamps metadata.subdomain + metadata.plan (the webhook routing/labeling keys)
 * and, for the MONTHLY plan ONLY when the chapter has never subscribed, a 30-day
 * trial. The semester plan never trials. `neverSubscribed` gates the trial so a
 * chapter that already trialed/canceled doesn't get a fresh free month on
 * re-subscribe.
 *
 * INVOICE BRANDING: also stamps a professional Greek Stack `description` (shown
 * on every invoice for this subscription) naming the chapter, and issues the
 * invoice from the platform's own account ("self") so the Dashboard-set Greek
 * Stack logo + business name appear. `chapterName` is the chapter's display name
 * (the customer); omitted → a generic Greek Stack line.
 */
export function platformSubscriptionData(args: {
  plan: SubscriptionPlan;
  subdomain: string;
  neverSubscribed: boolean;
  chapterName?: string | null;
}): NonNullable<Stripe.Checkout.SessionCreateParams["subscription_data"]> {
  const { plan, subdomain, neverSubscribed, chapterName } = args;
  const data: NonNullable<
    Stripe.Checkout.SessionCreateParams["subscription_data"]
  > = {
    metadata: { subdomain, plan },
    description: platformSubscriptionDescription(plan, chapterName),
    invoice_settings: platformSubscriptionInvoiceSettings(),
  };
  if (plan === "monthly" && neverSubscribed) {
    data.trial_period_days = PLATFORM_TRIAL_DAYS;
  }
  return data;
}

/**
 * Custom fields for a platform-billing Checkout — a single "Chapter name" text
 * field pre-filled with the chapter's display name. It surfaces the chapter on
 * the Checkout page (so a treasurer paying on behalf of the chapter sees exactly
 * which chapter they're paying for) and lands on the resulting payment/invoice
 * for the chapter's own records. Read-only intent: pre-filled, optional.
 */
export function platformCheckoutCustomFields(
  chapterName?: string | null,
): NonNullable<Stripe.Checkout.SessionCreateParams["custom_fields"]> {
  const who = (chapterName || "").trim();
  return [
    {
      key: "chapter",
      label: { type: "custom", custom: "Chapter" },
      type: "text",
      optional: true,
      ...(who
        ? { text: { default_value: who.slice(0, 255) } }
        : {}),
    },
  ];
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
