import { NextResponse } from "next/server";
import { prisma, centralDb, getTenantClient, getSubdomain } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { getChapterIdentity, chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { rateLimit, recordRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { generateOtpCode, issueOtp, OTP_TTL_MS } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/portal/reset/request — STEP 1 of the OTP password reset.
 * ──────────────────────────────────────────────────────────────────────────
 * Body: { email, role: "brother" | "alumni", subdomain? }
 *
 * Looks up the portal account by email WITHIN THE TENANT, generates a 6-digit
 * one-time code, stores ONLY its hash (lib/otp) with a ~10-minute expiry +
 * single-use, EMAILS the code via the on-hand provider (sendEmail → Resend /
 * listmonk / honest mock), and ALWAYS responds with the same neutral message so
 * the endpoint never reveals whether an account exists (no enumeration).
 *
 * Why a fresh route instead of editing /api/portal/forgot-password: that route
 * implements the legacy magic-LINK reset (long token in the URL, 2h). This is
 * the owner's PHASE-3 OTP flow (short typed code, hashed, 10 min) and lives
 * beside it so neither regresses the other.
 */

// Per-IP + per-account throttle on code requests: 5 / 15 min. Caps inbox
// flooding (one host spraying addresses) AND code-churn against one victim.
const REQUEST_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

// One neutral message for EVERY outcome (found / not-found / send-failed). The
// only way to learn whether an account exists is to receive the email, so the
// HTTP response can never be used to enumerate accounts.
const NEUTRAL = "If an account exists for that email, a reset code has been sent.";

export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

async function handlePost(req: Request): Promise<NextResponse> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "").trim().toLowerCase();

  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  }
  if (role !== "brother" && role !== "alumni") {
    return NextResponse.json({ error: "Invalid portal role." }, { status: 400 });
  }

  // ── TENANT RESOLUTION ──────────────────────────────────────────────────
  // Web path: the chapter is resolved from the request Host by the `prisma`
  // proxy; we read the same subdomain off the Host so the OTP hash is bound to
  // the SAME tenant string the session helpers use. Native/apex path: the body
  // carries the chapter `subdomain` (no chapter Host header), so we bind an
  // explicit tenant client AND use that subdomain for the hash binding.
  const bodySubdomain = String(body.subdomain || "").trim().toLowerCase();
  let db = prisma;
  let tenant: string;
  if (bodySubdomain) {
    const t = await centralDb.tenant
      .findUnique({ where: { subdomain: bodySubdomain } })
      .catch(() => null);
    // Neutral response even on unknown/inactive chapter so a caller can't probe
    // which chapters exist via this endpoint either.
    if (!t || !t.isActive) {
      return NextResponse.json({ ok: true, message: NEUTRAL });
    }
    db = getTenantClient(bodySubdomain);
    tenant = bodySubdomain;
  } else {
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
    tenant = getSubdomain(host) || "_apex";
  }

  // ── RATE LIMIT (record unconditionally — reflects real send pressure) ───
  const ip = clientIpFromRequest(req);
  const ipKey = `portal-otp-req:ip:${ip}`;
  const acctKey = `portal-otp-req:acct:${tenant}:${role}:${email}`;
  const ipRl = rateLimit(ipKey, REQUEST_LIMIT);
  const acctRl = rateLimit(acctKey, REQUEST_LIMIT);
  if (!ipRl.ok || !acctRl.ok) {
    const retryAfter = Math.max(ipRl.retryAfterSec, acctRl.retryAfterSec);
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  recordRateLimit(ipKey, REQUEST_LIMIT);
  recordRateLimit(acctKey, REQUEST_LIMIT);

  // ── ACCOUNT LOOKUP (tenant-scoped) ──────────────────────────────────────
  const portalUser = await db.portalUser
    .findFirst({
      where: { email: { equals: email, mode: "insensitive" }, role },
    })
    .catch(() => null);

  // No account → STILL return the neutral message (no enumeration). We do NOT
  // generate or store anything.
  if (!portalUser) {
    return NextResponse.json({ ok: true, message: NEUTRAL });
  }

  // ── GENERATE + STORE (hash only) ────────────────────────────────────────
  const code = generateOtpCode();
  const { codeHash, expiresAt } = issueOtp(code, tenant, OTP_TTL_MS);

  try {
    // Invalidate any outstanding (unused) codes for this account so only the
    // freshest code is ever redeemable — limits the live-code surface.
    await db.portalPasswordReset.updateMany({
      where: { portalUserId: portalUser.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await db.portalPasswordReset.create({
      data: {
        portalUserId: portalUser.id,
        codeHash,
        email,
        role,
        expiresAt,
        requestIp: ip,
      },
    });
  } catch (err) {
    // A storage failure must not leak via a different response — keep neutral.
    console.error("[reset/request] failed to persist OTP:", err);
    return NextResponse.json({ ok: true, message: NEUTRAL });
  }

  // ── EMAIL THE CODE (real send; never faked) ─────────────────────────────
  try {
    let identity;
    let brandHex = "";
    if (bodySubdomain) {
      const rows = await db.siteConfig
        .findMany()
        .catch(() => [] as { key: string; value: string }[]);
      const cfg: Record<string, string> = {};
      for (const r of rows) cfg[r.key] = r.value;
      identity = chapterIdentityFromCfg(cfg);
      brandHex = cfg["brand.primaryHex"] || "";
    } else {
      identity = await getChapterIdentity();
      const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
      brandHex = cfg["brand.primaryHex"] || "";
    }

    const ttlMin = Math.round(OTP_TTL_MS / 60000);
    const html = renderEmail({
      brandHex,
      chapterName: identity.chapterAttribution,
      chapterSubline: identity.schoolName || undefined,
      heading: "Your password reset code",
      bodyHtml:
        `<p style="margin:0 0 16px;">Use the code below to reset your Greekstack password. It expires in ${ttlMin} minutes and can be used once.</p>` +
        `<p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.3em;font-family:'Courier New',monospace;">${code}</p>`,
      footerNote: `If you didn't request this, you can safely ignore this email. This code expires in ${ttlMin} minutes.`,
    });
    const text = renderEmailText({
      heading: "Your password reset code",
      lines: [
        `Your Greekstack password reset code is: ${code}`,
        `It expires in ${ttlMin} minutes and can be used once.`,
        "If you didn't request this, you can ignore this email.",
      ],
      chapterName: identity.chapterAttribution,
    });

    // sendEmail() is honest: it returns provider "mock" (never a fake "sent")
    // when no email key is configured. We do not branch on the result here —
    // the response stays neutral regardless so the outcome can't be probed.
    await sendEmail({
      to: email,
      subject: `Your ${identity.fraternityShort} password reset code`,
      html,
      text,
    });
  } catch (err) {
    console.error("[reset/request] failed to send OTP email:", err);
  }

  // SECURITY: only echo the code in TRUE local development (never on *.vercel.app
  // production). NODE_ENV is the only trustworthy signal — substring host checks
  // would leak the code in prod.
  const isDev = process.env.NODE_ENV === "development";
  return NextResponse.json({
    ok: true,
    message: NEUTRAL,
    ...(isDev ? { devCode: code } : {}),
  });
}
