import Stripe from "stripe";

/**
 * Stripe SDK helper. Returns a configured Stripe client OR null when the
 * server-side `STRIPE_SECRET_KEY` env var is missing.
 *
 * Every dues endpoint MUST null-check before using — a chapter that has
 * not configured Stripe should never see a 500. Instead, the route
 * returns a 503 with "Online dues not configured" so the brother is
 * directed to the manual treasurer fallback.
 *
 * We deliberately do NOT read this at module load time (no top-level
 * throw) so the rest of the app continues to render normally even with
 * Stripe disabled.
 */
export function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  return new Stripe(secret, {
    // Pin the API version — Stripe SDK ships with a default but pinning
    // means a future SDK upgrade doesn't silently change event shapes
    // our webhook handler relies on.
    apiVersion: "2024-12-18.acacia" as any,
    typescript: true,
  });
}

/**
 * Resolve the canonical site URL for success_url / cancel_url. Falls back
 * to localhost in dev so success-page returns at least render.
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}

/**
 * Compute the brother-facing total once pass-through fee is applied.
 * Stripe charges 2.9% + 30¢ on standard card. When pass-through is on,
 * we inflate the line-item so the chapter still nets the base amount.
 * Formula reverses Stripe's deduction:  total = (base + 30) / (1 - 0.029)
 * Result rounded UP to the next cent to avoid under-collection.
 */
export function applyPassThrough(baseCents: number): number {
  const STRIPE_RATE = 0.029;
  // Stripe deducts 2.9% + a fixed 30¢ per successful card charge. The fixed
  // 30¢ MUST be grossed up alongside the percentage, otherwise the chapter
  // nets ~30¢ short on every payment (the docstring formula above already
  // accounts for it; the prior implementation omitted the +30).
  const total = (baseCents + 30) / (1 - STRIPE_RATE);
  return Math.ceil(total);
}
