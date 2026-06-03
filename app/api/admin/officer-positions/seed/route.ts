import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_OFFICER_CATALOG, stringifyPermissions } from "@/lib/officer-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/officer-positions/seed
//
// Idempotent seeder for the 13 default Phi Sigma Kappa officer positions.
// Updates the permissions JSON if the slug exists, inserts otherwise. Safe to
// re-run anytime the canonical catalog in lib/officer-permissions.ts changes.
export async function POST() {
  const s = await getCurrentSession();
  if (!s) return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  if (!s.isAdmin) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  let created = 0;
  let updated = 0;
  for (const seed of DEFAULT_OFFICER_CATALOG) {
    const existing = await prisma.officerPosition.findUnique({ where: { slug: seed.slug } });
    if (existing) {
      // Keep the existing permissions (admin may have tweaked them); only refresh
      // metadata fields that are safe to nudge.
      await prisma.officerPosition.update({
        where: { id: existing.id },
        data: {
          title: seed.title,
          description: seed.description,
          sortOrder: seed.sortOrder,
        },
      });
      updated++;
    } else {
      await prisma.officerPosition.create({
        data: {
          title: seed.title,
          slug: seed.slug,
          description: seed.description,
          sortOrder: seed.sortOrder,
          permissions: stringifyPermissions(seed.permissions),
          active: true,
        },
      });
      created++;
    }
  }
  return NextResponse.json({ ok: true, created, updated, total: DEFAULT_OFFICER_CATALOG.length });
}
