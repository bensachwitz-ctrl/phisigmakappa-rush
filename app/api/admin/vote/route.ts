import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrotherId, isAdminAuthed } from "@/lib/auth";
import { guardOfficerOrAdmin } from "@/lib/permissions";
import { guardBillingWrite } from "@/lib/billing-guard";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowed values: -2 strong-no, -1 no, 1 yes, 2 strong-yes.
// 0 is intentionally rejected — the prior version accepted 0 and stored a
// neutral row that then counted toward voteCount even though the brother
// hadn't really voted. The UI now sends DELETE to clear instead.
const VoteSchema = z.object({
  rushId: z.string().min(1),
  value: z.union([z.literal(-2), z.literal(-1), z.literal(1), z.literal(2)]),
  comment: z.string().max(2000).optional().or(z.literal("")),
});

const DeleteSchema = z.object({
  rushId: z.string().min(1),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  {
    const billingLocked = await guardBillingWrite();
    if (billingLocked) return billingLocked;
  }
  const brotherId = getCurrentBrotherId();
  if (!brotherId) {
    return NextResponse.json({ ok: false, error: "No brother session" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const { rushId, value, comment } = parsed.data;

  // Ensure both records exist (FK guard)
  const [brother, rush] = await Promise.all([
    prisma.brother.findUnique({ where: { id: brotherId } }),
    prisma.rush.findUnique({ where: { id: rushId } }),
  ]);
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Brother record missing — sign out and back in." }, { status: 401 });
  }
  if (!rush) {
    return NextResponse.json({ ok: false, error: "Rush not found" }, { status: 404 });
  }

  // Capture prior vote value (if any) for the audit diff so the log reads
  // "+1 → +2" not just "+2".
  const prior = await prisma.vote.findUnique({
    where: { rushId_brotherId: { rushId, brotherId } },
    select: { value: true },
  }).catch(() => null);

  // Concurrent double-submit from the same voter can race the
  // @@unique([rushId, brotherId]) constraint: both requests see no existing
  // row and both try to create, so the loser's create throws a P2002 unique
  // violation. The DB still guarantees exactly one vote row, so this is not
  // data corruption — just a lost race. Catch P2002 and re-read the settled
  // row so both callers get 200 with the winning vote instead of a 500.
  let vote: Awaited<ReturnType<typeof prisma.vote.upsert>>;
  try {
    vote = await prisma.vote.upsert({
      where: { rushId_brotherId: { rushId, brotherId } },
      update: { value, comment: comment || null },
      create: { rushId, brotherId, value, comment: comment || null },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const settled = await prisma.vote.findUnique({
        where: { rushId_brotherId: { rushId, brotherId } },
      });
      // The unique row is guaranteed to exist here (P2002 fired precisely
      // because a concurrent request created it), but guard the null case so a
      // torn read still returns a clean 200 rather than throwing.
      if (!settled) {
        return NextResponse.json({ ok: true, vote: null });
      }
      vote = settled;
    } else {
      throw err;
    }
  }

  await audit({
    action: prior ? "RUSH_VOTE_CHANGE" : "RUSH_VOTE_CAST",
    subjectType: "Rush",
    subjectId: rushId,
    subjectName: rush.name,
    details: prior
      ? `${prior.value >= 0 ? "+" : ""}${prior.value} → ${value >= 0 ? "+" : ""}${value}`
      : `${value >= 0 ? "+" : ""}${value}`,
    req,
  });

  return NextResponse.json({ ok: true, vote });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  {
    const billingLocked = await guardBillingWrite();
    if (billingLocked) return billingLocked;
  }
  const brotherId = getCurrentBrotherId();
  if (!brotherId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  // Snapshot rush name + prior value for the audit trail before deletion.
  const [rush, prior] = await Promise.all([
    prisma.rush.findUnique({ where: { id: parsed.data.rushId }, select: { name: true } }).catch(() => null),
    prisma.vote.findUnique({
      where: { rushId_brotherId: { rushId: parsed.data.rushId, brotherId } },
      select: { value: true },
    }).catch(() => null),
  ]);
  await prisma.vote
    .delete({ where: { rushId_brotherId: { rushId: parsed.data.rushId, brotherId } } })
    .catch(() => null);
  if (prior) {
    await audit({
      action: "RUSH_VOTE_CLEARED",
      subjectType: "Rush",
      subjectId: parsed.data.rushId,
      subjectName: rush?.name || null,
      details: `cleared (was ${prior.value >= 0 ? "+" : ""}${prior.value})`,
      req,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  // This GET returns every vote WITH the voter's identity (include: brother) —
  // sensitive PNM data. Gate it on the coarse officer/admin floor (API twin of
  // the /admin layout boundary), not isAdminAuthed() alone, so a plain
  // member-login cookie can't read who voted what straight from the JSON.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  const rushId = url.searchParams.get("rushId");
  if (!rushId) return NextResponse.json({ ok: false }, { status: 400 });
  const votes = await prisma.vote.findMany({
    where: { rushId },
    include: { brother: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ votes });
}
