// Server-only helpers shared by the admin election API routes. Keeps the
// auth/guard boilerplate in one place so every election route gates
// identically — mirrors the `ensureWrite()` helper in the library route, the
// `requireOfficerPermission` chokepoint in lib/permissions.ts, and the
// `actorFromRequest` shape used everywhere auditAndNotify is called.
//
// Permission model (matches the rest of /admin):
//   • Global shared-admin session (cookie adminFlag=1) → always allowed.
//   • Otherwise the brother must hold an officer position granting the
//     "elections" domain at "write". (President via super-admin, Secretary via
//     the catalog default — see lib/officer-permissions.ts.)
//
// This is server-only (imports next/headers transitively + Prisma); never pull
// it into a client component.

import { isSameOrigin } from "@/lib/auth";
import { getCurrentSession, getCurrentBrother } from "@/lib/auth";
import { getCurrentOfficerPermissions, hasPermission } from "@/lib/permissions";
import { checkBillingLock } from "@/lib/billing-guard";
import type { AuditActor } from "@/lib/notify";

export type ElectionGuard =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Gate a state-changing admin election request:
 *   1. same-origin (CSRF belt-and-suspenders — see lib/auth.isSameOrigin),
 *   2. a valid session,
 *   3. global admin OR officer `elections:write`.
 *
 * `action` defaults to "write" (every mutation). Pass "read" for GET-style
 * gating if you ever need it; today the GET routes use this too so the manage
 * surface is officer-gated end to end.
 */
export async function guardElectionRequest(
  req: Request,
  action: "read" | "write" = "write",
): Promise<ElectionGuard> {
  // Same-origin only matters for mutations; reads are safe cross-origin but we
  // keep the call uniform and cheap. isSameOrigin returns true for curl/no-Origin.
  if (action === "write" && !isSameOrigin(req)) {
    return { ok: false, status: 403, error: "Cross-origin request blocked" };
  }

  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, status: 401, error: "Sign in first" };
  }
  if (!session.isAdmin) {
    const perms = await getCurrentOfficerPermissions();
    if (!hasPermission(perms, "elections", action)) {
      return {
        ok: false,
        status: 403,
        error: "You need the Elections permission to do that.",
      };
    }
  }

  // BILLING WRITE GUARD (P1) — a chapter whose PLATFORM subscription is locked
  // out (canceled/unpaid/trial-expired) may READ elections but not MUTATE them.
  // Server-side entitlement re-check (not the deletable middleware cookie), so a
  // cookie-stripped/curl election mutation is refused with 402. Reads pass.
  if (action === "write") {
    const { locked } = await checkBillingLock();
    if (locked) {
      return {
        ok: false,
        status: 402,
        error: "Billing Lockout: activate your subscription at /admin/billing.",
      };
    }
  }
  return { ok: true };
}

/**
 * Build the AuditActor for the current request. Resolves the acting brother
 * (admin sessions may not map to a Brother row → name falls back to "Admin")
 * and pulls IP + UA from the request headers. Role is reported as
 * "super-admin" for the shared-admin cookie, else "officer".
 */
export async function electionActor(req: Request): Promise<AuditActor> {
  const session = await getCurrentSession();
  const me = await getCurrentBrother();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  return {
    brotherId: me?.id ?? null,
    name: me?.name ?? "Admin",
    role: session?.isAdmin ? "super-admin" : "officer",
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") || null,
  };
}
