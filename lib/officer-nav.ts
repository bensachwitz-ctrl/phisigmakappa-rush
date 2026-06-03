// Officer routing helpers.
//
// Given a signed-in brother, work out which dashboard surface they belong on:
//   • If they hold the President officer position → /admin/president
//   • Else if they hold any other officer position → /admin/officer/<slug>
//   • Else → null (let the caller fall through to /admin)
//
// The 10 officer dashboards added in Wave 4 live under /admin/officer/<slug>.
// When a brother holds multiple positions concurrently, the highest-priority
// one wins (see PRIORITY).
//
// Read-only — never mutates. Tolerates DB errors by returning null so the
// caller can still route the user somewhere sensible.

import { prisma } from "@/lib/prisma";

/**
 * The 10 dashboards Wave 4 ships under /admin/officer/<slug>. President is
 * intentionally absent from this list because it has its own surface at
 * /admin/president (built in W3).
 */
export const OFFICER_DASHBOARD_SLUGS = [
  "vice-president",
  "treasurer",
  "scholarship-chair",
  "risk-manager",
  "philanthropy-chair",
  "recruitment-chair",
  "house-manager",
  "secretary",
  "social-chair",
  "brotherhood-chair",
] as const;

export type OfficerDashboardSlug = (typeof OFFICER_DASHBOARD_SLUGS)[number];

const PRIORITY: Record<string, number> = {
  president: 0,
  "vice-president": 10,
  treasurer: 20,
  "risk-manager": 30,
  "recruitment-chair": 40,
  "scholarship-chair": 50,
  "philanthropy-chair": 60,
  secretary: 70,
  "house-manager": 80,
  "social-chair": 90,
  "brotherhood-chair": 100,
  marshal: 110,
  "ifc-delegate": 120,
};

const DASHBOARD_HREF: Record<string, string> = {
  president: "/admin/president",
  "vice-president": "/admin/officer/vice-president",
  treasurer: "/admin/officer/treasurer",
  "risk-manager": "/admin/officer/risk-manager",
  "recruitment-chair": "/admin/officer/recruitment-chair",
  "scholarship-chair": "/admin/officer/scholarship-chair",
  "philanthropy-chair": "/admin/officer/philanthropy-chair",
  secretary: "/admin/officer/secretary",
  "house-manager": "/admin/officer/house-manager",
  "social-chair": "/admin/officer/social-chair",
  "brotherhood-chair": "/admin/officer/brotherhood-chair",
};

export interface CurrentOfficerInfo {
  slug: string;
  title: string;
  href: string;
}

/**
 * Return every active officer position the brother currently holds, sorted by
 * priority (highest first). Returns [] if none.
 */
export async function getActiveOfficerPositions(brotherId: string): Promise<CurrentOfficerInfo[]> {
  if (!brotherId) return [];
  try {
    const now = new Date();
    const assignments = await prisma.officerAssignment.findMany({
      where: {
        brotherId,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
        position: { active: true },
      },
      include: { position: { select: { slug: true, title: true } } },
    });
    const seen = new Set<string>();
    const out: CurrentOfficerInfo[] = [];
    for (const a of assignments) {
      const slug = a.position.slug;
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({
        slug,
        title: a.position.title,
        href: DASHBOARD_HREF[slug] || "/admin",
      });
    }
    out.sort((a, b) => (PRIORITY[a.slug] ?? 999) - (PRIORITY[b.slug] ?? 999));
    return out;
  } catch {
    return [];
  }
}

/**
 * Return the slug of the highest-priority officer position the brother holds,
 * or null if they hold none.
 */
export async function getOfficerDashboardForUser(brotherId: string): Promise<string | null> {
  const positions = await getActiveOfficerPositions(brotherId);
  if (positions.length === 0) return null;
  return positions[0].slug;
}

/**
 * Return the dashboard href for the highest-priority officer position the
 * brother holds, or null. Used by /admin to auto-redirect officers to their
 * landing page on sign-in.
 */
export async function getOfficerDashboardHrefForUser(brotherId: string): Promise<string | null> {
  const slug = await getOfficerDashboardForUser(brotherId);
  if (!slug) return null;
  return DASHBOARD_HREF[slug] || null;
}
