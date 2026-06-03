import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getPlatformStripe, createOrRefreshConnectOnboarding } from "@/lib/platform-billing";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/connect
 *
 * Admin-only. For the `dues_split` plan: creates (or reuses) a Stripe Connect
 * account for the chapter and returns a fresh Account Link onboarding `{ url }`.
 * The created account id is persisted to SiteConfig `billing.connectAccountId`
 * so subsequent clicks reuse the same account (and so dues checkout can route
 * destination charges to it once charges are enabled).
 *
 * Inert by default: 503 when `STRIPE_PLATFORM_SECRET_KEY` is unset.
 *
 * Note: we persist ONLY the account id (a non-secret reference). Charges aren't
 * actually routed through the platform until the webhook records
 * `billing.connectChargesEnabled = "true"` from an `account.updated` event.
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
  const existingAccountId = cfg["billing.connectAccountId"] || undefined;

  let chapterName: string | undefined;
  try {
    const identity = await getChapterIdentity();
    chapterName = identity.chapterFullName;
  } catch {
    chapterName = cfg["chapter.fraternityName"] || undefined;
  }
  const email = cfg["contact.advisorEmail"] || cfg["contact.rushEmail"] || undefined;

  let result;
  try {
    result = await createOrRefreshConnectOnboarding(stripe, {
      existingAccountId,
      email,
      chapterName,
    });
  } catch (err: any) {
    console.error("[/api/billing/connect] Stripe create/link failed:", err?.message);
    return NextResponse.json(
      { ok: false, error: "Could not start payout onboarding. Try again." },
      { status: 502 },
    );
  }

  // Persist the account id (non-secret) if it's new or changed. Best-effort —
  // even if this write fails the onboarding link still works, and the webhook
  // will re-persist the id from account.updated.
  if (result.accountId && result.accountId !== existingAccountId) {
    await prisma.siteConfig
      .upsert({
        where: { key: "billing.connectAccountId" },
        update: { value: result.accountId },
        create: { key: "billing.connectAccountId", value: result.accountId },
      })
      .catch((e) => console.error("[/api/billing/connect] persist accountId failed:", e));
  }

  await audit({
    action: "PLATFORM_CONNECT_ONBOARDING",
    subjectType: "Billing",
    subjectId: null,
    subjectName: "dues_split",
    details: existingAccountId ? "Refreshed Connect onboarding link" : "Created Connect account + onboarding link",
    req,
  });

  return NextResponse.json({ ok: true, url: result.url });
}
