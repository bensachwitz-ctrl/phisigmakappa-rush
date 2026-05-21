import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { buildAuthUrl, isGoogleCalendarConfigured, signOAuthState } from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/google-calendar/connect — kick off the OAuth flow.
 *
 * If Google env-vars aren't set, returns `{ configured: false }`. The UI uses
 * this signal to surface a placeholder "Calendar sync not configured" card.
 *
 * On success returns `{ ok: true, authUrl }`. The client redirects to that URL.
 */
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "Google Calendar not configured" });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/google-calendar/callback`;
  const state = signOAuthState(session.brother.id);
  const authUrl = buildAuthUrl({ redirectUri, state });
  if (!authUrl) {
    return NextResponse.json({ ok: false, configured: false, error: "buildAuthUrl returned null" });
  }
  return NextResponse.json({ ok: true, authUrl });
}
