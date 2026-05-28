import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";
import { parsePollOptions } from "@/lib/poll-options";
import { getPortalSession } from "@/lib/portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VoteSchema = z.object({ optionId: z.string().min(1).max(64) });

function isClosed(p: { closedAt: Date | null; closesAt: Date | null }): boolean {
  if (p.closedAt) return true;
  if (p.closesAt && p.closesAt.getTime() <= Date.now()) return true;
  return false;
}

// Helper to resolve voter details
async function getVoter(req: Request) {
  const brother = await getCurrentBrother();
  if (brother) {
    return { brotherId: brother.id, alumniId: null };
  }

  const sess = getPortalSession();
  if (sess) {
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: sess.userId },
    });
    if (portalUser) {
      if (portalUser.role === "brother" && portalUser.brotherId) {
        return { brotherId: portalUser.brotherId, alumniId: null };
      }
      if (portalUser.role === "alumni" && portalUser.alumniId) {
        return { brotherId: null, alumniId: portalUser.alumniId };
      }
    }
  }

  return { brotherId: null, alumniId: null };
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { brotherId, alumniId } = await getVoter(req);
  if (!brotherId && !alumniId) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { id: true, options: true, closedAt: true, closesAt: true, audience: true },
  });
  if (!poll) {
    return NextResponse.json({ ok: false, error: "Poll not found" }, { status: 404 });
  }
  if (isClosed(poll)) {
    return NextResponse.json({ ok: false, error: "Poll is closed" }, { status: 409 });
  }

  // R48 — enforce poll audience at the vote layer, not just in the feed
  // filters. Before this, a signed-in user who knew a poll id outside their
  // audience (e.g. an alum hitting a BROTHERS-only poll, or vice-versa)
  // could POST a vote even though the UI never surfaces it. Brothers may
  // vote on BROTHERS/ALL polls; alumni on ALUMNI/ALL. Anything else → 403.
  const aud = poll.audience || "BROTHERS";
  const brotherAllowed = aud === "BROTHERS" || aud === "ALL";
  const alumniAllowed = aud === "ALUMNI" || aud === "ALL";
  if ((brotherId && !brotherAllowed) || (alumniId && !alumniAllowed)) {
    return NextResponse.json(
      { ok: false, error: "This poll isn't open to your group." },
      { status: 403 }
    );
  }

  const options = parsePollOptions(poll.options);
  const validIds = new Set(options.map((o) => o.id));
  if (!validIds.has(parsed.data.optionId)) {
    return NextResponse.json({ ok: false, error: "Invalid option" }, { status: 400 });
  }

  let vote;
  if (brotherId) {
    vote = await prisma.pollVote.upsert({
      where: { pollId_brotherId: { pollId: poll.id, brotherId } },
      update: { optionId: parsed.data.optionId },
      create: {
        pollId: poll.id,
        brotherId,
        optionId: parsed.data.optionId,
      },
    });
  } else if (alumniId) {
    vote = await prisma.pollVote.upsert({
      where: { pollId_alumniId: { pollId: poll.id, alumniId } },
      update: { optionId: parsed.data.optionId },
      create: {
        pollId: poll.id,
        alumniId,
        optionId: parsed.data.optionId,
      },
    });
  }

  return NextResponse.json({ ok: true, vote: { optionId: vote?.optionId } });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { brotherId, alumniId } = await getVoter(req);
  if (!brotherId && !alumniId) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  if (brotherId) {
    await prisma.pollVote
      .delete({ where: { pollId_brotherId: { pollId: params.id, brotherId } } })
      .catch(() => {});
  } else if (alumniId) {
    await prisma.pollVote
      .delete({ where: { pollId_alumniId: { pollId: params.id, alumniId } } })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
