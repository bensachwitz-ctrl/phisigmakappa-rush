import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import {
  createConnectAccount,
  createOnboardingLink,
  getAccountStatus,
  getConnectAccountId,
  CONNECT_ACCOUNT_KEY,
  CONNECT_CHARGES_KEY,
  CONNECT_PAYOUTS_KEY,
} from "@/lib/stripe-connect";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/dues/connect — Stripe Connect (Express) onboarding for the CURRENT
 * chapter. Admin-only. Per-chapter Connect state lives in this chapter's
 * SiteConfig; because admin requests carry the chapter Host, the request-context
 * `prisma` / `getSiteConfig` resolve to the right schema automatically.
 *
 * This route is ADDITIVE: it only ever attaches a payout account to the chapter.
 * It never touches dues/donation collection — a chapter that never calls this
 * keeps the exact legacy behavior (platform collects).
 *
 *   POST  → create an Express account (if none yet), persist its id, then return
 *           { url } to a fresh hosted onboarding link.
 *   GET   → return the live { connected, accountId, chargesEnabled,
 *           payoutsEnabled, detailsSubmitted } status, mirroring Stripe's flags
 *           back into SiteConfig so the checkout gate can read them cheaply.
 *
 * 503 when Stripe is not configured (getStripe() null).
 */

/** Persist a single SiteConfig key for the current tenant (best-effort). */
async function setCfg(key: string, value: string): Promise<void> {
  await prisma.siteConfig
    .upsert({ where: { key }, update: { value }, create: { key, value } })
    .catch(() => {});
}

export async function GET() {
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const cfg = await getSiteConfig().catch(() => ({}) as Record<string, string>);
  const accountId = getConnectAccountId(cfg);

  if (!accountId) {
    return NextResponse.json({
      ok: true,
      connected: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  }

  let status;
  try {
    status = await getAccountStatus(stripe, accountId);
  } catch (err: any) {
    console.error("[/api/dues/connect GET] account retrieve failed:", err?.message);
    // The stored account id is unreadable (deleted/rejected). Report the last
    // known SiteConfig flags rather than 500 so the admin UI still renders.
    return NextResponse.json({
      ok: true,
      connected: true,
      accountId,
      chargesEnabled: cfg[CONNECT_CHARGES_KEY] === "true",
      payoutsEnabled: cfg[CONNECT_PAYOUTS_KEY] === "true",
      detailsSubmitted: false,
      stale: true,
    });
  }

  // Mirror Stripe's live flags back into SiteConfig so the checkout-time gate
  // (isConnectChargesReady) reflects reality without a per-payment Stripe call.
  await setCfg(CONNECT_CHARGES_KEY, status.chargesEnabled ? "true" : "false");
  await setCfg(CONNECT_PAYOUTS_KEY, status.payoutsEnabled ? "true" : "false");

  return NextResponse.json({
    ok: true,
    connected: true,
    accountId,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    detailsSubmitted: status.detailsSubmitted,
  });
}

export async function POST(req: Request) {
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const cfg = await getSiteConfig().catch(() => ({}) as Record<string, string>);
  let accountId = getConnectAccountId(cfg);
  let created = false;

  // Create the Express account on first run, then persist the id so a repeated
  // "Continue setup" reuses the same account (never orphan duplicate accounts).
  if (!accountId) {
    try {
      const account = await createConnectAccount(stripe);
      accountId = account.id;
      created = true;
      await setCfg(CONNECT_ACCOUNT_KEY, accountId);
    } catch (err: any) {
      console.error("[/api/dues/connect POST] account create failed:", err?.message);
      return NextResponse.json(
        { ok: false, error: "Could not create payout account. Try again." },
        { status: 502 },
      );
    }
  }

  // refresh_url loops back to THIS POST so Stripe can mint a fresh link if the
  // first one expires; return_url goes to our /return handler which re-checks
  // status and redirects into the admin.
  const siteUrl = getSiteUrl();
  // Prefer the chapter's own Host (admin requests carry it) so the onboarding
  // return lands back on the chapter's subdomain rather than the platform apex.
  const host = headers().get("host");
  const origin = host ? `https://${host}` : siteUrl;
  const refreshUrl = `${origin}/api/dues/connect`;
  const returnUrl = `${origin}/api/dues/connect/return`;

  let link;
  try {
    link = await createOnboardingLink(stripe, accountId, refreshUrl, returnUrl);
  } catch (err: any) {
    console.error("[/api/dues/connect POST] account link failed:", err?.message);
    return NextResponse.json(
      { ok: false, error: "Could not start payout onboarding. Try again." },
      { status: 502 },
    );
  }

  if (created) {
    await audit({
      action: "DUES_CONNECT_STARTED",
      subjectType: "Settings",
      subjectId: null,
      subjectName: "Stripe Connect",
      details: `Created payout account ${accountId}`,
      req,
    });
  }

  return NextResponse.json({ ok: true, url: link.url });
}
