import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getPlatformStripe, createBillingPortalSession } from "@/lib/platform-billing";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/portal
 *
 * Admin-only. Opens the Stripe Billing Portal so the chapter can manage its
 * platform subscription (update card, view invoices, cancel). Returns `{ url }`.
 *
 * Inert by default: 503 when `STRIPE_PLATFORM_SECRET_KEY` is unset. Also 409 if
 * the chapter has never subscribed (no `billing.stripeCustomerId` on file) —
 * there's nothing to manage yet.
 */
export async function POST(req: Request) {
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  const stripe = getPlatformStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Platform billing not configured." },
      { status: 503 },
    );
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const customerId = cfg["billing.stripeCustomerId"] || "";
  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: "No subscription on file yet. Subscribe first to manage billing." },
      { status: 409 },
    );
  }

  let session;
  try {
    session = await createBillingPortalSession(stripe, { customerId });
  } catch (err: any) {
    console.error("[/api/billing/portal] Stripe portal create failed:", err?.message);
    return NextResponse.json(
      { ok: false, error: "Could not open the billing portal. Try again." },
      { status: 502 },
    );
  }

  await audit({
    action: "PLATFORM_PORTAL_OPENED",
    subjectType: "Billing",
    subjectId: null,
    subjectName: "billing_portal",
    details: "Opened Stripe billing portal",
    req,
  });

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: "Stripe returned no portal URL. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, url: session.url });
}
