import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  rateLimit,
  recordRateLimit,
  clearRateLimit,
  clientIpFromRequest,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP + per-token throttle on token redemption: ~10 / hour. The reset token
// is a random 24-byte secret, but rate-limiting the redemption endpoint removes
// any online brute-force margin and caps abuse of a leaked/guessed token. Same
// reusable in-memory limiter the portal logins use.
const RESET_REDEEM_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = String(body.token || "").trim();
  const password = String(body.password || "").trim();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }

  // Rate-limit BEFORE the password-length check / DB lookup so neither becomes a
  // free probe. Key on IP (blocks a host enumerating tokens) AND on the token
  // itself (caps redemption attempts against one captured token). Either bucket
  // tripping → 429.
  const ip = clientIpFromRequest(req);
  const ipKey = `portal-reset:ip:${ip}`;
  const tokenKey = `portal-reset:token:${token}`;
  const ipRl = rateLimit(ipKey, RESET_REDEEM_LIMIT);
  const tokenRl = rateLimit(tokenKey, RESET_REDEEM_LIMIT);
  if (!ipRl.ok || !tokenRl.ok) {
    const retryAfter = Math.max(ipRl.retryAfterSec, tokenRl.retryAfterSec);
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
  }

  // Find PortalUser by magicToken
  const portalUser = await prisma.portalUser.findFirst({
    where: {
      magicToken: token,
      magicTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!portalUser) {
    // Record a hit only on a failed (invalid/expired) redemption so legitimate
    // single-use resets are never throttled, but token-guessing burns the bucket.
    recordRateLimit(ipKey, RESET_REDEEM_LIMIT);
    recordRateLimit(tokenKey, RESET_REDEEM_LIMIT);
    return NextResponse.json({ error: "Invalid or expired password reset token." }, { status: 400 });
  }

  // Hash new password
  const hashedPassword = hashPassword(password);

  // Update PortalUser password
  await prisma.portalUser.update({
    where: { id: portalUser.id },
    data: {
      passwordHash: hashedPassword,
      magicToken: null,
      magicTokenExpiresAt: null,
    },
  });

  // If a brother record is linked, update it there too
  if (portalUser.role === "brother" && portalUser.brotherId) {
    await prisma.brother.update({
      where: { id: portalUser.brotherId },
      data: { passwordHash: hashedPassword },
    });
  }

  // Successful redemption — clear the throttle counters for this IP + token.
  clearRateLimit(ipKey);
  clearRateLimit(tokenKey);

  return NextResponse.json({ ok: true, message: "Password has been reset successfully." });
}
