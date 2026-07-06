import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BrothersManager } from "@/components/admin/brothers-manager";
import { BrotherLeaderboard, type LeaderboardBrother } from "@/components/admin/brother-leaderboard";
import { AlumniManager } from "@/components/admin/alumni-manager";
import { getCurrentSession } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { requireOfficerPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function BrothersPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  // DEFENSE-IN-DEPTH RBAC: the admin middleware/layout only require *a* valid
  // admin session — so any officer who signed in via /api/admin/login (an
  // isAdmin=false admin cookie) would otherwise reach this member-management
  // surface (full roster + dues config + alumni) by direct URL regardless of
  // their officer domain. Gate the page on the "brothers" domain so only a
  // global admin (superAdmin) or an officer actually granted brother access
  // (President / VP / Secretary / Treasurer / Recruitment / Marshal) can load
  // it; a House/Social/Scholarship chair — or a plain member — is rejected with
  // a 403 instead of seeing the roster. Mirrors the gate on /admin/treasury.
  await requireOfficerPermission("brothers", "read");

  const currentView = searchParams?.view === "alumni" ? "alumni" : "brothers";

  let brothers: any[] = [];
  try {
    brothers = await prisma.brother.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { votes: true, rsvps: true } },
      },
    });
  } catch {
    brothers = [];
  }

  // Fetch alumni
  let alumni: any[] = [];
  try {
    alumni = await prisma.alumniProfile.findMany({
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
    });
  } catch {
    alumni = [];
  }

  const session = await getCurrentSession();
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  // Neutral fallback — used only to label the directory; when blank we read
  // "the chapter" rather than leaking a specific reference chapter.
  const greekLettersRaw = cfg["chapter.greekLetters"] || "";
  const chapterLabel = greekLettersRaw ? `the ${greekLettersRaw} chapter` : "the chapter";

  const duesConfig = {
    enabled: cfg["dues.enabled"] === "true",
    amountCents: parseInt(cfg["dues.amountCents"] || "15000", 10) || 15000,
    currency: cfg["dues.currency"] || "usd",
    label: cfg["dues.label"] || "Chapter dues",
    year: cfg["dues.year"] || "",
  };

  const serializableBrothers = brothers.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    lastSeen: b.lastSeen.toISOString(),
  }));

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
    <div className="container py-8 space-y-6">
      {/* E-Board View Slider Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-muted p-1 border border-border">
          <Link
            href="/admin/brothers?view=brothers"
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === "brothers" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Brothers
          </Link>
          <Link
            href="/admin/brothers?view=alumni"
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === "alumni" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Alumni Directory
          </Link>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {currentView === "alumni" ? "Alumni Directory" : "Brother directory"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentView === "alumni" ? (
              `Graduated alumni of ${chapterLabel}. Search profiles, add new ones manually, or import from CSV.`
            ) : (
              session?.isAdmin
                ? `Active brothers of ${chapterLabel}. Track contact, position, dues, service hours, and study hours.`
                : "Browse the chapter directory. You can edit your own profile from the card with the pencil icon."
            )}
          </p>
        </div>
        {!session?.isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only · {currentView === "alumni" ? "Alumni view" : "Brother view"}
          </span>
        )}
      </div>

      {currentView === "alumni" ? (
        <AlumniManager initialAlumni={alumni} />
      ) : (
        <>
          <BrotherLeaderboard brothers={leaderboardBrothers} />
          <BrothersManager
            initial={serializableBrothers as any}
            isAdmin={!!session?.isAdmin}
            currentBrotherId={session?.brother?.id || null}
            duesConfig={duesConfig}
          />
        </>
      )}
    </div>
  );
}
