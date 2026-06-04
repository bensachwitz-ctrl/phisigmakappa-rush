import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { requireOfficerPermission } from "@/lib/permissions";
import { getSiteConfig } from "@/lib/site-config";
import { FamilyManager, type FamilyBrother } from "@/components/admin/family-manager";
import { IconFamily } from "@/components/brand/icons/family";

export const dynamic = "force-dynamic";

/**
 * Big / Little Family Tree admin page.
 *
 * Loads every brother in the lean shape the forest needs and hands it to the
 * client manager, which builds the tree, runs the assign/clear flows against
 * /api/admin/family, and renders the lineage. Officers with the "brothers"
 * domain (and chapter admins) get the assign controls; everyone else with the
 * domain sees a read-only tree (gated client-side via isAdmin + enforced by the
 * route's brothers-write guard + isSameOrigin).
 *
 * Auth: gated on the "brothers" officer domain. The middleware only checks for
 * *a* session, not the role, so without this gate any logged-in brother could
 * open the admin family console by direct URL. Mirrors the meetings page.
 */
export default async function FamilyPage() {
  await requireOfficerPermission("brothers", "read");
  let brothers: FamilyBrother[] = [];
  try {
    const rows = await prisma.brother.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        bigBrotherId: true,
        pledgeClass: true,
        position: true,
        status: true,
        headshotUrl: true,
      },
    });
    brothers = rows as FamilyBrother[];
  } catch {
    brothers = [];
  }

  const session = await getCurrentSession();
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const greekLettersRaw = cfg["chapter.greekLetters"] || "";
  const chapterLabel = greekLettersRaw ? `the ${greekLettersRaw} chapter` : "the chapter";

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3.5">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-lg shadow-phisig-red/25 shrink-0"
            aria-hidden="true"
          >
            <IconFamily className="h-6 w-6" accent="rgba(255,255,255,0.85)" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Family Tree
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              {session?.isAdmin
                ? `Assign bigs and littles for ${chapterLabel}, then watch the lineage take shape. Pick a brother, choose their big, and the family forest updates instantly.`
                : `Explore the big/little lineage of ${chapterLabel}. Search a brother to trace their family line.`}
            </p>
          </div>
        </div>
        {!session?.isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only · Family view
          </span>
        )}
      </div>

      <FamilyManager initial={brothers} isAdmin={!!session?.isAdmin} />
    </main>
  );
}
