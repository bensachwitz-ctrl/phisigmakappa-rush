import type Stripe from "stripe";
import { centralDb } from "@/lib/prisma";

/**
 * PLATFORM BILLING helpers — the chapter PAYING Greekstack.
 *
 * Distinct from lib/stripe-connect.ts (a chapter collecting dues from its OWN
 * members via a connected Express account). Here, the platform's single Stripe
 * account (STRIPE_SECRET_KEY) bills each chapter a recurring subscription. The
 * chapter↔customer↔subscription mapping is persisted on the central
 * `public."Tenant"` row (stripeCustomerId / stripeSubscriptionId /
 * subscriptionStatus / trialEndsAt / plan), NOT in any tenant schema.
 *
 * Pricing: defaults to a single "chapter" plan at $29/mo with a 14-day trial
 * (SALES.md has no explicit per-chapter platform price — its ROI section is
 * about HQ rolling it out free; the brief's default applies). Set
 * STRIPE_PLATFORM_PRICE_ID to a real recurring Stripe Price to use the
 * dashboard-managed price; otherwise we fall back to inline price_data so the
 * flow is self-contained and works without pre-creating a Price object.
 */

/** Default plan slug stamped on a chapter at signup + used at checkout. */
export const PLATFORM_PLAN = "chapter";

/** Human-facing plan presentation (page + checkout line item). */
export const PLATFORM_PLAN_NAME = "Greekstack Chapter";
export const PLATFORM_PLAN_PRICE_CENTS = 2900; // $29.00 / mo
export const PLATFORM_PLAN_CURRENCY = "usd";
export const PLATFORM_PLAN_INTERVAL = "month";
export const PLATFORM_TRIAL_DAYS = 14;

/** The Checkout line-item shape (resolved via indexed access so it works
 *  regardless of how the Stripe SDK re-exports the nested Checkout namespace). */
type CheckoutLineItem = NonNullable<
  Stripe.Checkout.SessionCreateParams["line_items"]
>[number];

/**
 * The line item for a subscription Checkout / the price for a portal plan.
 * Prefers a configured recurring Price id; else inline monthly price_data.
 */
export function platformLineItem(): CheckoutLineItem {
  const priceId = (process.env.STRIPE_PLATFORM_PRICE_ID || "").trim();
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }
  return {
    quantity: 1,
    price_data: {
      currency: PLATFORM_PLAN_CURRENCY,
      recurring: { interval: PLATFORM_PLAN_INTERVAL },
      unit_amount: PLATFORM_PLAN_PRICE_CENTS,
      product_data: {
        name: PLATFORM_PLAN_NAME,
        description: "Greekstack platform subscription — one chapter.",
      },
    },
  };
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
