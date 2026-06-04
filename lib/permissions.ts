// Server-side permission gate.
//
// The session HMAC cookie only carries `brotherId` + `isAdmin` flag — we keep
// the cookie payload small (the chapter cookie can already be near the 4KB
// header limit when carrying multiple subdomains). At request time, this module
// derives the brother's *effective* permissions by:
//
//   1. If the session has `isAdmin=true` → SUPER_ADMIN_PERMISSIONS
//   2. Otherwise, look up all OfficerAssignments where endDate is null or in the future
//      and merge the position permissions (most-permissive wins)
//
// Hot path: a single Prisma query with a join. We can layer Redis or memo later.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import {
  DomainKey,
  OfficerPermissions,
  SUPER_ADMIN_PERMISSIONS,
  EMPTY_PERMISSIONS,
  hasPermission,
  mergePermissions,
  parsePermissions,
} from "@/lib/officer-permissions";

export { hasPermission };
export type { OfficerPermissions, DomainKey };

/**
 * Read the current session + return the merged officer permission set.
 * Falls back to EMPTY_PERMISSIONS for unauthenticated requests.
 */
export async function getCurrentOfficerPermissions(): Promise<OfficerPermissions> {
  const session = await getCurrentSession();
  if (!session) return { ...EMPTY_PERMISSIONS };
  if (session.isAdmin) return { ...SUPER_ADMIN_PERMISSIONS };
  return await getOfficerPermissionsForBrother(session.brother.id);
}

/**
 * Pure lookup: given a brotherId, fetch current assignments + merge.
 * Used by getCurrentOfficerPermissions and by tests / admin tooling that needs
 * to inspect a specific brother's perms.
 */
export async function getOfficerPermissionsForBrother(brotherId: string): Promise<OfficerPermissions> {
  const now = new Date();
  try {
    const assignments = await prisma.officerAssignment.findMany({
      where: {
        brotherId,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
        position: { active: true },
      },
      include: { position: true },
    });
    if (assignments.length === 0) return { ...EMPTY_PERMISSIONS };
    return mergePermissions(assignments.map((a) => parsePermissions(a.position.permissions)));
  } catch {
    return { ...EMPTY_PERMISSIONS };
  }
}

/**
 * Throw a 403 if the caller lacks the requested permission.
 * Returns the permission set so the caller can re-use it without re-querying.
 */
export async function requireOfficerPermission(
  domain: DomainKey,
  action: "read" | "write" = "read"
): Promise<OfficerPermissions> {
  const perms = await getCurrentOfficerPermissions();
  if (!hasPermission(perms, domain, action)) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    err.code = "PERMISSION_DENIED";
    err.domain = domain;
    err.action = action;
    throw err;
  }
  return perms;
}

/**
 * Route-handler guard: run the permission check and convert a thrown
 * permission error into a JSON 403 response instead of letting it bubble to
 * Next's default 500. Returns `null` when access is allowed (caller proceeds)
 * or a ready-to-return `NextResponse` when denied.
 *
 * Usage at a route call site:
 *
 *   const denied = await guardOfficer("service", "write");
 *   if (denied) return denied;
 *
 * Access decisions are unchanged — this only fixes the HTTP status/shape of a
 * denial (was 500, now 403) so the client and UX see the correct code.
 */
export async function guardOfficer(
  domain: DomainKey,
  action: "read" | "write" = "read"
): Promise<NextResponse | null> {
  try {
    await requireOfficerPermission(domain, action);
    return null;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Forbidden" },
      { status: e?.status || 403 }
    );
  }
}

/**
 * Soft check used in server components — returns a permission report without
 * throwing. Lets pages render fallback UI for users who lack a domain.
 */
export async function checkOfficerPermission(
  domain: DomainKey,
  action: "read" | "write" = "read"
): Promise<{ allowed: boolean; perms: OfficerPermissions }> {
  const perms = await getCurrentOfficerPermissions();
  return { allowed: hasPermission(perms, domain, action), perms };
}
