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
import { isAdminAuthed } from "@/lib/auth";
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

/**
 * COARSE admin-area gate for /api/admin/* JSON handlers — the API-layer twin of
 * the `app/admin/layout.tsx` boundary check.
 *
 * The page layout admits the admin area only for a session that is EITHER a
 * chapter super-admin (isAdmin=true) OR an officer holding ≥1 active
 * OfficerAssignment — bouncing a plain member (valid member-login cookie, zero
 * assignments) to /portal. But that gate lived ONLY in the layout: many
 * /api/admin/* GET handlers gated on `isAdminAuthed()` alone, which proves only
 * that the cookie HMAC is valid for this tenant — NOT that it's an officer/admin.
 * So a plain member who minted a `phisig_admin` cookie via the "Active brothers"
 * login (and is bounced from the /admin UI) could still fetch chapter-wide PII,
 * PNM votes/notes, and rush enrichment straight from the JSON endpoints.
 *
 * `isOfficerOrAdmin()` recomputes the SAME admit decision the layout uses, and
 * `guardOfficerOrAdmin()` turns it into a ready 401 (no/invalid session) or 403
 * (valid member, but not an officer/admin) response — `null` means proceed.
 * Per-domain `requireOfficerPermission()` still enforces the FINER split on the
 * routes that have one; this is the coarse "allowed in the building" floor for
 * the broadly-readable roster/PNM surfaces that previously had none.
 */
export async function isOfficerOrAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  if (session.isAdmin) return true;
  const perms = await getOfficerPermissionsForBrother(session.brother.id);
  return !!perms.superAdmin || Object.keys(perms.domain || {}).length > 0;
}

export async function guardOfficerOrAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (session.isAdmin) return null;
  const perms = await getOfficerPermissionsForBrother(session.brother.id);
  const isOfficer = !!perms.superAdmin || Object.keys(perms.domain || {}).length > 0;
  if (!isOfficer) {
    return NextResponse.json(
      { ok: false, error: "Officer access required" },
      { status: 403 }
    );
  }
  return null;
}

// ── Shared route-handler wrappers ────────────────────────────────────────────
//
// The two officer-floor highs (send-email + announcements GET both gating on
// isAdminAuthed() alone — true for ANY tenant cookie, including a plain member's)
// came from copy-pasting a handler and forgetting to add the second-line floor.
// These wrappers perform the whole floor ONCE so a new handler can't forget it:
//
//   1. isAdminAuthed() 401 pre-check (valid tenant-bound cookie at all), then
//   2. the officer/admin (or per-domain) 403 floor.
//
// Usage:
//   export const GET  = withAdminArea(async (req) => { … });             // coarse
//   export const POST = withOfficer("announcements", "write", async (req) => …); // fine
//
// The wrapped handler runs only after the floor passes; a denial short-circuits
// with the correct 401/403 JSON the bare-handler versions produce.

type RouteHandler = (req: Request) => Promise<Response> | Response;

/**
 * Coarse admin-area floor (isAdminAuthed 401 → guardOfficerOrAdmin 403) applied
 * before the handler. Mirrors the app/admin/layout.tsx boundary for JSON routes
 * that expose chapter-wide PII / internal info but have no finer per-domain gate.
 */
export function withAdminArea(handler: RouteHandler): RouteHandler {
  return async (req: Request) => {
    if (!isAdminAuthed()) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const denied = await guardOfficerOrAdmin();
    if (denied) return denied;
    return handler(req);
  };
}

/**
 * Fine-grained officer floor (isAdminAuthed 401 → guardOfficer(domain,action)
 * 403) applied before the handler. Admins pass via SUPER_ADMIN_PERMISSIONS; an
 * officer holding the domain's access passes too; a plain member is 403'd.
 */
export function withOfficer(
  domain: DomainKey,
  action: "read" | "write",
  handler: RouteHandler,
): RouteHandler {
  return async (req: Request) => {
    if (!isAdminAuthed()) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const denied = await guardOfficer(domain, action);
    if (denied) return denied;
    return handler(req);
  };
}
