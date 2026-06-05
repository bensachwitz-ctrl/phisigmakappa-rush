import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/portal-auth";
import ElectionsVoter from "@/components/portal/elections-voter";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Officer Elections",
  description: "Vote in chapter officer elections.",
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
 * Member-facing officer-elections page (brothers portal). Guards exactly like
 * the brothers dashboard / reimbursements: a valid brother portal session (or
 * admin override) resolves to a brother profile; anything else redirects to the
 * portal login. The client component fetches OPEN elections from
 * /api/portal/brothers/elections and submits ballots — the secret-ballot
 * contract lives in that API (voterBrotherId never leaves the server).
 */
export default async function BrothersElectionsPage() {
  const sess = requireRole("brother");
  if (!sess) {
    redirect("/portal/brothers");
  }

  try {
    let brotherId: string | null | undefined = null;
    if (sess.portal) {
      const portalUser = await prisma.portalUser.findUnique({
        where: { id: sess.portal.userId },
        select: { brotherId: true },
      });
      brotherId = portalUser?.brotherId;
    }
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
    console.error("[brothers elections] session resolve failed:", err);
    redirect("/portal/brothers?error=unavailable");
  }

  return <ElectionsVoter isAdmin={sess.isAdmin} />;
}
