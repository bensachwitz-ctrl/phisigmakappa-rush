import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, isGoogleCalendarConfigured, verifyOAuthState } from "@/lib/google-calendar";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/google-calendar/callback?code=...&state=...
 *
 * Google redirects here after consent. We:
 *   1. Verify the signed state.
 *   2. Exchange the code for tokens.
 *   3. Upsert a GoogleCalendarLink row tied to the brotherId encoded in state.
 *   4. Redirect to /account/calendar with a success/error toast param.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = url.origin;

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${origin}/account/calendar?error=not_configured`);
  }
  const brotherId = verifyOAuthState(state);
  if (!brotherId) {
    return NextResponse.redirect(`${origin}/account/calendar?error=state_invalid`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/account/calendar?error=no_code`);
  }
  const result = await exchangeCodeForTokens({
    code,
    redirectUri: `${origin}/api/google-calendar/callback`,
  });
  if (!result.ok) {
    return NextResponse.redirect(`${origin}/account/calendar?error=exchange_failed`);
  }
  // Decode the id_token if present to extract the email. We do a minimal parse:
  // id_token is base64url(payload). If unavailable, leave googleEmail blank.
  let googleEmail = "";
  if (result.idToken) {
    try {
      const payload = JSON.parse(Buffer.from(result.idToken.split(".")[1], "base64url").toString("utf8"));
      googleEmail = String(payload.email || "");
    } catch {
      googleEmail = "";
    }
  }
  await prisma.googleCalendarLink.upsert({
    where: { brotherId },
    create: {
      brotherId,
      googleEmail,
      refreshToken: result.refreshToken,
      syncEnabled: true,
    },
    update: {
      googleEmail,
      refreshToken: result.refreshToken,
      syncEnabled: true,
    },
  });

  try {
    const brother = await prisma.brother
      .findUnique({ where: { id: brotherId }, select: { id: true, name: true } })
      .catch(() => null);
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("calendar.link.create", {
      actor: {
        brotherId: brother?.id ?? brotherId,
        name: brother?.name ?? "Brother",
        role: "member",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "GoogleCalendarLink",
        id: brotherId,
        name: brother?.name ?? brotherId,
      },
      payload: { googleEmail },
    });
  } catch {
    // best-effort
  }

  return NextResponse.redirect(`${origin}/account/calendar?ok=1`);
}
