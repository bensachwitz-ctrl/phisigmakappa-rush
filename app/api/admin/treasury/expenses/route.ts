import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, getCurrentBrother } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Treasury — EXPENSE / reimbursement queue (admin side).
 *
 *   GET   ?status=PENDING   list expenses (optionally filtered by status)
 *   PATCH { id, status }    treasurer decides — sets status, stamps
 *                           decidedByName + decidedAt
 *
 * Authorization: the reimbursement queue is chapter money, so both handlers
 * require the "payments" officer domain (Treasurer writes; admins/president
 * short-circuit via superAdmin) — read to view the queue, write to decide.
 * isAdminAuthed() was too weak: any valid member cookie (adminFlag=0) could
 * approve/deny its own reimbursements. PATCH additionally requires a same-origin
 * request. Moving a request to APPROVED or REIMBURSED emits an EXPENSE_DECIDED
 * audit row (DENIED too, so the forensic trail is complete).
 */

const STATUSES = ["PENDING", "APPROVED", "REIMBURSED", "DENIED"] as const;
type Status = (typeof STATUSES)[number];

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES),
});

export async function GET(req: Request) {
  const denied = await guardOfficer("payments", "read");
  if (denied) return denied;
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status")?.toUpperCase();
  const where =
    statusParam && (STATUSES as readonly string[]).includes(statusParam)
      ? { status: statusParam }
      : {};
  try {
    const expenses = await prisma.expense.findMany({
      where,
      // Pending first (most actionable), then most-recent within each status.
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ ok: true, expenses });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = await guardOfficer("payments", "write");
  if (denied) return denied;
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { id, status } = parsed.data;

  const existing = await prisma.expense
    .findUnique({ where: { id }, select: { status: true, amountCents: true, submittedByName: true } })
    .catch(() => null);
  if (!existing) return NextResponse.json({ ok: false, error: "Expense not found" }, { status: 404 });

  // Resolve the deciding officer's name from the session when possible; the
  // chapter-shared admin login has no per-brother identity, so fall back to
  // "Admin" — consistent with the audit helper's "admin (shared)" actor.
  const me = await getCurrentBrother().catch(() => null);
  const decidedByName = me?.name || "Admin";

  // Returning to PENDING clears the decision stamp; any terminal status sets it.
  const decided = status !== "PENDING";

  try {
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status,
        decidedByName: decided ? decidedByName : null,
        decidedAt: decided ? new Date() : null,
      },
    });

    await audit({
      action: "EXPENSE_DECIDED",
      subjectType: "Expense",
      subjectId: updated.id,
      subjectName: updated.submittedByName || "Reimbursement",
      details: `${existing.status} → ${status} · $${(updated.amountCents / 100).toFixed(2)} by ${decidedByName}`,
      req,
    });

    return NextResponse.json({ ok: true, expense: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
