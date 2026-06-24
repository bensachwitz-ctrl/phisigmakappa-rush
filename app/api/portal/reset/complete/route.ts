import { NextResponse } from "next/server";
import { prisma, getTenantClient, getSubdomain } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { verifyPortalTokenForTenant, PORTAL_COOKIE } from "@/lib/portal-auth";
import { rateLimit, recordRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { validateNewPassword } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/portal/reset/complete — STEP 3 of the OTP password reset.
 * ──────────────────────────────────────────────────────────────────────────
 * Body: { password, confirm, subdomain? } — authenticated by the mustReset
 * portal SESSION cookie issued in step 2 (NOT by re-presenting the code).
 *
 * Requires a valid portal session whose PortalUser has mustReset=true. Validates
 * the new password (strength + match), updates the scrypt hash, clears
 * mustReset, and invalidates any outstanding reset codes — then the member is in
 * the app. A session that is NOT mustReset is rejected (this endpoint only
 * services the forced-reset step, never an arbitrary password change).
 */

const COMPLETE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

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

  const password = String(body.password || "");
  const confirm = String(body.confirm ?? body.confirmPassword ?? "");

  // ── TENANT RESOLUTION + SESSION VERIFY ─────────────────────────────────
  const bodySubdomain = String(body.subdomain || "").trim().toLowerCase();
  let db = prisma;
  let tenant: string;
  if (bodySubdomain) {
    db = getTenantClient(bodySubdomain);
    tenant = bodySubdomain;
  } else {
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
    tenant = getSubdomain(host) || "_apex";
  }

  // Read the portal cookie from the request and verify it against THIS tenant
  // (the same per-tenant HMAC the session uses) — a cookie minted for chapter A
  // cannot authorize a reset on chapter B.
  const cookieHeader = req.headers.get("cookie") || "";
  const token = readCookie(cookieHeader, PORTAL_COOKIE);
  const session = verifyPortalTokenForTenant(token, tenant);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated. Verify your code first." }, { status: 401 });
  }

  // ── RATE LIMIT ──────────────────────────────────────────────────────────
  const ip = clientIpFromRequest(req);
  const rlKey = `portal-otp-complete:${ip}:${session.userId}`;
  const rl = rateLimit(rlKey, COMPLETE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  recordRateLimit(rlKey, COMPLETE_LIMIT);

  // ── VALIDATE NEW PASSWORD (strength + match) ───────────────────────────
  const strength = validateNewPassword(password);
  if (!strength.ok) {
    return NextResponse.json({ error: strength.error }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  // The session's PortalUser MUST be in the must-reset state. This is what binds
  // /complete to a real OTP redemption: an ordinary logged-in member (mustReset
  // false) gets 403, so this endpoint can never be used as an unauthenticated
  // password-change for an existing session.
  const portalUser = await db.portalUser
    .findUnique({ where: { id: session.userId } })
    .catch(() => null);

  if (!portalUser) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (!portalUser.mustReset) {
    return NextResponse.json(
      { error: "This session is not in a password-reset state." },
      { status: 403 },
    );
  }

  // ── APPLY ──────────────────────────────────────────────────────────────
  const hashed = hashPassword(password);
  try {
    await db.portalUser.update({
      where: { id: portalUser.id },
      data: {
        passwordHash: hashed,
        mustReset: false,
        lastLoginAt: new Date(),
        // Defense-in-depth: clear any legacy magic-link token too.
        magicToken: null,
        magicTokenExpiresAt: null,
      },
    });
    // Keep a linked Brother row's password in sync (mirrors reset-password).
    if (portalUser.role === "brother" && portalUser.brotherId) {
      await db.brother
        .update({ where: { id: portalUser.brotherId }, data: { passwordHash: hashed } })
        .catch(() => {});
    }
    // Invalidate any outstanding (unused) codes — belt-and-suspenders.
    await db.portalPasswordReset
      .updateMany({
        where: { portalUserId: portalUser.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      .catch(() => {});
  } catch (err) {
    console.error("[reset/complete] failed to update password:", err);
    return NextResponse.json({ error: "Could not update password. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role: portalUser.role });
}

/** Minimal cookie parser — read one named cookie from a Cookie header. */
function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}
