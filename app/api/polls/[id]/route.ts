import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother, isAdminRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/polls/[id] — delete a poll. Allowed for the creator OR an
 * admin. Cascade on the schema cleans up PollVote rows automatically.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true },
  });
  if (!poll) {
    return NextResponse.json({ ok: false, error: "Poll not found" }, { status: 404 });
  }

  const admin = isAdminRole();
  if (!admin && poll.createdById !== brother.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.poll.delete({ where: { id: poll.id } });
  return NextResponse.json({ ok: true });
}
