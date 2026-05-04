// Edge-safe HMAC verification used by middleware. No Node imports.
// Mirrors the signing logic in lib/auth.ts which uses Node's `crypto`.
//
// Token format support:
//   • Modern (4-part): <brotherId>.<adminFlag>.<ts>.<sig> — minted by setBrotherCookie
//   • Legacy (3-part): <brotherId>.<ts>.<sig> — older sessions

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
 * Constant-time hex string compare for the Edge runtime, which has no
 * crypto.timingSafeEqual. Iterates every char of both strings using XOR-OR
 * accumulator so total work is fixed regardless of where the first mismatch
 * is, defeating timing oracles. Length-mismatch short-circuits — that
 * difference is never sensitive (signatures are always 64 hex chars).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export async function verifyEdgeSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  // Production REFUSES to fall back to the dev default secret — a missing
  // env var must not silently let attackers mint admin cookies offline.
  // (The Node /lib/auth.ts side throws; the Edge side is read-only so we
  // simply fail closed.)
  const env = process.env.ADMIN_SESSION_SECRET;
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (!env && isProd) return false;
  const secret = env || DEV_FALLBACK_SECRET;

  // Modern 4-part: <brotherId>.<adminFlag>.<ts>.<sig>
  if (parts.length === 4) {
    const [brotherId, adminFlag, ts, sig] = parts;
    if (!brotherId || !ts || !sig) return false;
    const expected = await hmacSha256Hex(secret, `${brotherId}.${adminFlag}.${ts}`);
    if (!timingSafeEqual(expected, sig)) return false;
    const age = Date.now() - parseInt(ts, 10);
    if (Number.isNaN(age) || age > MAX_AGE_MS) return false;
    return true;
  }

  // Legacy 3-part: <brotherId>.<ts>.<sig>
  if (parts.length === 3) {
    const [brotherId, ts, sig] = parts;
    if (!brotherId || !ts || !sig) return false;
    const expected = await hmacSha256Hex(secret, `${brotherId}.${ts}`);
    if (!timingSafeEqual(expected, sig)) return false;
    const age = Date.now() - parseInt(ts, 10);
    if (Number.isNaN(age) || age > MAX_AGE_MS) return false;
    return true;
  }

  return false;
}
