// lib/dues-actor.ts — resolve the dues-paying brother + their tenant context for
// BOTH the web (cookie-session) and the bundled native app (Bearer-token) callers
// of POST /api/dues/checkout.
//
// ───────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ───────────────────────────────────────────────────────────────────────────
// The web dues checkout authenticates with the portal/admin COOKIE and reads the
// chapter config through the Host-proxied global `prisma` (getCurrentBrother() +
// getSiteConfig()). The bundled iOS app is apex-hosted and authenticates with a
// tenant-bound BEARER TOKEN + an explicit `subdomain` in the body — there is no
// chapter Host header and no cookie, so the Host-proxied helpers resolve the
// WRONG tenant (or nothing). This helper detects the native path (Bearer + body
// subdomain) and resolves the brother + a tenant-bound Prisma client + the
// chapter SiteConfig map from THAT chapter's schema, so the route's downstream
// logic is identical on both transports.
//
// SECURITY: the native path is Bearer-token authenticated (tenant-bound — a
// chapter-A token never verifies for chapter B), which is exactly why the CSRF
// SameSite/Origin defense is not its boundary and the route can safely accept the
// known native origin. We NEVER trust a client-supplied brotherId — the brother
// is resolved from the verified token's PortalUser → brotherId only.

import { centralDb, getTenantClient, prisma } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { getCurrentBrother } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import type { PrismaClient } from "@prisma/client";

export interface DuesActorFailure {
  ok: false;
  status: number;
  error: string;
}

export interface DuesActorSuccess {
  ok: true;
  /** The dues-paying brother row (id/name/email at minimum). */
  brother: { id: string; name: string; email: string | null };
  /** A Prisma client bound to the brother's chapter schema. */
  db: PrismaClient;
  /** The chapter's SiteConfig as a flat key→value map. */
  cfg: Record<string, string>;
  /** The chapter subdomain (native: from body; web: from Host, may be ""). */
  subdomain: string;
  /** Which transport authenticated the caller. */
  transport: "web" | "native";
}

export type DuesActorResult = DuesActorFailure | DuesActorSuccess;

/** True when the request looks like a native Bearer-token call (vs. web cookie). */
export function isNativeDuesRequest(req: Request, bodySubdomain: unknown): boolean {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") && !!String(bodySubdomain || "").trim();
}

/**
 * Resolve the dues actor for either transport.
 *
 * @param req           the incoming Request (Authorization header for native)
 * @param bodySubdomain the `subdomain` field from the parsed JSON body (native)
 */
export async function resolveDuesActor(
  req: Request,
  bodySubdomain: unknown,
): Promise<DuesActorResult> {
  // ── NATIVE: Bearer token + explicit subdomain ──────────────────────────────
  if (isNativeDuesRequest(req, bodySubdomain)) {
    const subdomain = String(bodySubdomain || "").trim().toLowerCase();

    const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
    if (!tenant) return { ok: false, status: 404, error: "Chapter not found." };
    if (!tenant.isActive) return { ok: false, status: 403, error: "This chapter is inactive." };

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const sess = verifyPortalTokenForTenant(token, subdomain);
    if (!sess || sess.role !== "brother") {
      return { ok: false, status: 401, error: "Invalid or expired session." };
    }

    const db = getTenantClient(subdomain);
    const portalUser = await db.portalUser.findUnique({ where: { id: sess.userId } });
    if (!portalUser?.brotherId) {
      return { ok: false, status: 404, error: "Member not found in this chapter." };
    }
    const brother = await db.brother.findUnique({
      where: { id: portalUser.brotherId },
      select: { id: true, name: true, email: true },
    });
    if (!brother) {
      return { ok: false, status: 404, error: "Member not found in this chapter." };
    }

    // Read the chapter config directly from the tenant schema (getSiteConfig is
    // Host-proxied → wrong tenant on an apex native call).
    const cfg: Record<string, string> = {};
    try {
      const rows = await db.siteConfig.findMany();
      for (const r of rows) cfg[r.key] = r.value;
    } catch {
      /* leave cfg empty → route's prereq check returns the graceful 503 */
    }

    return { ok: true, brother, db, cfg, subdomain, transport: "native" };
  }

  // ── WEB: existing cookie-session path (unchanged behavior) ──────────────────
  const brother = await getCurrentBrother();
  if (!brother) {
    return { ok: false, status: 401, error: "Not signed in" };
  }
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  return {
    ok: true,
    brother: { id: brother.id, name: brother.name, email: brother.email },
    db: prisma,
    cfg,
    subdomain: "",
    transport: "web",
  };
}
