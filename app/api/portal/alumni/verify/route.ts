import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setPortalCookie } from "@/lib/portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email-verification landing for SELF-SERVE alumni registration.
 *
 * /api/portal/alumni/register creates the account but issues NO session for a
 * self-serve sign-up — it emails a single-use token here instead. Only when the
 * alumnus proves control of the email by opening this link do we issue the alumni
 * cookie. This is the gate that stops an unverified self-signup from instantly
 * reading the brother roster / active-PNM PII (the near-P0 privacy hole).
 *
 * Single-use: the token is cleared on success so a forwarded/replayed link is
 * inert. GET (email links are GETs); redirects to the dashboard on success or
 * back to the alumni landing with an error flag otherwise.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const landing = new URL("/portal/alumni", url.origin);

  if (!token) {
    landing.searchParams.set("verify", "invalid");
    return NextResponse.redirect(landing);
  }

  let user;
  try {
    user = await prisma.portalUser.findFirst({
      where: {
        magicToken: token,
        role: "alumni",
        magicTokenExpiresAt: { gt: new Date() },
      },
    });
  } catch {
    landing.searchParams.set("verify", "error");
    return NextResponse.redirect(landing);
  }

  if (!user) {
    landing.searchParams.set("verify", "invalid");
    return NextResponse.redirect(landing);
  }

  // Burn the token (single-use) and record activation, then issue the session.
  try {
    await prisma.portalUser.update({
      where: { id: user.id },
      data: { magicToken: null, magicTokenExpiresAt: null, lastLoginAt: new Date() },
    });
  } catch {
    landing.searchParams.set("verify", "error");
    return NextResponse.redirect(landing);
  }

  setPortalCookie(user.id, "alumni");
  return NextResponse.redirect(new URL("/portal/alumni/dashboard", url.origin));
}
