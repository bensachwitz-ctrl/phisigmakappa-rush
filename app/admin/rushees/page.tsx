// /admin/rushees — central PNM management dashboard (rush-cycle feature 1).
//
// This is the rush chair's home base during recruitment. The dashboard at
// /admin shows everything (roster, audit feed, brand checklist). This page
// is laser-focused on PNMs:
//   • Filter chips (Hot prospects / Attended 2+ / etc.)
//   • Bulk-text sheet that uses the existing /api/send-sms infrastructure
//   • Add-PNM button (admin-side create, no TCPA capture)
//   • Photo + name + key columns in a sortable table
//   • Row click → /admin/rushees/[id] full profile
//
// The same data lives behind /admin's roster, but this view is organized
// around the rush-chair's workflow ("who haven't I texted recently? who's
// hot? who needs a bid?") rather than the chapter's voting view.
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { RusheesManager, type RusheeListRow } from "@/components/admin/rushees-manager";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function RusheesPage() {
  // Loads every PNM's PII (name, email, phone, votes). Gated on the
  // "rushPipeline" officer domain (Recruitment Chair + chapter admins). The
  // middleware only checks for *a* session, not the role, so without this gate
  // any logged-in brother could pull the whole PNM list by direct URL.
  await requireOfficerPermission("rushPipeline", "read");
  let initial: RusheeListRow[] = [];
  try {
    const rushes = await prisma.rush.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        votes: { select: { value: true } },
        attendances: { select: { eventId: true } },
        impressions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { tone: true },
        },
        _count: { select: { impressions: true } },
      },
    });
    initial = rushes.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      year: r.year,
      major: r.major,
      headshotUrl: r.headshotUrl,
      status: r.status,
      attendanceCount: r.attendances.length,
      voteSum: r.votes.reduce((s, v) => s + v.value, 0),
      voteCount: r.votes.length,
      impressionCount: r._count.impressions,
      lastImpressionTone: r.impressions[0]?.tone ?? null,
      bidToken: r.bidToken,
      bidRespondedAt: r.bidRespondedAt ? r.bidRespondedAt.toISOString() : null,
      bidResponseChoice: r.bidResponseChoice,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.warn("[/admin/rushees] failed to load PNMs:", err);
    initial = [];
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const identity = chapterIdentityFromCfg(cfg);

  return (
    <main className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">PNM dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every prospective new member for {identity.chapterFullName} — filter, bulk-text, and send bids without leaving the page.
        </p>
      </div>
      <RusheesManager initial={initial} />
    </main>
  );
}
