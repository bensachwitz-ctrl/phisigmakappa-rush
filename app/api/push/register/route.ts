import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { addUserPushToken, removeUserPushToken } from "@/lib/notify/prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Device-token registration for APNs push (the notify "push" channel).
 *
 * The native shell (or the /app web client running in the app WebView) obtains an
 * APNs device token from the OS and POSTs it here so the server can push to this
 * member's device. Tokens are stored per portal user (migration-free, in
 * SiteConfig — see lib/notify/prefs). DELETE removes a token on logout or when
 * APNs reports it Unregistered (410).
 *
 * Auth: the caller must hold a portal session. We bind the token to THAT user, so
 * a caller can only register a device for themselves.
 */
function validToken(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  // APNs tokens are hex; be lenient on length but reject junk/oversized input.
  if (!/^[a-fA-F0-9]{32,200}$/.test(t)) return null;
  return t.toLowerCase();
}

export async function POST(req: Request) {
  const sess = getPortalSession();
  if (!sess) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const token = validToken(body?.token);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Invalid device token" }, { status: 400 });
  }
  try {
    await addUserPushToken(sess.userId, token);
  } catch {
    return NextResponse.json({ ok: false, error: "Could not register device" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const sess = getPortalSession();
  if (!sess) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const token = validToken(body?.token);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Invalid device token" }, { status: 400 });
  }
  try {
    await removeUserPushToken(sess.userId, token);
  } catch {
    return NextResponse.json({ ok: false, error: "Could not remove device" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
