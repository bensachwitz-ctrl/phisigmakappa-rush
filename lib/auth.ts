import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { prisma, getSubdomain } from "@/lib/prisma";

const COOKIE_NAME = "phisig_admin";
const MAX_AGE = 60 * 60 * 12; // 12h
const DEV_FALLBACK_SECRET = "dev-insecure-secret-change-me";

/**
 * Resolve the session secret. In production we REFUSE to fall back to the dev
 * default — if ADMIN_SESSION_SECRET is unset in prod, anyone could mint admin
 * cookies offline using the well-known fallback string. Throwing turns a silent
 * misconfiguration into a loud 500 the operator notices immediately.
 */
function getSecret(): string {
  const env = process.env.ADMIN_SESSION_SECRET;
  if (env) return env;
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    throw new Error("ADMIN_SESSION_SECRET is required in production");
  }
  return DEV_FALLBACK_SECRET;
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * The tenant tag for the CURRENT request — the subdomain, or "_apex" off the
 * apex. Sessions are bound to this so an admin/member cookie minted on chapter A
 * is cryptographically unusable on chapter B (fixes the P0 cross-tenant session
 * takeover: same global secret + Host-selected schema = admin everywhere).
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

/** Per-tenant signing key = HMAC(rootSecret, "gs-tenant:<tenant>"). */
function tenantKeyFor(tenant: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`gs-tenant:${tenant}`)
    .digest("hex");
}
function tenantSecret(): string {
  return tenantKeyFor(currentTenant());
}

/**
 * Constant-time string equality on equal-length hex strings. Falls back to
 * length check first because timingSafeEqual throws on mismatched lengths.
 * Used for HMAC signature compare so an attacker can't byte-by-byte probe
 * the expected signature via response timing.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

// Token format: <brotherId>.<isAdmin01>.<ts>.<sig>, signed with the per-tenant key.
export function createSessionToken(brotherId: string, isAdmin: boolean, tenantOverride?: string) {
  // tenantOverride lets the apex (e.g. /api/onboard) mint a cookie bound to the
  // NEW chapter's subdomain key, so the post-signup redirect to that subdomain
  // verifies. Without it a token signed with the apex key fails on the subdomain.
  const secret = tenantOverride ? tenantKeyFor(tenantOverride) : tenantSecret();
  const ts = Date.now().toString();
  const adminFlag = isAdmin ? "1" : "0";
  const payload = `${brotherId}.${adminFlag}.${ts}`;
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

export function parseSessionToken(token: string | undefined):
  | { brotherId: string; isAdmin: boolean; valid: boolean }
  | null {
  if (!token) return null;
  const parts = token.split(".");
  // Tenant-bound 4-part tokens only. The signing key is derived from the
  // CURRENT request's tenant, so a token minted on another chapter fails the
  // signature check here. (Legacy 3-part / globally-signed tokens are now
  // invalid and force a re-login — intentional for the security fix.)
  if (parts.length !== 4) return null;
  const [brotherId, adminFlag, ts, sig] = parts;
  if (!brotherId || !ts || !sig) return null;
  let expected: string;
  try {
    expected = sign(`${brotherId}.${adminFlag}.${ts}`, tenantSecret());
  } catch {
    return null;
  }
  const sigOk = timingSafeEqualHex(sig, expected);
  const age = Date.now() - parseInt(ts, 10);
  const ageOk = !Number.isNaN(age) && age <= MAX_AGE * 1000;
  return { brotherId, isAdmin: adminFlag === "1", valid: sigOk && ageOk };
}

export function verifySessionToken(token: string | undefined) {
  const parsed = parseSessionToken(token);
  return !!parsed?.valid;
}

export function setBrotherCookie(
  brotherId: string,
  isAdmin: boolean = false,
  opts?: { tenant?: string; domain?: string },
) {
  cookies().set(COOKIE_NAME, createSessionToken(brotherId, isAdmin, opts?.tenant), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    // Domain=.<apex> lets the cookie cross from the apex (where onboarding runs)
    // to the new chapter's subdomain. Only set when COOKIE_DOMAIN is configured
    // (prod w/ a wildcard custom domain); host-only otherwise (localhost/single).
    ...(opts?.domain ? { domain: opts.domain } : {}),
  });
}

export function clearAdminCookie() {
  cookies().delete(COOKIE_NAME);
}

export function isAdminAuthed() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/** True only when the cookie was set via the global admin login (Phisig/DamnProud). */
export function isAdminRole() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const parsed = parseSessionToken(token);
  return !!parsed?.valid && parsed.isAdmin;
}

export function getCurrentBrotherId(): string | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  const parsed = parseSessionToken(token);
  if (!parsed?.valid) return null;
  return parsed.brotherId;
}

export async function getCurrentBrother() {
  // 1. Check admin session first
  const id = getCurrentBrotherId();
  if (id) {
    try {
      const b = await prisma.brother.findUnique({ where: { id } });
      if (b) return b;
    } catch {
      // ignore
    }
  }

  // 2. Check portal session (dynamic import to avoid circular deps)
  try {
    const { getPortalSession } = await import("./portal-auth");
    const portalSess = getPortalSession();
    if (portalSess && portalSess.role === "brother") {
      const portalUser = await prisma.portalUser.findUnique({
        where: { id: portalSess.userId },
      });
      if (portalUser?.brotherId) {
        const b = await prisma.brother.findUnique({ where: { id: portalUser.brotherId } });
        if (b) return b;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function getCurrentSession(): Promise<{ brother: any; isAdmin: boolean } | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const parsed = parseSessionToken(token);
  if (!parsed?.valid) return null;
  const brother = await prisma.brother.findUnique({ where: { id: parsed.brotherId } }).catch(() => null);
  return brother ? { brother, isAdmin: parsed.isAdmin } : null;
}

export const ADMIN_COOKIE = COOKIE_NAME;

/**
 * CSRF defense — Origin / Referer allowlist for state-changing admin routes.
 *
 * SameSite=Lax on the session cookie blocks cross-site XHR cookie-attachment
 * but does NOT cover top-level form-POST navigations or Chromium's "Lax+POST"
 * 2-minute grace window. Combined with the universal CORS-permissive nature
 * of Vercel's static-asset edge, an admin clicking a malicious link within
 * minutes of login could fire a forged top-level POST. Belt-and-suspenders
 * defense: every state-changing handler should call this and return 403 if
 * the request isn't from our own origin.
 *
 * Returns true if the request looks same-origin OR has no Origin/Referer at
 * all (curl, server-to-server). Returns false only when there's an explicit
 * cross-origin signal — i.e. Origin or Referer pointing to a foreign host.
 */
export function isSameOrigin(req: Request): boolean {
  const expected = process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app";
  let expectedHost: string;
  try {
    expectedHost = new URL(expected).host;
  } catch {
    return true; // Misconfigured env — fail open to keep prod working.
  }
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const o = new URL(origin).host;
      return o === expectedHost;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const r = new URL(referer).host;
      return r === expectedHost;
    } catch {
      return false;
    }
  }
  // No Origin and no Referer — typically server-to-server, curl, or
  // Vercel cron. Trust other auth gates (cookie HMAC, signature checks,
  // etc.) to do their job.
  return true;
}
