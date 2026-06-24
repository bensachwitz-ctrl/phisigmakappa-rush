// otp.ts — one-time-code core for the portal password-reset flow.
//
// The owner's PHASE-3 spec asks for an email OTP reset that is HASHED + EXPIRING
// + SINGLE-USE + RATE-LIMITED + TENANT-SCOPED, with NO account enumeration. This
// module owns the cryptographic core so the route handlers stay thin and the
// security-critical bits are unit-testable WITHOUT a database (the vitest suite
// is pure-node — see vitest.config.ts).
//
// Design points worth knowing before editing:
//
// 1. The code is what gets EMAILED; only its HASH is ever stored. We therefore
//    NEVER persist the plaintext code (unlike the legacy magic-link `magicToken`,
//    which is a long random secret and is stored verbatim). A 6-digit code has
//    only 1,000,000 possibilities, so storing it in the clear would let anyone
//    with a moment of DB/log access read live reset codes. Hashing + the online
//    rate limit + the short expiry together make the small keyspace safe.
//
// 2. The hash is HMAC-SHA256 keyed by the server secret AND BOUND TO THE TENANT
//    (chapter subdomain). Binding means a hash computed for chapter A's code can
//    never validate a code presented against chapter B — even if the same 6
//    digits are guessed — because the per-tenant key differs. This mirrors the
//    per-tenant HMAC the portal SESSION already uses (lib/portal-auth.ts) so the
//    isolation story is identical across auth and reset.
//
// 3. Verification is CONSTANT-TIME (crypto.timingSafeEqual on equal-length hex)
//    so a timing side-channel can't leak how many leading digits matched.
//
// 4. Single-use + expiry are enforced by the CALLER against the stored row
//    (usedAt / expiresAt); this module provides the pure predicates so that
//    logic is testable and the route can't get the comparison subtly wrong.

import crypto from "crypto";

/** Digits in the emailed code. 6 is the spec floor ("6-8 char"); a clean,
 *  human-typeable length. Online brute force is capped by the redemption rate
 *  limiter + the 10-minute expiry, so 10^6 is safe here. */
export const OTP_LENGTH = 6;

/** Default time-to-live for an issued code. The spec calls for "~10 min". */
export const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * Resolve the root signing secret. Reuses the SAME precedence as the portal
 * session (PORTAL_SESSION_SECRET → ADMIN_SESSION_SECRET) so a deploy that has
 * configured portal auth automatically has a reset-OTP secret too — there is no
 * separate env var to forget. In production at least one MUST be set; a silent
 * fallback to a constant dev secret would let an attacker precompute hashes.
 */
function getRootSecret(): string {
  const portal = process.env.PORTAL_SESSION_SECRET;
  if (portal) return portal;
  const admin = process.env.ADMIN_SESSION_SECRET;
  if (admin) return admin;
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    throw new Error(
      "PORTAL_SESSION_SECRET (or ADMIN_SESSION_SECRET fallback) is required to hash reset codes in production",
    );
  }
  return "dev-insecure-portal-secret-change-me";
}

/**
 * Generate a fresh numeric OTP using a cryptographically secure RNG. Uses
 * rejection sampling over crypto.randomInt so every code in [0, 10^len) is
 * equally likely (no modulo bias), then left-pads to a fixed width so codes
 * like "004217" keep their leading zeros.
 */
export function generateOtpCode(length: number = OTP_LENGTH): string {
  if (length < 1 || length > 9) {
    throw new Error("OTP length must be between 1 and 9 digits");
  }
  const max = 10 ** length; // exclusive upper bound
  // crypto.randomInt(max) is uniform on [0, max) — no modulo bias.
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(length, "0");
}

/**
 * Per-tenant hashing key = HMAC(rootSecret, "gs-otp-tenant:<tenant>"). A code
 * hashed for tenant A is unverifiable against tenant B (different key). Pass the
 * chapter subdomain; "_apex" for apex-hosted contexts where no chapter is bound.
 */
function tenantKey(tenant: string): string {
  return crypto
    .createHmac("sha256", getRootSecret())
    .update(`gs-otp-tenant:${tenant || "_apex"}`)
    .digest("hex");
}

/**
 * Hash an OTP for storage / comparison. Normalizes the code (trim + strip any
 * stray non-digits a user might paste, e.g. "012 345") before hashing so the
 * stored hash and the verify-time hash are computed over the same canonical
 * string. Returns lowercase hex.
 *
 * The hash is salted by BOTH the server secret and the tenant, so two chapters
 * that happen to issue the same 6 digits produce different stored hashes.
 */
export function hashOtp(code: string, tenant: string): string {
  const normalized = normalizeOtpInput(code);
  return crypto
    .createHmac("sha256", tenantKey(tenant))
    .update(`otp:${normalized}`)
    .digest("hex");
}

/** Canonicalize user-entered code: trim, drop spaces/dashes a user may type. */
export function normalizeOtpInput(code: string): string {
  return String(code ?? "").trim().replace(/[\s-]/g, "");
}

/** True iff `code` is exactly `length` ASCII digits after normalization. */
export function isValidOtpFormat(code: string, length: number = OTP_LENGTH): boolean {
  const n = normalizeOtpInput(code);
  return new RegExp(`^\\d{${length}}$`).test(n);
}

/**
 * Constant-time comparison of a presented code against a STORED hash, scoped to
 * the tenant. Returns false (never throws) on any malformed input. This is the
 * single source of truth for "does this code match" — the route must call this,
 * never compare hashes with === (which short-circuits and leaks timing).
 */
export function verifyOtp(code: string, storedHash: string, tenant: string): boolean {
  if (!code || !storedHash) return false;
  if (!isValidOtpFormat(code)) return false;
  let computed: string;
  try {
    computed = hashOtp(code, tenant);
  } catch {
    return false;
  }
  if (computed.length !== storedHash.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(storedHash, "hex"),
    );
  } catch {
    return false;
  }
}

/** A stored reset row, narrowed to the fields the predicates below need. */
export interface OtpRecordView {
  expiresAt: Date;
  usedAt: Date | null;
}

/** True once the code is past its expiry. */
export function isOtpExpired(rec: Pick<OtpRecordView, "expiresAt">, now: Date = new Date()): boolean {
  return rec.expiresAt.getTime() <= now.getTime();
}

/** True once the code has been redeemed (single-use enforcement). */
export function isOtpUsed(rec: Pick<OtpRecordView, "usedAt">): boolean {
  return rec.usedAt != null;
}

/**
 * The full "is this stored code redeemable right now" predicate: the presented
 * code must match the stored hash for THIS tenant AND the row must be unexpired
 * AND unused. Pure + total (returns a boolean, never throws) so the route's
 * verify branch is a single call and can't drift from the test's expectations.
 */
export function isOtpRedeemable(
  code: string,
  rec: { codeHash: string; expiresAt: Date; usedAt: Date | null },
  tenant: string,
  now: Date = new Date(),
): boolean {
  if (isOtpExpired(rec, now)) return false;
  if (isOtpUsed(rec)) return false;
  return verifyOtp(code, rec.codeHash, tenant);
}

/** Build the {hash, expiresAt} pair to persist for a freshly generated code. */
export function issueOtp(
  code: string,
  tenant: string,
  ttlMs: number = OTP_TTL_MS,
  now: Date = new Date(),
): { codeHash: string; expiresAt: Date } {
  return {
    codeHash: hashOtp(code, tenant),
    expiresAt: new Date(now.getTime() + ttlMs),
  };
}

/**
 * Password strength gate for the new password chosen after OTP verification.
 * Kept here (next to the reset core) so the route and the test share one rule.
 * Mirrors the existing reset-password floor (>= 8 chars) but additionally
 * requires a mix so a reset can't downgrade an account to "password".
 */
export function validateNewPassword(pw: string): { ok: boolean; error?: string } {
  const p = String(pw ?? "");
  if (p.length < 8) return { ok: false, error: "Password must be at least 8 characters long." };
  if (p.length > 200) return { ok: false, error: "Password is too long." };
  if (!/[a-zA-Z]/.test(p)) return { ok: false, error: "Password must contain a letter." };
  if (!/[0-9]/.test(p)) return { ok: false, error: "Password must contain a number." };
  return { ok: true };
}
