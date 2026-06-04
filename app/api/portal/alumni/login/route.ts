import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setPortalCookie } from "@/lib/portal-auth";
import {
  rateLimit,
  recordRateLimit,
  clearRateLimit,
  clientIpFromRequest,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP+email brute-force throttle: 8 failed attempts within 15 minutes →
// hard-block for the remainder of the window. Alumni passwords are guessable
// targets, so unlimited attempts are unacceptable.
const LOGIN_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const rlKey = `portal-alumni:${clientIpFromRequest(req)}:${email}`;
  const rl = rateLimit(rlKey, LOGIN_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many failed attempts. Wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const user = await prisma.portalUser.findFirst({
    where: { email, role: "alumni" },
  });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    recordRateLimit(rlKey, LOGIN_LIMIT);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Successful login — clear the failed-attempt counter for this key.
  clearRateLimit(rlKey);

  // Update last login
  await prisma.portalUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  setPortalCookie(user.id, "alumni");

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
