// Edge-safe HMAC verification used by middleware. No Node imports.
// Mirrors the signing logic in lib/auth.ts which uses Node's `crypto`.

const enc = new TextEncoder();

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

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export async function verifyEdgeSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [brotherId, ts, sig] = parts;
  if (!brotherId || !ts || !sig) return false;

  const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
  const expected = await hmacSha256Hex(secret, `${brotherId}.${ts}`);
  if (expected !== sig) return false;

  const age = Date.now() - parseInt(ts, 10);
  if (Number.isNaN(age) || age > MAX_AGE_MS) return false;
  return true;
}
