import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { centralDb, getSubdomain } from "@/lib/prisma";
import { isAdminRole, isSameOrigin } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { billingReturnOrigin } from "@/lib/platform-billing";
import { errorSink, logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/admin/billing/portal";

/**
 * POST /api/admin/billing/portal
 *
 * Admin-only. Opens a Stripe Billing Portal session for THIS chapter's platform
 * subscription so the admin can update their card, view invoices, change, or
 * cancel the plan — all hosted by Stripe. Returns `{ ok, url }`; the client
 * redirects the browser there.
 *
 * Requires a stored stripeCustomerId (the chapter must have started checkout at
 * least once). When absent, returns a 409 so the page can route the admin to the
 * "Start subscription" button instead. 503 when Stripe is unconfigured.
 */
export async function POST(req: Request) {
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Billing is not configured yet. Please contact Greekstack support." },
      { status: 503 },
    );
  }

  const host = headers().get("host");
  const subdomain = getSubdomain(host);
  if (!subdomain) {
    return NextResponse.json(
      { ok: false, error: "Open billing from your chapter's admin, not the platform site." },
      { status: 400 },
    );
  }

  const tenant = await centralDb.tenant
    .findUnique({ where: { subdomain }, select: { stripeCustomerId: true } })
    .catch(() => null);

  const customerId = (tenant?.stripeCustomerId || "").trim();
  if (!customerId) {
    // No customer yet — the admin hasn't started a subscription. Tell the page to
    // show the checkout CTA instead of the portal.
    return NextResponse.json(
      { ok: false, error: "No billing account yet. Start a subscription first.", needsCheckout: true },
      { status: 409 },
    );
  }

  const origin = billingReturnOrigin(host);

  let portal;
  try {
    portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/admin/billing`,
    });
  } catch (err: any) {
    errorSink(err, { route: ROUTE, tenant: subdomain, outcome: "portal_create_failed" });
    return NextResponse.json(
      { ok: false, error: "Could not open the billing portal. Try again shortly." },
      { status: 502 },
    );
  }

  if (!portal.url) {
    return NextResponse.json(
      { ok: false, error: "Stripe returned no portal URL. Try again." },
      { status: 502 },
    );
  }

  logger.info("platform.billing.portal_opened", { route: ROUTE, tenant: subdomain });
  return NextResponse.json({ ok: true, url: portal.url });
}
