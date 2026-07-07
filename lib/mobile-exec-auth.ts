// lib/mobile-exec-auth.ts — shared server-side gate for the officer-only mobile
// exec write routes (/api/mobile/exec/{roster,reset,announce}).
//
// ───────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS (market-critical RBAC — same boundary as /api/mobile/data)
// ───────────────────────────────────────────────────────────────────────────
// The native app sends a chapter `subdomain` + a tenant-bound Bearer token and,
// for exec tools, the client decides "am I an officer?" purely from a UI flag it
// could flip. That is NOT a security boundary. Every exec route MUST recompute
// the capability on the server from the VERIFIED session role + the member's
// REAL, admin-controlled `Brother.position` — never from anything the client
// sends. This helper centralizes that resolution so all three exec routes share
// one audited path and can never drift apart (e.g. one route forgetting the
// position check). A non-officer caller resolves to `{ ok:false, status:403 }`.
//
// The token verification is identical to /api/mobile/data: tenant-bound so a
// chapter-A token can never operate chapter B, and the chapter must be active in
// the central registry.

import { centralDb, getTenantClient } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { computeMemberCapabilities } from "@/lib/member-capabilities";
import { checkBillingLock } from "@/lib/billing-guard";
import type { PrismaClient } from "@prisma/client";

/** A failed gate: the route should return this status + message verbatim. */
export interface ExecAuthFailure {
  ok: false;
  status: number;
  error: string;
}

/** A passed gate: the verified officer session + the resolved tenant client. */
export interface ExecAuthSuccess {
  ok: true;
  /** Tenant Prisma client already bound to the caller's chapter schema. */
  db: PrismaClient;
  /** The verified PortalUser row (role/email/brotherId). */
  portalUser: {
    id: string;
    email: string;
    role: string;
    brotherId: string | null;
    alumniId: string | null;
  };
  /** The acting officer's REAL Brother row (admin-set position lives here). */
  brother: { id: string; name: string; position: string | null };
  /** The normalized chapter subdomain the token verified for. */
  subdomain: string;
}

export type ExecAuthResult = ExecAuthFailure | ExecAuthSuccess;

/**
 * Resolve + AUTHORIZE an officer-only mobile exec request.
 *
 * Steps (all server-side, none trust the client):
 *   1. Require a non-empty `subdomain` (from the request body).
 *   2. The chapter must exist + be active in the central registry.
 *   3. A tenant-bound Bearer token must verify for THIS subdomain.
 *   4. The PortalUser must exist in the tenant schema.
 *   5. The caller must be a `brother`-role session whose REAL Brother.position
 *      is an officer seat → computeMemberCapabilities(...).exec === true.
 *      Anything else (alumni token, member without an officer position, a
 *      missing brother row) → 403. We deliberately recompute `exec` here from
 *      the DB position, never from a client flag.
 *
 * @param req         the incoming Request (for the Authorization header)
 * @param subdomainIn the chapter subdomain from the parsed JSON body
 */
export async function authorizeMobileExec(
  req: Request,
  subdomainIn: unknown,
): Promise<ExecAuthResult> {
  const subdomain = String(subdomainIn || "").trim().toLowerCase();
  if (!subdomain) {
    return { ok: false, status: 400, error: "Chapter subdomain is required." };
  }

  // 1. Chapter must exist + be active.
  const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
  if (!tenant) {
    return { ok: false, status: 404, error: "Chapter not found." };
  }
  if (!tenant.isActive) {
    return { ok: false, status: 403, error: "This chapter is inactive." };
  }

  // 2. Tenant-bound Bearer token.
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  if (!token) {
    return { ok: false, status: 401, error: "Authentication token is required." };
  }
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  // 3. Resolve the tenant client + the caller's PortalUser.
  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({ where: { id: sess.userId } });
  if (!portalUser) {
    return { ok: false, status: 404, error: "User not found in this chapter." };
  }

  // 4. SERVER-SIDE capability recompute. Only a brother-role session bound to a
  //    real Brother row whose admin-set position is an officer seat passes. The
  //    `duesEnabled` arg is irrelevant to exec; pass false (exec ignores it).
  let brotherRow: { id: string; name: string; position: string | null } | null = null;
  if (sess.role === "brother" && portalUser.brotherId) {
    brotherRow = await db.brother.findUnique({
      where: { id: portalUser.brotherId },
      select: { id: true, name: true, position: true },
    });
  }
  const caps = computeMemberCapabilities(sess.role, brotherRow?.position ?? null, false);
  if (!caps.exec || !brotherRow) {
    // Uniform 403 — never leak WHY (no "you're not an officer" enumeration of
    // the position gate). A non-officer simply cannot use exec tools.
    return { ok: false, status: 403, error: "Officer access required." };
  }

  // BILLING WRITE GUARD (P1) — the exec routes are officer WRITES (roster / reset
  // / announce). A Bearer caller carries no browser billing cookie, so the
  // middleware lockout can't touch it; enforce the SAME server-side entitlement
  // check the web admin guards use. A locked-out chapter (canceled / unpaid /
  // trial-expired) is refused with 402. Fails OPEN on any lookup error.
  const { locked } = await checkBillingLock(subdomain);
  if (locked) {
    return {
      ok: false,
      status: 402,
      error: "Billing Lockout: your chapter's subscription needs attention. Visit /admin/billing.",
    };
  }

  return {
    ok: true,
    db,
    portalUser: {
      id: portalUser.id,
      email: portalUser.email,
      role: portalUser.role,
      brotherId: portalUser.brotherId ?? null,
      alumniId: portalUser.alumniId ?? null,
    },
    brother: brotherRow,
    subdomain,
  };
}

/**
 * Best-effort tenant-scoped audit write for the mobile exec routes.
 *
 * The shared lib/audit.ts `audit()` helper resolves its actor from the ADMIN
 * cookie + writes through the Host-proxied global `prisma` — neither is correct
 * for an apex-hosted mobile call (no Host header, no admin cookie; the actor is
 * the verified officer). So we write directly to the caller's tenant `db` with
 * the officer as actor. This does NOT participate in the hash chain (seq/hash
 * left null, which the schema + verifyChain already tolerate for best-effort
 * rows) — the goal here is a forensic "who did this from the app" trail, not a
 * tamper-proof chain link. Never throws: a failed audit must not break the
 * officer's action.
 */
export async function auditMobileExec(
  db: PrismaClient,
  actor: { id: string; name: string },
  opts: {
    action: string;
    subjectType: string;
    subjectId?: string | null;
    subjectName?: string | null;
    details?: string | null;
    req?: Request;
  },
): Promise<void> {
  try {
    const ipAddress =
      opts.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      opts.req?.headers.get("x-real-ip") ||
      null;
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name,
        action: opts.action,
        subjectType: opts.subjectType,
        subjectId: opts.subjectId || null,
        subjectName: opts.subjectName || null,
        details: opts.details || null,
        ipAddress,
      },
    });
  } catch {
    /* best-effort — the exec action already succeeded */
  }
}
