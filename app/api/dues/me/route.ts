import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dues/me
 *
 * Returns the signed-in brother's current dues state plus a short
 * payment history (last 5 DuesPayments, newest first). Powers the
 * "Dues" card on the brother's own profile so they can see:
 *   - whether they're paid for the current period
 *   - when they paid and how (Stripe vs. manual)
 *   - a link to each Stripe receipt
 *
 * Self-only — brothers cannot view each other's payment history. Admin
 * use a different endpoint (TBD v44, or the existing PATCH path) to
 * see another brother's ledger.
 */
export async function GET() {
  const me = await getCurrentBrother();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const payments = await prisma.duesPayment.findMany({
    where: { brotherId: me.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      amountCents: true,
      currency: true,
      year: true,
      status: true,
      method: true,
      receiptUrl: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  }).catch(() => []);

  return NextResponse.json({
    ok: true,
    brother: {
      id: me.id,
      duesPaid: me.duesPaid,
      duesAmountCents: me.duesAmountCents,
      duesYear: me.duesYear,
      duesPaidAt: me.duesPaidAt ? me.duesPaidAt.toISOString() : null,
      duesPaymentMethod: me.duesPaymentMethod,
    },
    payments: payments.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}
