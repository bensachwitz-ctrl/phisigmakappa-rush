import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { OfficersClient } from "./officers-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Officer permissions",
};

export default async function OfficersPage() {
  // Granting / revoking officer roles and editing per-domain permissions is the
  // highest-stakes surface in the system, so it stays gated to the chapter
  // super-admin (ADMIN role) — exactly like the underlying APIs
  // (app/api/admin/officers + officer-positions), which call ensureSuperAdmin().
  //
  // Middleware already redirects unauthenticated /admin/* to /admin/login, so a
  // null session shouldn't reach here — but a *non-admin* officer can, so we
  // render a graceful locked state rather than throwing.
  const session = await getCurrentSession();

  if (!session?.isAdmin) {
    return (
      <main className="container py-8">
        <div className="mx-auto max-w-lg">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold tracking-tight">Admin access required</h1>
                <p className="text-sm text-muted-foreground">
                  Only a chapter administrator can manage officer positions and per-domain
                  permissions. Ask your chapter admin to grant or adjust officer roles.
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

  // Fetch everything the client needs in one round-trip:
  //   • positions — ALL of them (active + inactive) ordered like the seeder, so
  //     the admin can reactivate a soft-deleted position.
  //   • assignments — current + historical, newest term first, with the
  //     position + brother joined for display.
  //   • brothers — the full roster for the "assign a brother" picker.
  const [positions, assignments, brothers] = await Promise.all([
    prisma.officerPosition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.officerAssignment.findMany({
      orderBy: [{ termCode: "desc" }, { createdAt: "desc" }],
      include: {
        position: { select: { id: true, title: true, slug: true, active: true } },
        brother: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.brother.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Serialise Date fields to ISO strings — the client component is a "use
  // client" boundary, so anything we hand it must be plain-serialisable.
  const serializedPositions = positions.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    permissions: p.permissions,
    sortOrder: p.sortOrder,
    active: p.active,
  }));

  const serializedAssignments = assignments.map((a) => ({
    id: a.id,
    positionId: a.positionId,
    brotherId: a.brotherId,
    termCode: a.termCode,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate ? a.endDate.toISOString() : null,
    notes: a.notes,
    position: a.position,
    brother: a.brother,
  }));

  return (
    <OfficersClient
      initialPositions={serializedPositions}
      initialAssignments={serializedAssignments}
      brothers={brothers}
    />
  );
}
