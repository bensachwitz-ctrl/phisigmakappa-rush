import { NextResponse } from "next/server";
import { prisma, centralDb, getTenantClient, getSubdomain } from "@/lib/prisma";
import { setPortalCookie, type PortalRole } from "@/lib/portal-auth";
import { rateLimit, recordRateLimit, clearRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { verifyOtp, isOtpExpired, isOtpUsed, isValidOtpFormat } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/portal/reset/verify — STEP 2 of the OTP password reset.
 * ──────────────────────────────────────────────────────────────────────────
 * Body: { email, role, code, subdomain? }
 *
 * Verifies the 6-digit code (constant-time, not-expired, not-used) against the
 * freshest stored hash for that account WITHIN THE TENANT. On success it marks
 * the code used (single-use), flags the PortalUser `mustReset = true`, and
 * issues a portal SESSION cookie — but because `mustReset` is set, that session
 * can ONLY reach the "create new password" step (enforced by the portal gate)
 * until the password is reset. Returns a generic "Invalid or expired code" on
 * every failure (no distinction that could enumerate or leak code state).
 */

// Per-IP + per-account redemption throttle: 8 / 15 min. Caps online guessing of
// the small 6-digit keyspace; combined with the 10-min expiry this makes brute
// force infeasible.
const VERIFY_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000 };

const INVALID = "Invalid or expired code.";

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
  const code = String(body.code || "").trim();

  if (!email || !role || !code) {
    return NextResponse.json({ error: "Email, role, and code are required." }, { status: 400 });
  }
  if (role !== "brother" && role !== "alumni") {
    return NextResponse.json({ error: "Invalid portal role." }, { status: 400 });
  }

  // ── TENANT RESOLUTION (mirrors reset/request) ──────────────────────────
  const bodySubdomain = String(body.subdomain || "").trim().toLowerCase();
  let db = prisma;
  let tenant: string;
  if (bodySubdomain) {
    const t = await centralDb.tenant
      .findUnique({ where: { subdomain: bodySubdomain } })
      .catch(() => null);
    if (!t || !t.isActive) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }
    db = getTenantClient(bodySubdomain);
    tenant = bodySubdomain;
  } else {
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
    tenant = getSubdomain(host) || "_apex";
  }

  // ── RATE LIMIT (key on IP + account) ────────────────────────────────────
  const ip = clientIpFromRequest(req);
  const ipKey = `portal-otp-verify:ip:${ip}`;
  const acctKey = `portal-otp-verify:acct:${tenant}:${role}:${email}`;
  const ipRl = rateLimit(ipKey, VERIFY_LIMIT);
  const acctRl = rateLimit(acctKey, VERIFY_LIMIT);
  if (!ipRl.ok || !acctRl.ok) {
    const retryAfter = Math.max(ipRl.retryAfterSec, acctRl.retryAfterSec);
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // Cheap format gate before any DB work — also keeps the timing uniform-ish.
  if (!isValidOtpFormat(code)) {
    recordRateLimit(ipKey, VERIFY_LIMIT);
    recordRateLimit(acctKey, VERIFY_LIMIT);
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  // ── LOOK UP THE FRESHEST CODE FOR THIS ACCOUNT (tenant-scoped) ──────────
  const portalUser = await db.portalUser
    .findFirst({ where: { email: { equals: email, mode: "insensitive" }, role } })
    .catch(() => null);

  // Fold "no account" into the same generic failure → no enumeration.
  if (!portalUser) {
    recordRateLimit(ipKey, VERIFY_LIMIT);
    recordRateLimit(acctKey, VERIFY_LIMIT);
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const reset = await db.portalPasswordReset
    .findFirst({
      where: { portalUserId: portalUser.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  const now = new Date();
  const valid =
    !!reset &&
    !isOtpUsed(reset) &&
    !isOtpExpired(reset, now) &&
    verifyOtp(code, reset.codeHash, tenant);

  if (!valid || !reset) {
    // Burn a bucket hit on every failed redemption so guessing is throttled.
    recordRateLimit(ipKey, VERIFY_LIMIT);
    recordRateLimit(acctKey, VERIFY_LIMIT);
    // Best-effort attempt counter for forensics (non-fatal).
    if (reset) {
      await db.portalPasswordReset
        .update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } })
        .catch(() => {});
    }
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  // ── SUCCESS: mark code used (single-use) + flag must-reset ──────────────
  // Marking usedAt here means even a replay of the same code in the verify step
  // can never produce a second session — it's consumed the instant it verifies.
  try {
    await db.portalPasswordReset.update({
      where: { id: reset.id },
      data: { usedAt: now },
    });
    await db.portalUser.update({
      where: { id: portalUser.id },
      data: { mustReset: true },
    });
  } catch (err) {
    console.error("[reset/verify] failed to consume code:", err);
    return NextResponse.json({ error: "Could not complete verification. Try again." }, { status: 500 });
  }

  // Successful redemption — clear the throttle counters.
  clearRateLimit(ipKey);
  clearRateLimit(acctKey);

  // Issue the portal session. mustReset=true gates it to the reset step only —
  // the portal layout redirects any mustReset session to "create new password"
  // until lib/otp's complete step clears the flag.
  if (bodySubdomain) {
    // Apex/native: bind the cookie explicitly to the chapter tenant (see
    // setPortalCookieForTenant note in portal-auth — here the Host is the apex,
    // so we cannot use the Host-derived setPortalCookie).
    const { signPortalTokenForTenant, PORTAL_COOKIE } = await import("@/lib/portal-auth");
    const { cookies } = await import("next/headers");
    cookies().set(PORTAL_COOKIE, signPortalTokenForTenant(portalUser.id, role as PortalRole, tenant), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  } else {
    setPortalCookie(portalUser.id, role as PortalRole);
  }

  return NextResponse.json({ ok: true, mustReset: true });
}
