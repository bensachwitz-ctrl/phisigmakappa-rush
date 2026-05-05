import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";
import { parsePollOptions } from "@/app/api/polls/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST   — auth-gated. Body: { optionId }. Upserts the current brother's
 *          vote on this poll. Rejects if the poll is closed (manually or
 *          via closesAt < now). The composite unique on (pollId, brotherId)
 *          guarantees one row per (poll, brother).
 *
 * DELETE — auth-gated. Clears the current brother's vote on this poll. No-op
 *          if they hadn't voted yet.
 */
const VoteSchema = z.object({ optionId: z.string().min(1).max(64) });

function isClosed(p: { closedAt: Date | null; closesAt: Date | null }): boolean {
  if (p.closedAt) return true;
  if (p.closesAt && p.closesAt.getTime() <= Date.now()) return true;
  return false;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { id: true, options: true, closedAt: true, closesAt: true },
  });
  if (!poll) {
    return NextResponse.json({ ok: false, error: "Poll not found" }, { status: 404 });
  }
  if (isClosed(poll)) {
    return NextResponse.json({ ok: false, error: "Poll is closed" }, { status: 409 });
  }

  const options = parsePollOptions(poll.options);
  const validIds = new Set(options.map((o) => o.id));
  if (!validIds.has(parsed.data.optionId)) {
    return NextResponse.json({ ok: false, error: "Invalid option" }, { status: 400 });
  }

  const vote = await prisma.pollVote.upsert({
    where: { pollId_brotherId: { pollId: poll.id, brotherId: brother.id } },
    update: { optionId: parsed.data.optionId },
    create: {
      pollId: poll.id,
      brotherId: brother.id,
      optionId: parsed.data.optionId,
    },
  });

  return NextResponse.json({ ok: true, vote: { optionId: vote.optionId } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  await prisma.pollVote
    .delete({ where: { pollId_brotherId: { pollId: params.id, brotherId: brother.id } } })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
