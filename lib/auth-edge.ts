// Edge-safe HMAC verification used by middleware. No Node imports.
// Mirrors lib/auth.ts: a 4-part token <brotherId>.<adminFlag>.<ts>.<sig> signed
// with a PER-TENANT key derived from the root secret + the request's subdomain,
// so a cookie minted on chapter A is cryptographically rejected on chapter B.

import { getSubdomain as getSubdomainEdge } from "./tenant-host";

const enc = new TextEncoder();
const DEV_FALLBACK_SECRET = "dev-insecure-secret-change-me";

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Constant-time hex string compare for the Edge runtime (no crypto.timingSafeEqual).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// The tenant tag (getSubdomainEdge) now comes from the shared edge-safe source
// lib/tenant-host — the exact same function lib/prisma.getSubdomain delegates to
// — so the tag computed here can never drift from the one used when the token
// was minted (a drift would silently break cross-runtime session verification).

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * Verify the admin session cookie for the tenant identified by `host`. The
 * caller (middleware) must pass the request's Host so the per-tenant signing
 * key matches — a token for another chapter fails the signature check.
 * Production REFUSES the dev fallback secret (fail closed).
 */
export async function verifyEdgeSession(
  token: string | undefined,
  host?: string | null
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false; // tenant-bound tokens only

  const env = process.env.ADMIN_SESSION_SECRET;
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (!env && isProd) return false;
  const rootSecret = env || DEV_FALLBACK_SECRET;

  const tenant = getSubdomainEdge(host ?? null) || "_apex";
  const tenantSecret = await hmacSha256Hex(rootSecret, `gs-tenant:${tenant}`);

  const [brotherId, adminFlag, ts, sig] = parts;
  if (!brotherId || !ts || !sig) return false;
  const expected = await hmacSha256Hex(tenantSecret, `${brotherId}.${adminFlag}.${ts}`);
  if (!timingSafeEqual(expected, sig)) return false;
  const age = Date.now() - parseInt(ts, 10);
  if (Number.isNaN(age) || age > MAX_AGE_MS) return false;
  return true;
}
