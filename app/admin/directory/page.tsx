import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { DirectoryManager, type DirectoryRow } from "@/components/admin/directory-manager";
import { IconDirectory } from "@/components/brand/icons/directory";
import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";

export const dynamic = "force-dynamic";

/**
 * Member Directory — the classic Greek "composite" as a living, searchable
 * roster. Server component: pulls every brother (with their Big resolved via the
 * self-relation), orders active members first, then hands a serialized,
 * display-only payload to the client manager. No new DB tables — reuses Brother.
 */

// Active lifecycle states lead the roster; everything else (alumni, inactive,
// expelled) sorts after. Mirrors the API feed so a client refresh is stable.
const ACTIVE_STATUSES = new Set(["ACTIVE", "INITIATE", "PLEDGE", "PROSPECT"]);

export default async function DirectoryPage() {
  // DEFENSE-IN-DEPTH RBAC: the member directory exposes every brother's contact
  // info (email/phone) + family tree — sensitive PII. The admin layout only
  // checks for a valid admin session, so without this an officer lacking the
  // brothers domain (or any holder of an isAdmin=false admin cookie) could read
  // the full roster by direct URL. Gate on brothers:read to match /admin/brothers.
  // GATE-3 FIX 4: graceful read gate (card, not a thrown 403).
  const { allowed: canRead } = await checkOfficerPermission("brothers", "read");
  if (!canRead) return <OfficerAccessRequired title="Directory" permission="Brothers" />;

  let rows: any[] = [];
  try {
    rows = await prisma.brother.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        position: true,
        role: true,
        status: true,
        major: true,
        hometown: true,
        gradYear: true,
        graduationYear: true,
        pledgeClass: true,
        headshotUrl: true,
        bigBrotherId: true,
        bigBrother: { select: { id: true, name: true } },
      },
    });
  } catch {
    rows = [];
  }

  const members: DirectoryRow[] = rows
    .map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email ?? null,
      phone: b.phone ?? null,
      position: b.position ?? null,
      role: b.role ?? "MEMBER",
      status: b.status ?? "ACTIVE",
      major: b.major ?? null,
      hometown: b.hometown ?? null,
      // Free-text directory label wins; fall back to the structured Int year.
      gradYear: b.gradYear ?? (b.graduationYear != null ? String(b.graduationYear) : null),
      pledgeClass: b.pledgeClass ?? null,
      headshotUrl: b.headshotUrl ?? null,
      bigBrotherId: b.bigBrotherId ?? null,
      bigName: b.bigBrother?.name ?? null,
    }))
    .sort((a, b) => {
      const aActive = ACTIVE_STATUSES.has(String(a.status).toUpperCase()) ? 0 : 1;
      const bActive = ACTIVE_STATUSES.has(String(b.status).toUpperCase()) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.name.localeCompare(b.name);
    });

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const chapterName = cfg["chapter.name"] || "";
  // Neutral, white-label-safe label — never leak a reference chapter.
  const directoryTitle = greekLetters ? `${greekLetters} Directory` : "Member Directory";
  const subtitleScope = chapterName || (greekLetters ? `the ${greekLetters} chapter` : "the chapter");

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-start gap-4">
        <span
          className="hidden sm:inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-lg shadow-phisig-red/35 ring-1 ring-white/20"
          aria-hidden="true"
        >
          <IconDirectory className="h-6 w-6" accent="rgba(255,255,255,0.85)" />
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {directoryTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The chapter composite for {subtitleScope} — search, filter, and browse every member.
            Tap a card to email or call. Export the filtered roster to CSV anytime.
          </p>
        </div>
      </div>

      <DirectoryManager initial={members} />
    </main>
  );
}
