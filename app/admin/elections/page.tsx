import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { checkOfficerPermission } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { IconRiskDesk as ShieldAlert, IconArrowLeft as ArrowLeft } from "@/components/brand/icons";
import { ElectionsListClient } from "./elections-list-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Officer elections",
};

/**
 * Admin elections index. Gated like the rest of /admin: the global admin OR an
 * officer holding the "elections" permission can manage elections. A signed-in
 * user without that permission gets a graceful locked state (middleware already
 * keeps unauthenticated users out of /admin/*).
 */
export default async function AdminElectionsPage() {
  const session = await getCurrentSession();
  const { allowed } = await checkOfficerPermission("elections", "write");

  if (!session || !allowed) {
    return (
      <div className="container py-8">
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
                  permission can run officer elections. Ask your chapter admin to
                  grant it.
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
      </div>
    );
  }

  const elections = await prisma.election.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      seats: { select: { id: true, _count: { select: { ballots: true } } } },
    },
  });

  const initial = elections.map((e) => ({
    id: e.id,
    title: e.title,
    termCode: e.termCode,
    status: e.status,
    anonymous: e.anonymous,
    audience: e.audience,
    seatCount: e.seats.length,
    totalBallots: e.seats.reduce((sum, s) => sum + s._count.ballots, 0),
    opensAt: e.opensAt ? e.opensAt.toISOString() : null,
    closesAt: e.closesAt ? e.closesAt.toISOString() : null,
    closedAt: e.closedAt ? e.closedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return <ElectionsListClient initial={initial} />;
}
