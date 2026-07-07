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
// hard-block for the remainder of the window. Brother passwords are guessable
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

  const rlKey = `portal-brother:${clientIpFromRequest(req)}:${email}`;
  const rl = rateLimit(rlKey, LOGIN_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many failed attempts. Wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // 1. Try to find the user in PortalUser (unified portal login)
  let portalUser = await prisma.portalUser.findFirst({
    where: { email, role: "brother" },
  });

  let brotherId = portalUser?.brotherId;

  // 2. If no PortalUser exists, try to find a matching Brother row with a passwordHash
  if (!portalUser) {
    const brother = await prisma.brother.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        passwordHash: { not: null },
      },
    });

    if (brother && brother.passwordHash && verifyPassword(password, brother.passwordHash)) {
      // Auto-provision a PortalUser row so they have a unified login session.
      // GUARD the unique-email collision: PortalUser.email is GLOBALLY unique
      // (not per-role), so a person who already owns a PortalUser under a
      // DIFFERENT role (e.g. they registered as alumni) collides here. The
      // role-scoped findFirst above misses that row, so without this guard the
      // create() throws Prisma P2002 → an UNHANDLED 500, and a real brother whose
      // email is already an alumni PortalUser could NEVER log in. On collision we
      // re-query the existing row by email and LINK it to this Brother instead of
      // crashing — implementing the intended unified brother/alumnus login.
      try {
        portalUser = await prisma.portalUser.create({
          data: {
            role: "brother",
            email,
            passwordHash: brother.passwordHash,
            brotherId: brother.id,
            lastLoginAt: new Date(),
          },
        });
        brotherId = brother.id;
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
        const existing = await prisma.portalUser.findUnique({ where: { email } });
        if (!existing) {
          recordRateLimit(rlKey, LOGIN_LIMIT);
          return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }
        // Link the pre-existing account to this Brother (preserve any existing
        // brotherId) and reuse it for the session rather than 500-ing.
        portalUser = await prisma.portalUser.update({
          where: { id: existing.id },
          data: {
            brotherId: existing.brotherId ?? brother.id,
            lastLoginAt: new Date(),
          },
        });
        brotherId = portalUser.brotherId ?? brother.id;
      }
    }
  } else if (portalUser.passwordHash && verifyPassword(password, portalUser.passwordHash)) {
    // PortalUser exists and password is correct, update login timestamp
    await prisma.portalUser.update({
      where: { id: portalUser.id },
      data: { lastLoginAt: new Date() },
    });
  } else {
    // PortalUser exists but password doesn't match
    recordRateLimit(rlKey, LOGIN_LIMIT);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // If no user was matched/created above
  if (!portalUser) {
    recordRateLimit(rlKey, LOGIN_LIMIT);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Successful login — clear the failed-attempt counter for this key.
  clearRateLimit(rlKey);

  // Set the portal cookie
  setPortalCookie(portalUser.id, "brother");

  return NextResponse.json({
    ok: true,
    user: {
      id: portalUser.id,
      email: portalUser.email,
      role: portalUser.role,
      brotherId: brotherId,
    },
  });
}
