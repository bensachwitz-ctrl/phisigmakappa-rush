// lib/donate-actor.ts — resolve the donating alumnus + their tenant context for
// BOTH the web (cookie-session) and the bundled native app (Bearer-token) callers
// of POST /api/alumni/donate/checkout.
//
// ───────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS  (mirrors lib/dues-actor.ts for the alumni donation path)
// ───────────────────────────────────────────────────────────────────────────
// The web donate checkout authenticates with the portal/admin COOKIE and reads
// the chapter config through the Host-proxied global `prisma` (getPortalSession()
// + getSiteConfig()). The bundled iOS app is apex-hosted and authenticates with a
// tenant-bound BEARER TOKEN + an explicit `subdomain` in the body — there is no
// chapter Host header and no cookie, so the Host-proxied helpers resolve the
// WRONG tenant (or nothing). This helper detects the native path (Bearer + body
// subdomain) and resolves the alumnus + a tenant-bound Prisma client + the
// chapter SiteConfig map from THAT chapter's schema, so the route's downstream
// money logic is byte-identical on both transports.
//
// SECURITY: the donor's alumniId is ALWAYS derived from the verified identity
// (native: the tenant-bound token's PortalUser → alumniId; web: the portal
// cookie session, with the same admin-override fallback the dashboard page uses)
// — NEVER from a client-supplied value. A chapter-A token never verifies for
// chapter B (tenant-bound), which is why the native path can safely skip the
// SameSite/Origin CSRF defense the cookie path relies on.

import { centralDb, getTenantClient, prisma } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { getPortalSession, isAdminOverride } from "@/lib/portal-auth";
import { getSiteConfig } from "@/lib/site-config";
import type { PrismaClient } from "@prisma/client";

export interface DonateActorFailure {
  ok: false;
  status: number;
  error: string;
}

export interface DonateActorSuccess {
  ok: true;
  /** The donating alumnus's AlumniProfile id — always identity-derived. */
  alumniId: string;
  /** A Prisma client bound to the alumnus's chapter schema. */
  db: PrismaClient;
  /** The chapter's SiteConfig as a flat key→value map. */
  cfg: Record<string, string>;
  /** The chapter subdomain (native: from body; web: "" → Host-derived later). */
  subdomain: string;
  /** Which transport authenticated the caller. */
  transport: "web" | "native";
}

export type DonateActorResult = DonateActorFailure | DonateActorSuccess;

/** True when the request looks like a native Bearer-token call (vs. web cookie). */
export function isNativeDonateRequest(req: Request, bodySubdomain: unknown): boolean {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") && !!String(bodySubdomain || "").trim();
}

/**
 * Resolve the donating alumnus for either transport.
 *
 * @param req           the incoming Request (Authorization header for native)
 * @param bodySubdomain the `subdomain` field from the parsed JSON body (native)
 */
export async function resolveDonateActor(
  req: Request,
  bodySubdomain: unknown,
): Promise<DonateActorResult> {
  // ── NATIVE: Bearer token + explicit subdomain ──────────────────────────────
  if (isNativeDonateRequest(req, bodySubdomain)) {
    const subdomain = String(bodySubdomain || "").trim().toLowerCase();

    const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
    if (!tenant) return { ok: false, status: 404, error: "Chapter not found." };
    if (!tenant.isActive) return { ok: false, status: 403, error: "This chapter is inactive." };

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const sess = verifyPortalTokenForTenant(token, subdomain);
    if (!sess || sess.role !== "alumni") {
      return { ok: false, status: 401, error: "Invalid or expired session." };
    }

    const db = getTenantClient(subdomain);
    const portalUser = await db.portalUser.findUnique({ where: { id: sess.userId } });
    if (!portalUser?.alumniId) {
      return { ok: false, status: 404, error: "Alumni profile not found" };
    }

    // Read the chapter config directly from the tenant schema (getSiteConfig is
    // Host-proxied → wrong tenant on an apex native call).
    const cfg: Record<string, string> = {};
    try {
      const rows = await db.siteConfig.findMany();
      for (const r of rows) cfg[r.key] = r.value;
    } catch {
      /* leave cfg empty → the route's connect-ready gate returns a graceful error */
    }

    return { ok: true, alumniId: portalUser.alumniId, db, cfg, subdomain, transport: "native" };
  }

  // ── WEB: existing cookie-session path (unchanged behavior) ──────────────────
  // Only a logged-in alumnus (or an admin overriding into the alumni portal — the
  // same override the dashboard page honors) may open a donation checkout.
  const s = getPortalSession();
  const isAdmin = isAdminOverride();
  if ((!s || s.role !== "alumni") && !isAdmin) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  let alumniId: string | null = null;
  if (s?.role === "alumni") {
    const portalUser = await prisma.portalUser.findUnique({ where: { id: s.userId } });
    alumniId = portalUser?.alumniId || null;
  }
  if (isAdmin && !alumniId) {
    // Admin override (no alumni cookie): fall back to the first alumnus, exactly
    // as the dashboard page does when an admin views the alumni portal.
    const firstAlumni = await prisma.alumniProfile.findFirst();
    alumniId = firstAlumni?.id || null;
  }
  if (!alumniId) {
    return { ok: false, status: 404, error: "Alumni profile not found" };
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  return { ok: true, alumniId, db: prisma, cfg, subdomain: "", transport: "web" };
}
