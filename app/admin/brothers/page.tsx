import { prisma } from "@/lib/prisma";
import { BrothersManager } from "@/components/admin/brothers-manager";
import { BrotherLeaderboard, type LeaderboardBrother } from "@/components/admin/brother-leaderboard";
import { getCurrentSession } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function BrothersPage() {
  let brothers: any[] = [];
  try {
    // Single round-trip pulls every brother + their engagement counts.
    // Prisma _count aggregates in SQL so the payload stays small even
    // with 60+ brothers and hundreds of votes/RSVPs.
    brothers = await prisma.brother.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { votes: true, rsvps: true } },
      },
    });
  } catch { brothers = []; }

  const session = await getCurrentSession();
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const greekLetters = cfg["chapter.greekLetters"] || "Gamma Triton";

  // Dues config — all four prereqs must be present client-side for the
  // Pay button to render. We deliberately do NOT leak the secret key
  // (lives in process.env only) or the webhook secret (admin-only); the
  // client only needs to know dues are enabled + the label + the amount
  // to render. The /api/dues/checkout endpoint does the real
  // server-side prereq check before creating a Stripe session.
  const duesConfig = {
    enabled: cfg["dues.enabled"] === "true",
    amountCents: parseInt(cfg["dues.amountCents"] || "15000", 10) || 15000,
    currency: cfg["dues.currency"] || "usd",
    label: cfg["dues.label"] || "Chapter dues",
    year: cfg["dues.year"] || "",
  };

  const serializable = brothers.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    lastSeen: b.lastSeen.toISOString(),
  }));

  // Leaderboard data — separate shape so BrothersManager isn't bloated with
  // engagement counts it doesn't render. The leaderboard component handles
  // sorting + slicing client-side from this flat list.
  const leaderboardBrothers: LeaderboardBrother[] = brothers.map((b) => ({
    id: b.id,
    name: b.name,
    position: b.position,
    headshotUrl: b.headshotUrl,
    pledgeClass: b.pledgeClass,
    voteCount: b._count?.votes ?? 0,
    rsvpCount: b._count?.rsvps ?? 0,
    serviceHours: b.serviceHours,
  }));

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Brother directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session?.isAdmin
              ? `Active brothers of the ${greekLetters} chapter. Track contact, position, dues, service hours, and study hours.`
              : "Browse the chapter directory. You can edit your own profile from the card with the pencil icon."}
          </p>
        </div>
        {!session?.isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only · Brother view
          </span>
        )}
      </div>

      <BrotherLeaderboard brothers={leaderboardBrothers} />

      <BrothersManager
        initial={serializable as any}
        isAdmin={!!session?.isAdmin}
        currentBrotherId={session?.brother?.id || null}
        duesConfig={duesConfig}
      />
    </main>
  );
}
