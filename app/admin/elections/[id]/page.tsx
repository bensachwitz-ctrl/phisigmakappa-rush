import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { checkOfficerPermission } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { tallySeat } from "@/lib/elections";
import { ManageElectionClient, type ElectionDetail } from "./manage-election-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage election",
};

/**
 * Manage one election. Gated like the index (admin OR elections:write). Loads
 * the election with seats + candidates and computes per-seat tallies server-side
 * via lib/elections.tallySeat. SECRET BALLOT: ballots are read as `{ candidateId }`
 * ONLY — voterBrotherId is never selected, so it cannot reach the client.
 */
export default async function ManageElectionPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const { allowed } = await checkOfficerPermission("elections", "write");

  if (!session || !allowed) {
    return (
      <main className="container py-8">
        <div className="mx-auto max-w-lg">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold tracking-tight">Elections access required</h1>
                <p className="text-sm text-muted-foreground">
                  Only a chapter administrator or an officer with the Elections
                  permission can manage this election.
                </p>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary hover:border-phisig-red/40 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const election = await prisma.election.findUnique({
    where: { id: params.id },
    include: {
      seats: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          candidates: {
            orderBy: { createdAt: "asc" },
            select: { id: true, brotherId: true, name: true, statement: true },
          },
          ballots: { select: { candidateId: true } }, // NO voterBrotherId
        },
      },
    },
  });
  if (!election) notFound();

  const [positions, brothers] = await Promise.all([
    prisma.officerPosition.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, slug: true },
    }),
    prisma.brother.findMany({
      where: { status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const detail: ElectionDetail = {
    id: election.id,
    title: election.title,
    termCode: election.termCode,
    status: election.status,
    anonymous: election.anonymous,
    audience: election.audience,
    opensAt: election.opensAt ? election.opensAt.toISOString() : null,
    closesAt: election.closesAt ? election.closesAt.toISOString() : null,
    closedAt: election.closedAt ? election.closedAt.toISOString() : null,
    seats: election.seats.map((s) => {
      const tally = tallySeat(
        s.id,
        s.title,
        s.candidates.map((c) => ({ id: c.id, name: c.name })),
        s.ballots,
      );
      return {
        id: s.id,
        positionId: s.positionId,
        title: s.title,
        sortOrder: s.sortOrder,
        winnerCandidateId: s.winnerCandidateId,
        winnerName: s.winnerName,
        seatedAssignmentId: s.seatedAssignmentId,
        candidates: s.candidates.map((c) => ({
          id: c.id,
          brotherId: c.brotherId,
          name: c.name,
          statement: c.statement,
        })),
        totalBallots: tally.totalBallots,
        tie: tally.tie,
        results: tally.results,
      };
    }),
  };

  return <ManageElectionClient initial={detail} positions={positions} brothers={brothers} />;
}
