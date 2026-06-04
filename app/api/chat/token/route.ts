import { NextResponse } from "next/server";
import { getCurrentBrother } from "@/lib/auth";
import { getPortalSession } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
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
 * Auth: resolves either (a) an admin/officer session OR a brother portal session
 * to the underlying Brother row, OR (b) an alumni portal session to the alum's
 * AlumniProfile. Everyone in the chapter — actives + alumni — joins the one
 * `chapter-<subdomain>` channel (a unified chapter space). Anyone who is not a
 * recognized member of this chapter gets 401.
 *
 * Tenant isolation: the channelId is `chapter-<subdomain>`, derived from the
 * request Host inside lib/stream; the Stream user id is tenant-prefixed, so a
 * member of one chapter can't read or post in another's channel. Brother vs alum
 * ids are kept in separate namespaces (`b-`/`a-` prefixes) so they can never
 * collide on the same Stream user.
 *
 * Inert path: when Stream is unconfigured (no STREAM_API_KEY / STREAM_API_SECRET)
 * we return 503 { configured: false } and the UI renders a disabled empty-state.
 * The api SECRET is never included in any response.
 */

type ChatUser = { id: string; name: string; image?: string };

/**
 * Resolve the signed-in chat user — a Brother (admin/officer or brother portal)
 * OR an alum (alumni portal session). Returns null when the caller isn't a
 * recognized member of THIS chapter.
 */
async function resolveChatUser(): Promise<ChatUser | null> {
  // Brother / admin / officer session first (the common case).
  const me = await getCurrentBrother();
  if (me) {
    return {
      id: `b-${me.id}`,
      name: me.name || "Member",
      image: me.headshotUrl || undefined,
    };
  }

  // Alumni portal session → their AlumniProfile (so registered alumni can chat).
  const sess = getPortalSession();
  if (sess && sess.role === "alumni") {
    const portalUser = await prisma.portalUser
      .findUnique({ where: { id: sess.userId }, select: { alumniId: true } })
      .catch(() => null);
    if (portalUser?.alumniId) {
      const alum = await prisma.alumniProfile
        .findUnique({
          where: { id: portalUser.alumniId },
          select: { id: true, fullName: true, preferredName: true },
        })
        .catch(() => null);
      if (alum) {
        return {
          id: `a-${alum.id}`,
          name: alum.preferredName || alum.fullName || "Alumni",
        };
      }
    }
  }

  return null;
}

export async function GET() {
  // 1. Stream not wired up → inert. Report unconfigured BEFORE touching auth so
  //    a chapter that hasn't enabled chat gets a clean, cheap signal.
  if (!isStreamConfigured()) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  // 2. Must be a recognized member of THIS chapter (active OR alum).
  const user = await resolveChatUser();
  if (!user) {
    return NextResponse.json(
      { configured: true, error: "Not signed in" },
      { status: 401 }
    );
  }

  // 3. Mint creds + resolve the tenant channel. getStreamCreds upserts the user
  //    server-side and returns the PUBLIC key + a signed token (never the secret).
  const creds = await getStreamCreds(user.id, user.name, user.image);
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
      name: user.name,
      ...(user.image ? { image: user.image } : {}),
    },
  });
}
