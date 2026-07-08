import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setPortalCookie } from "@/lib/portal-auth";
import { getClientIp } from "@/lib/client-ip";
import {
  checkDbThrottle,
  recordDbAttempt,
  clearDbAttempts,
  type DbThrottleOptions,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP+email brute-force throttle: 8 failed attempts within 15 minutes →
// hard-block for the remainder of the window. Alumni passwords are guessable
// targets, so unlimited attempts are unacceptable. DB-backed (shared
// RushSubmitLog count) so the cap holds across serverless instances, and keyed on
// the non-forgeable getClientIp so x-forwarded-for rotation can't dodge it.
const LOGIN_LIMIT: DbThrottleOptions = {
  limit: 8,
  windowMs: 15 * 60 * 1000,
  status: "PORTAL_ALUMNI_LOGIN_FAILED",
};

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

  const throttleKeys = { ip: getClientIp(req), account: `alumni:${email}` };
  const rl = await checkDbThrottle(prisma, throttleKeys, LOGIN_LIMIT);
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
    await recordDbAttempt(prisma, throttleKeys, LOGIN_LIMIT);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Successful login — clear the failed-attempt counter for this key.
  await clearDbAttempts(prisma, throttleKeys, LOGIN_LIMIT);

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
