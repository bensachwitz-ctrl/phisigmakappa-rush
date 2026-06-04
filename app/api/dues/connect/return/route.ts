import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe } from "@/lib/stripe";
import {
  getAccountStatus,
  getConnectAccountId,
  CONNECT_CHARGES_KEY,
  CONNECT_PAYOUTS_KEY,
} from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dues/connect/return — Stripe redirects the chapter admin here when
 * they finish (or abandon) Express onboarding. We re-check the live account
 * status, mirror charges/payouts flags into this chapter's SiteConfig (so the
 * checkout-time gate reflects reality), then 303-redirect into the admin.
 *
 * The chapter is resolved from the request Host (the return_url was built on
 * the chapter's own origin), so the request-context `prisma` / `getSiteConfig`
 * land on the correct schema. This route never collects payment — it only
 * refreshes the connect-status mirror.
 */

async function setCfg(key: string, value: string): Promise<void> {
  await prisma.siteConfig
    .upsert({ where: { key }, update: { value }, create: { key, value } })
    .catch(() => {});
}

export async function GET(req: Request) {
  const stripe = getStripe();
  const cfg = await getSiteConfig().catch(() => ({}) as Record<string, string>);
  const accountId = getConnectAccountId(cfg);

  // Best-effort refresh of the SiteConfig mirror. Any failure (Stripe down,
  // account unreadable) just leaves the prior flags in place — we always still
  // redirect so the admin never lands on a JSON blob.
  if (stripe && accountId) {
    try {
      const status = await getAccountStatus(stripe, accountId);
      await setCfg(CONNECT_CHARGES_KEY, status.chargesEnabled ? "true" : "false");
      await setCfg(CONNECT_PAYOUTS_KEY, status.payoutsEnabled ? "true" : "false");
    } catch (err: any) {
      console.error("[/api/dues/connect/return] status refresh failed:", err?.message);
    }
  }

  // Land on the standalone Payouts page (app/admin/dues/connect/page.tsx) — it
  // exists and re-renders the freshly-refreshed status. (There is no bare
  // /admin/dues index page in this app — only /admin/dues/success and the
  // /admin/dues/connect Payouts surface — so redirecting to /admin/dues would
  // 404. /admin/dues/connect keeps the onboarding round-trip from dead-ending.)
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/admin/dues/connect`, { status: 303 });
}
