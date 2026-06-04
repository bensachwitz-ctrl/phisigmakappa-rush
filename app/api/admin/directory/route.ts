import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Member Directory feed — read-only, admin-gated.
 *
 * Powers the client refresh on /admin/directory. Returns exactly the display
 * fields the directory renders (never `passwordHash` or any sensitive column),
 * with each member's Big resolved to a display name via the Brother self-relation
 * (`bigBrother`). Active members are surfaced first, then alphabetical — matching
 * the initial server-rendered order so a refresh never reshuffles the grid.
 *
 * The directory is a roster-visibility surface, so any authenticated admin user
 * (full admin OR an officer with a console session) may read it — this mirrors
 * the GET on /api/admin/brothers, which gates on isAdminAuthed() alone.
 */

// Explicit, public-safe projection. Kept in lock-step with the `DirectoryRow`
// shape consumed by components/admin/directory-manager.tsx.
const DIRECTORY_SELECT = {
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
} as const;

// "Active first" — ACTIVE/INITIATE/PLEDGE/PROSPECT rank above the rest
// (ALUMNUS, INACTIVE, EXPELLED) so the working roster leads the grid.
const ACTIVE_STATUSES = new Set(["ACTIVE", "INITIATE", "PLEDGE", "PROSPECT"]);

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let rows: Array<Record<string, any>> = [];
  try {
    rows = await prisma.brother.findMany({
      orderBy: { name: "asc" },
      select: DIRECTORY_SELECT,
    });
  } catch {
    // Degrade gracefully if the table/columns aren't migrated yet — the
    // client simply renders its empty state rather than throwing.
    return NextResponse.json({ ok: true, members: [] });
  }

  const members = rows
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
      // Prefer the free-text directory label; fall back to the structured Int year.
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

  return NextResponse.json({ ok: true, members });
}
