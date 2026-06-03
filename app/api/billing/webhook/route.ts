import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getPlatformStripe } from "@/lib/platform-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook
 *
 * PUBLIC endpoint — the Greekstack PLATFORM Stripe account POSTs subscription
 * and Connect lifecycle events here. This is SEPARATE from /api/dues/webhook
 * (which handles the chapter's own dues/donation events). We authenticate every
 * request with `stripe.webhooks.constructEvent` using `STRIPE_PLATFORM_WEBHOOK_SECRET`
 * (env-only, never in the DB). A missing/invalid signature → 400, NO DB writes.
 *
 * Inert by default: if `STRIPE_PLATFORM_SECRET_KEY` is unset, getPlatformStripe()
 * is null and we return 503 immediately so a stray request can't mutate data.
 *
 * Persists (to SiteConfig — non-secret values only):
 *   billing.subscriptionStatus    e.g. "active" | "canceled" | "past_due" | "none"
 *   billing.stripeCustomerId      platform Customer id for this chapter
 *   billing.subscriptionId        platform Subscription id
 *   billing.connectAccountId      Connect account id (echoed from account.updated)
 *   billing.connectChargesEnabled "true" once the connected account can accept charges
 *
 * Idempotency: every write is an idempotent upsert of the latest known state
 * (last-writer-wins on the current Stripe object). Re-delivering the same event
 * simply re-writes the same value — a no-op in effect. We do not keep a ledger
 * here, so there are no double-insert hazards.
 */
export async function POST(req: Request) {
  const stripe = getPlatformStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Platform billing not configured" },
      { status: 503 },
    );
  }

  const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Without the signing secret we cannot verify authenticity — refuse rather
    // than trust an unverified body. 503 (config problem), no DB writes.
    return NextResponse.json(
      { ok: false, error: "Platform webhook secret not configured" },
      { status: 503 },
    );
  }

  // RAW body bytes — Stripe signs the exact byte sequence.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("[/api/billing/webhook] signature verification failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Only act on OUR platform-subscription sessions. Ignore anything else
        // (defense in depth — this key should only ever see platform events).
        if (
          session.mode === "subscription" &&
          session.metadata?.greekstackBilling === "flat_subscription"
        ) {
          await persistConfig({
            "billing.stripeCustomerId": asId(session.customer),
            "billing.subscriptionId": asId(session.subscription),
            // Checkout completion implies the subscription is active/trialing;
            // the authoritative status arrives on customer.subscription.* but we
            // set a sensible interim so the UI reflects success immediately.
            "billing.subscriptionStatus": "active",
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const status =
          event.type === "customer.subscription.deleted" ? "canceled" : sub.status || "none";
        await persistConfig({
          "billing.subscriptionStatus": status,
          "billing.subscriptionId": sub.id,
          "billing.stripeCustomerId": asId(sub.customer),
        });
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await persistConfig({
          "billing.connectAccountId": account.id,
          "billing.connectChargesEnabled": account.charges_enabled ? "true" : "false",
        });
        break;
      }

      default:
        // Unhandled types — 200 so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error("[/api/billing/webhook] handler error:", err);
    // 500 → Stripe retries. Better to re-process an idempotent upsert than drop
    // a subscription state change.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Normalize a Stripe id-or-expanded-object field to a plain id string ("" if absent). */
function asId(v: string | { id: string } | null | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.id || "";
}

/**
 * Upsert a batch of SiteConfig key/value pairs. Skips empty-string values so we
 * never blank out a previously-known id when a particular event omits it.
 * Best-effort per key — one failed write won't abort the rest.
 */
async function persistConfig(entries: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    if (value === "" || value == null) continue;
    try {
      await prisma.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    } catch (e) {
      console.error(`[/api/billing/webhook] persist ${key} failed:`, e);
    }
  }
}
