// portal-auth.ts — single source of truth for the three-portal session model
// (Brothers / Alumni / PNM). Mirrors the shape of lib/auth.ts but issues its
// own cookie + JWT so the existing /admin gate stays untouched.
//
// Design points worth knowing before editing:
//
// 1. Separate cookie name (`greekstack_portal`) — admin sessions are signed with
//    ADMIN_SESSION_SECRET; portal sessions with PORTAL_SESSION_SECRET. If
//    PORTAL_SESSION_SECRET is missing we degrade gracefully to the admin
//    secret so a deploy without the new env var still works. In production
//    this should ALWAYS be set explicitly — see Vercel env vars.
//
// 2. Role baked into the token — the cookie carries the role so middleware
//    can route a brother-portal request from someone holding an alumni
//    token straight to /portal/alumni without a DB lookup.
//
// 3. 30-day expiry by default — alumni who pay yearly should not have to
//    re-auth every week. Stricter than admin (12h) because the blast
//    radius of a stolen portal cookie is lower (no chapter-wide mutations).
//
// 4. Admin-override aware — getPortalSession() returns null when only an
//    admin cookie is present, but isAdminOrPortal() can be used to surface
//    admin-style views inside portal routes (the brief calls this out for
//    /portal/brothers showing the admin "all brothers" banner).

import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { prisma, getSubdomain } from "@/lib/prisma";
import { parseSessionToken } from "@/lib/auth";

export const PORTAL_COOKIE = "greekstack_portal";
const MAX_AGE_DAYS = 30;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export type PortalRole = "brother" | "alumni" | "pnm";

export interface PortalSession {
  userId: string;
  role: PortalRole;
  email?: string;
  brotherId?: string | null;
  alumniId?: string | null;
}

/**
 * Resolve the signing secret. PORTAL_SESSION_SECRET takes priority. Falls back
 * to ADMIN_SESSION_SECRET so deploys that haven't set the new var still work —
 * this is the "graceful degradation" the brief calls out. In production both
 * should be set, but a one-missing-env-var deploy is not a fatal outage.
 *
 * If neither is set in prod we throw — a silent fallback to a hardcoded dev
 * secret would let anyone mint portal cookies offline.
 */
function getSecret(): string {
  const portal = process.env.PORTAL_SESSION_SECRET;
  if (portal) return portal;
  const admin = process.env.ADMIN_SESSION_SECRET;
  if (admin) return admin;
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    throw new Error(
      "PORTAL_SESSION_SECRET (or ADMIN_SESSION_SECRET fallback) is required in production"
    );
  }
  return "dev-insecure-portal-secret-change-me";
}

function sign(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Tenant tag for the CURRENT request — the subdomain, or "_apex" off the apex.
 * Portal sessions are bound to this so a member/alumni/PNM cookie minted on
 * chapter A is cryptographically unusable on chapter B. Without this, the tenant
 * schema is chosen from the Host header while the cookie is signed with one
 * global secret — so a portal cookie from any chapter would authenticate on
 * every other chapter (same P0 cross-tenant takeover the admin cookie had).
 */
function currentTenant(): string {
  try {
    const h = headers();
    const host = h.get("host") || h.get("x-forwarded-host");
    return getSubdomain(host) || "_apex";
  } catch {
    return "_apex";
  }
}

/** Per-tenant portal signing key = HMAC(rootSecret, "gs-portal-tenant:<tenant>").
 *  Pass an explicit tenant for apex-hosted contexts (e.g. /api/mobile/*) where the
 *  Host header is the apex and currentTenant() would wrongly resolve to "_apex". */
function tenantSecret(tenant?: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`gs-portal-tenant:${tenant ?? currentTenant() ?? "_apex"}`)
    .digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Sign a portal token. Format: `<userId>.<role>.<ts>.<sig>`.
 *
 * Why not a real JWT lib: this exact HMAC-then-concat shape matches lib/auth.ts
 * so verification, expiry, and rotation logic share a mental model. A real JWT
 * would buy us very little — no third party validates these — and ship 30 KB
 * of additional dependency surface.
 */
export function signPortalToken(userId: string, role: PortalRole): string {
  return signPortalTokenForTenant(userId, role, currentTenant());
}

/**
 * Tenant-EXPLICIT token signing for contexts where the tenant cannot be derived
 * from the Host header — chiefly the apex-hosted /api/mobile/* routes. The native
 * app sends the chapter `subdomain`; binding the HMAC to THAT subdomain means a
 * token minted for chapter A only verifies when subdomain="A" is presented, so it
 * can never read chapter B's data (presenting "B" derives B's secret, against which
 * A's signature fails). Without this every mobile token used the apex secret — the
 * P0 cross-tenant takeover hole.
 */
export function signPortalTokenForTenant(
  userId: string,
  role: PortalRole,
  tenant: string
): string {
  const secret = tenantSecret(tenant);
  const ts = Date.now().toString();
  const payload = `${userId}.${role}.${ts}`;
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verify a portal token. Returns the decoded session OR null when:
 *   - token is malformed
 *   - signature doesn't verify
 *   - token is older than MAX_AGE_DAYS
 */
export function verifyPortalToken(
  token: string | undefined | null
): { userId: string; role: PortalRole } | null {
  return verifyPortalTokenForTenant(token, currentTenant());
}

/**
 * Tenant-EXPLICIT verification — see signPortalTokenForTenant. The apex-hosted
 * /api/mobile/* routes pass the request's `subdomain`, so a token only verifies
 * for the chapter it was minted for (presenting any other subdomain derives a
 * different secret and the signature fails) — no cross-tenant reuse.
 */
export function verifyPortalTokenForTenant(
  token: string | undefined | null,
  tenant: string
): { userId: string; role: PortalRole } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, role, ts, sig] = parts;
  if (!userId || !role || !ts || !sig) return null;
  if (role !== "brother" && role !== "alumni" && role !== "pnm") return null;
  let expected: string;
  try {
    expected = sign(`${userId}.${role}.${ts}`, tenantSecret(tenant));
  } catch {
    return null;
  }
  if (!timingSafeEqualHex(sig, expected)) return null;
  const age = Date.now() - parseInt(ts, 10);
  if (Number.isNaN(age) || age < 0 || age > MAX_AGE_MS) return null;
  return { userId, role: role as PortalRole };
}

/**
 * Read the portal cookie + decode it. Returns null if no valid session.
 *
 * This does NOT hit the database — pure cookie verification, fast enough to
 * call from middleware and from every page render without N+1 concerns.
 * Callers who need the full PortalUser row should call `getPortalUser()`.
 */
export function getPortalSession(): { userId: string; role: PortalRole } | null {
  const token = cookies().get(PORTAL_COOKIE)?.value;
  return verifyPortalToken(token);
}

/**
 * Convenience: load the full PortalUser row (brother/alumni relations
 * not included — fetch those separately if you need them).
 */
export async function getPortalUser() {
  const sess = getPortalSession();
  if (!sess) return null;
  try {
    return await prisma.portalUser.findUnique({ where: { id: sess.userId } });
  } catch {
    return null;
  }
}

/**
 * Set the portal cookie. HttpOnly, Secure in prod, SameSite=Lax. 30-day expiry.
 */
export function setPortalCookie(userId: string, role: PortalRole): void {
  cookies().set(PORTAL_COOKIE, signPortalToken(userId, role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  });
}

export function clearPortalCookie(): void {
  cookies().delete(PORTAL_COOKIE);
}

/**
 * Returns true if the current admin session cookie is valid AND was set via
 * the global shared-admin login (i.e. the cookie's adminFlag === "1"). This
 * is the "admin override" the brief asks for — admin viewing any portal sees
 * an "Admin viewing — all X" banner and gets CRUD access to the underlying
 * admin tables.
 *
 * Implementation note: we read the existing greekstack_admin cookie via the
 * already-shipped parseSessionToken helper so a future change to admin cookie
 * shape only needs editing in lib/auth.ts.
 */
export function isAdminOverride(): boolean {
  const adminCookie = cookies().get("greekstack_admin")?.value;
  const parsed = parseSessionToken(adminCookie);
  return !!parsed?.valid && parsed.isAdmin;
}

/**
 * Compose result of `getEitherSession`: which session is active, and which
 * role they currently look like to the application.
 */
export interface AnySession {
  kind: "admin" | "portal" | null;
  portal: { userId: string; role: PortalRole } | null;
  isAdmin: boolean;
}

/**
 * Resolve "who is talking to us right now" across both admin + portal cookies.
 * Used by /portal/* pages that need to render the admin-override banner.
 *
 * Priority: portal cookie OR admin cookie (both can be present at once — admin
 * impersonating a portal view shows admin banner ON TOP of the portal layout).
 */
export function getEitherSession(): AnySession {
  const portal = getPortalSession();
  const isAdmin = isAdminOverride();
  if (!portal && !isAdmin) return { kind: null, portal: null, isAdmin: false };
  return {
    kind: portal ? "portal" : "admin",
    portal,
    isAdmin,
  };
}

/**
 * Role guard for page-level use. Returns the session if the role matches OR
 * the admin override is active; returns null otherwise so the caller can
 * redirect to the right login.
 *
 * Usage in a page:
 *   const sess = requireRole("brother");
 *   if (!sess) redirect("/portal/brothers");
 */
export function requireRole(
  role: PortalRole
): { portal: { userId: string; role: PortalRole } | null; isAdmin: boolean } | null {
  const sess = getEitherSession();
  if (sess.isAdmin) return { portal: sess.portal, isAdmin: true };
  if (sess.portal && sess.portal.role === role) {
    return { portal: sess.portal, isAdmin: false };
  }
  return null;
}

/**
 * PHASE-3 OTP gate. After an OTP code is verified (/api/portal/reset/verify) the
 * member holds a real portal session but their PortalUser carries mustReset=true.
 * Such a session must be able to reach ONLY the "create new password" step —
 * never the app. This helper returns the reset-redirect path when the current
 * session's user is in the must-reset state, or null when they're clear to
 * proceed. Server-component callers do:
 *
 *   const reset = await portalMustResetRedirect();
 *   if (reset) redirect(reset);
 *
 * Returns null on any error / no session (the caller's own role guard handles
 * the unauthenticated case) so a transient DB hiccup never locks a normal member
 * out of their dashboard.
 */
export async function portalMustResetRedirect(): Promise<string | null> {
  const sess = getPortalSession();
  if (!sess) return null;
  try {
    const user = await prisma.portalUser.findUnique({
      where: { id: sess.userId },
      select: { mustReset: true },
    });
    if (user?.mustReset) return "/portal/reset-password?step=new";
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a magic-link token. Single-use; expires in 30 minutes. The token
 * gets emailed; the consumer hits /api/portal/<role>/verify?token=... to
 * exchange it for a session cookie. We store the token + expiry on the
 * PortalUser row so verify is a one-DB-lookup operation.
 */
export function generateMagicToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  return { token, expiresAt };
}
