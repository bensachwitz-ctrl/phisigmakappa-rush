import { NextResponse } from "next/server";
import { getCurrentBrother } from "@/lib/auth";
import {
  isStreamConfigured,
  getStreamCreds,
  chapterChannelId,
  ensureChapterChannel,
} from "@/lib/stream";
import { getChapterIdentity } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/chat/token
 *
 * Issues the credentials a signed-in chapter member needs to connect to the
 * real-time chapter chat, scoped to THIS tenant.
 *
 * Auth: getCurrentBrother() resolves either an admin/officer session OR a
 * brother portal session to the underlying Brother row. Anyone who is not a
 * recognized member of this chapter gets 401 — chat is members-only.
 *
 * Tenant isolation: the returned channelId is `chapter-<subdomain>`, derived
 * from the request Host inside lib/stream. Two chapters can never resolve to the
 * same channel, and the Stream user id is tenant-prefixed, so a member of one
 * chapter cannot read or post in another chapter's channel.
 *
 * Inert path: when Stream is unconfigured (no STREAM_API_KEY / STREAM_API_SECRET)
 * we return 503 { configured: false } and the UI renders a disabled empty-state.
 * The api SECRET is never included in any response.
 */
export async function GET() {
  // 1. Stream not wired up → inert. Report unconfigured BEFORE touching auth so
  //    a chapter that hasn't enabled chat gets a clean, cheap signal.
  if (!isStreamConfigured()) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  // 2. Must be a recognized member of THIS chapter (admin OR brother portal).
  const me = await getCurrentBrother();
  if (!me) {
    return NextResponse.json(
      { configured: true, error: "Not signed in" },
      { status: 401 }
    );
  }

  // 3. Mint creds + resolve the tenant channel. getStreamCreds upserts the user
  //    server-side and returns the PUBLIC key + a signed token (never the secret).
  const displayName = me.name || "Member";
  const image = me.headshotUrl || undefined;
  const creds = await getStreamCreds(me.id, displayName, image);
  if (!creds) {
    // Shouldn't happen (we checked isStreamConfigured) but stay defensive.
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  // 4. Pre-provision the chapter channel so the first member in doesn't race an
  //    uncreated channel. Best-effort — chapterChannelId() is the source of truth
  //    for the id regardless of whether provisioning succeeded.
  const identity = await getChapterIdentity().catch(() => null);
  const channelName = identity?.terms?.collective
    ? `${identity.terms.collective} Chat`
    : "Chapter Chat";
  await ensureChapterChannel(creds.userId, { name: channelName });
  const channelId = chapterChannelId();

  return NextResponse.json({
    configured: true,
    apiKey: creds.apiKey,
    token: creds.token,
    userId: creds.userId,
    channelId,
    channelType: "messaging",
    channelName,
    user: {
      id: creds.userId,
      name: displayName,
      ...(image ? { image } : {}),
    },
  });
}
