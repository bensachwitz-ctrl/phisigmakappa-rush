import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * PLATFORM (operator / super-admin) authentication — DELIBERATELY SEPARATE from
 * chapter-admin auth in lib/auth.ts.
 *
 * Why a wholly distinct cookie + secret + verifier instead of reusing the
 * chapter `greekstack_admin` session?
 *   • Chapter admins (e-board of any tenant) must NEVER reach the platform
 *     console — it can suspend or DELETE every chapter on the platform. A
 *     chapter admin holds a valid `greekstack_admin` cookie; if the console trusted
 *     that cookie (even with an extra flag) any chapter's e-board could escalate
 *     to operator. So the console gates ONLY on `gs_superadmin`, which is minted
 *     exclusively by SUPERADMIN_PASSWORD and signed with a secret a chapter
 *     admin never possesses.
 *   • The platform operator is Greekstack staff, authenticated by a single
 *     out-of-band password (SUPERADMIN_PASSWORD), not by any per-tenant DB row.
 *
 * Token shape mirrors lib/auth.ts: `<ts>.<sig>` where sig = HMAC-SHA256 over the
 * timestamp, keyed by the platform secret. ~12h lifetime. HttpOnly cookie.
 */

const COOKIE_NAME = "gs_superadmin";
const MAX_AGE = 60 * 60 * 12; // 12h, matching the chapter-admin session
const DEV_FALLBACK_SECRET = "dev-insecure-superadmin-secret-change-me";

/**
 * Resolve the platform signing secret. Prefer SUPERADMIN_SECRET; fall back to
 * ADMIN_SESSION_SECRET so a deploy that already set the chapter secret gets a
 * non-default platform key for free. In production, if NEITHER is set we THROW
 * (fail closed) — otherwise anyone could mint an operator cookie offline using
 * the well-known dev fallback and take over the whole platform.
 */
function getSecret(): string {
  const env = process.env.SUPERADMIN_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (env) return env;
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    throw new Error(
      "SUPERADMIN_SECRET (or ADMIN_SESSION_SECRET) is required in production for the platform console",
    );
  }
  return DEV_FALLBACK_SECRET;
}

function sign(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Constant-time hex-string equality. timingSafeEqual throws on length mismatch,
 * so length-check first; the early-return is safe because both inputs are
 * fixed-width sha256 hex digests (the length is not itself a secret).
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Mint a signed platform-session token: `<ts>.<sig>`. */
function createToken(): string {
  const ts = Date.now().toString();
  const sig = sign(ts, getSecret());
  return `${ts}.${sig}`;
}

/** Verify a platform-session token: signature valid AND not older than MAX_AGE. */
function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  if (!ts || !sig) return false;
  let expected: string;
  try {
    expected = sign(ts, getSecret());
  } catch {
    // Secret missing in prod → getSecret throws → no token can ever verify.
    return false;
  }
  if (!timingSafeEqualHex(sig, expected)) return false;
  const age = Date.now() - parseInt(ts, 10);
  return !Number.isNaN(age) && age >= 0 && age <= MAX_AGE * 1000;
}

/**
 * Constant-time compare of a candidate password against SUPERADMIN_PASSWORD.
 * Returns false (console disabled) when SUPERADMIN_PASSWORD is unset — there is
 * NO hardcoded fallback, so a misconfigured deploy fails closed rather than
 * accepting a well-known default. Length is folded into the result so the
 * boolean never leaks which side was longer via an early return.
 */
export function verifySuperAdminPassword(candidate: string): boolean {
  const expected = process.env.SUPERADMIN_PASSWORD;
  if (!expected) return false;
  const a = String(candidate || "");
  const len = Math.max(a.length, expected.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  bufA.write(a, "utf8");
  bufB.write(expected, "utf8");
  return crypto.timingSafeEqual(bufA, bufB) && a.length === expected.length;
}

/** True if the platform console is configured (SUPERADMIN_PASSWORD is set). */
export function isSuperAdminConfigured(): boolean {
  return !!process.env.SUPERADMIN_PASSWORD;
}

/** Reads + verifies the `gs_superadmin` cookie. The single console gate. */
export function isSuperAdmin(): boolean {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    return verifyToken(token);
  } catch {
    // cookies() throws outside a request scope (e.g. static generation). No
    // request → no operator → deny.
    return false;
  }
}

/** Set the signed platform-session cookie (call AFTER verifying the password). */
export function setSuperAdminCookie(): void {
  cookies().set(COOKIE_NAME, createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Clear the platform-session cookie (logout). */
export function clearSuperAdminCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export const SUPERADMIN_COOKIE = COOKIE_NAME;
