import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother, isAdminRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/polls/[id]/close — manually close a poll. Allowed for the poll's
 * creator OR an admin. Idempotent: closing an already-closed poll just returns
 * the same closedAt.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true, closedAt: true },
  });
  if (!poll) {
    return NextResponse.json({ ok: false, error: "Poll not found" }, { status: 404 });
  }

  const admin = isAdminRole();
  if (!admin && poll.createdById !== brother.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (poll.closedAt) {
    return NextResponse.json({ ok: true, closedAt: poll.closedAt.toISOString() });
  }

  const updated = await prisma.poll.update({
    where: { id: poll.id },
    data: { closedAt: new Date() },
    select: { closedAt: true },
  });

  return NextResponse.json({
    ok: true,
    closedAt: updated.closedAt ? updated.closedAt.toISOString() : null,
  });
}
