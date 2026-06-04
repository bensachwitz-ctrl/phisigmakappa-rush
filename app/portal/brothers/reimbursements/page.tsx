import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/portal-auth";
import ReimbursementsManager from "@/components/portal/reimbursements-manager";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reimbursements",
  description: "Submit and track your chapter reimbursement requests.",
};

function isNextSignal(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_")
  );
}

/**
 * Member-facing Treasury reimbursements page (brothers portal).
 *
 * Guards identically to the brothers dashboard: a valid brother portal session
 * (or admin override) resolves to a brother profile; anything else redirects to
 * the portal login. We pre-load the member's own requests server-side and hand
 * them to the client so the list paints immediately. The client still talks to
 * the existing API (app/api/account/expenses) for submits + any later refresh.
 */
export default async function ReimbursementsPage() {
  const sess = requireRole("brother");
  if (!sess) {
    redirect("/portal/brothers");
  }

  let brotherId: string | null | undefined = null;
  try {
    if (sess.portal) {
      const portalUser = await prisma.portalUser.findUnique({
        where: { id: sess.portal.userId },
      });
      brotherId = portalUser?.brotherId;
    }

    // Admin override with no linked brother — mirror the dashboard and pick the
    // first onboarded brother so the view is populated rather than empty.
    if (sess.isAdmin && !brotherId) {
      const firstBrother = await prisma.brother.findFirst({
        where: { passwordHash: { not: null } },
        select: { id: true },
      });
      brotherId = firstBrother?.id;
    }

    if (!brotherId) {
      redirect("/portal/brothers?error=not-onboarded");
    }
  } catch (err) {
    if (isNextSignal(err)) throw err;
    console.error("[reimbursements] session resolve failed:", err);
    redirect("/portal/brothers?error=unavailable");
  }

  let initialExpenses: Awaited<ReturnType<typeof prisma.expense.findMany>> = [];
  try {
    initialExpenses = await prisma.expense.findMany({
      where: { submittedById: brotherId },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (err) {
    if (isNextSignal(err)) throw err;
    console.error("[reimbursements] expense load failed:", err);
    // Non-fatal: render the page and let the client retry via the API.
  }

  const formatted = initialExpenses.map((e) => ({
    id: e.id,
    submittedById: e.submittedById,
    submittedByName: e.submittedByName,
    amountCents: e.amountCents,
    category: e.category,
    description: e.description,
    status: e.status,
    receiptUrl: e.receiptUrl,
    decidedByName: e.decidedByName,
    decidedAt: e.decidedAt ? e.decidedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return <ReimbursementsManager initialExpenses={formatted} preloaded />;
}
