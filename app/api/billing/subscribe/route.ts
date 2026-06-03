import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getPlatformStripe, createSubscriptionCheckout } from "@/lib/platform-billing";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/subscribe
 *
 * Admin-only. Starts a Stripe Billing subscription Checkout for the Greekstack
 * $299/semester flat plan (the chapter pays the PLATFORM). Returns `{ url }`;
 * the client redirects the browser there.
 *
 * Inert by default: if `STRIPE_PLATFORM_SECRET_KEY` is unset,
 * `getPlatformStripe()` is null and we return 503 — the settings UI then shows
 * "Platform billing not configured" and nothing about the chapter app changes.
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
  const existingCustomerId = cfg["billing.stripeCustomerId"] || undefined;

  // Best-effort chapter name + admin email for nicer Checkout / Customer.
  let chapterName: string | undefined;
  try {
    const identity = await getChapterIdentity();
    chapterName = identity.chapterFullName;
  } catch {
    chapterName = cfg["chapter.fraternityName"] || undefined;
  }
  const adminEmail = cfg["contact.advisorEmail"] || cfg["contact.rushEmail"] || undefined;

  let session;
  try {
    session = await createSubscriptionCheckout(stripe, {
      customerId: existingCustomerId,
      customerEmail: existingCustomerId ? undefined : adminEmail,
      chapterName,
    });
  } catch (err: any) {
    console.error("[/api/billing/subscribe] Stripe create failed:", err?.message);
    return NextResponse.json(
      { ok: false, error: "Could not start subscription checkout. Try again." },
      { status: 502 },
    );
  }

  await audit({
    action: "PLATFORM_SUBSCRIBE_STARTED",
    subjectType: "Billing",
    subjectId: null,
    subjectName: "flat_subscription",
    details: "$299/semester platform subscription checkout started",
    req,
  });

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: "Stripe returned no checkout URL. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, url: session.url });
}
