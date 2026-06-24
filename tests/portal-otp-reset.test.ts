import { describe, it, expect, beforeEach } from "vitest";
import {
  generateOtpCode,
  hashOtp,
  verifyOtp,
  normalizeOtpInput,
  isValidOtpFormat,
  isOtpExpired,
  isOtpUsed,
  isOtpRedeemable,
  issueOtp,
  validateNewPassword,
  OTP_LENGTH,
  OTP_TTL_MS,
} from "@/lib/otp";

/**
 * PHASE-3 reset-OTP core guard. The owner asked for an email OTP reset that is
 * HASHED + EXPIRING + SINGLE-USE + RATE-LIMITED + TENANT-SCOPED with NO account
 * enumeration. This suite pins the cryptographic core (lib/otp.ts) so those
 * properties can't silently regress. Pure-node (no DB) — matches the repo's
 * vitest convention.
 */

// The OTP key derives from PORTAL_SESSION_SECRET/ADMIN_SESSION_SECRET. Set a
// deterministic secret so hashes are stable within the run.
beforeEach(() => {
  process.env.PORTAL_SESSION_SECRET = "test-portal-secret-for-otp";
  delete process.env.ADMIN_SESSION_SECRET;
});

describe("OTP generation", () => {
  it("generates a code of the configured length, all digits", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtpCode();
      expect(code).toHaveLength(OTP_LENGTH);
      expect(/^\d+$/.test(code)).toBe(true);
    }
  });

  it("preserves leading zeros (fixed-width, no value collapse)", () => {
    // Over many draws we expect at least one code with a leading zero; each is
    // always exactly OTP_LENGTH so "004217" is never rendered as "4217".
    let sawLeadingZero = false;
    for (let i = 0; i < 1000; i++) {
      const c = generateOtpCode();
      expect(c).toHaveLength(OTP_LENGTH);
      if (c[0] === "0") sawLeadingZero = true;
    }
    expect(sawLeadingZero).toBe(true);
  });

  it("produces a spread of distinct values (not a constant)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateOtpCode());
    // Random 6-digit codes should rarely collide across 500 draws.
    expect(seen.size).toBeGreaterThan(400);
  });
});

describe("OTP format validation + normalization", () => {
  it("accepts exactly N digits, rejects wrong length / non-digits", () => {
    expect(isValidOtpFormat("123456")).toBe(true);
    expect(isValidOtpFormat("12345")).toBe(false);
    expect(isValidOtpFormat("1234567")).toBe(false);
    expect(isValidOtpFormat("12a456")).toBe(false);
    expect(isValidOtpFormat("")).toBe(false);
  });

  it("normalizes pasted spacing/dashes before validating", () => {
    expect(normalizeOtpInput("  123 456 ")).toBe("123456");
    expect(normalizeOtpInput("123-456")).toBe("123456");
    expect(isValidOtpFormat(" 123 456 ")).toBe(true);
  });
});

describe("OTP hashing — never stores plaintext, binds to tenant", () => {
  it("hash is hex and does NOT contain the plaintext code", () => {
    const code = "428190";
    const h = hashOtp(code, "alpha");
    expect(/^[0-9a-f]{64}$/.test(h)).toBe(true);
    expect(h).not.toContain(code);
  });

  it("same code hashes DIFFERENTLY for different tenants (isolation)", () => {
    const code = "654321";
    const a = hashOtp(code, "alpha");
    const b = hashOtp(code, "beta");
    expect(a).not.toBe(b);
  });

  it("same code + same tenant is stable (so verify can match)", () => {
    expect(hashOtp("111222", "alpha")).toBe(hashOtp("111222", "alpha"));
  });
});

describe("OTP verification — constant-time, correct match semantics", () => {
  it("verifies the correct code against its stored hash", () => {
    const code = generateOtpCode();
    const stored = hashOtp(code, "alpha");
    expect(verifyOtp(code, stored, "alpha")).toBe(true);
  });

  it("rejects a WRONG code", () => {
    const stored = hashOtp("123456", "alpha");
    expect(verifyOtp("123457", stored, "alpha")).toBe(false);
    expect(verifyOtp("000000", stored, "alpha")).toBe(false);
  });

  it("TENANT ISOLATION: a code for chapter A can't reset chapter B", () => {
    const code = "246802";
    // Chapter A issues + stores the hash.
    const storedForA = hashOtp(code, "alpha");
    // Presenting the exact same code under chapter B's tenant must FAIL — the
    // per-tenant key differs, so B can never redeem A's code.
    expect(verifyOtp(code, storedForA, "beta")).toBe(false);
    // And it still works for A (sanity).
    expect(verifyOtp(code, storedForA, "alpha")).toBe(true);
  });

  it("rejects malformed input without throwing", () => {
    const stored = hashOtp("123456", "alpha");
    expect(verifyOtp("", stored, "alpha")).toBe(false);
    expect(verifyOtp("12345", stored, "alpha")).toBe(false);
    expect(verifyOtp("123456", "", "alpha")).toBe(false);
  });
});

describe("OTP expiry + single-use predicates", () => {
  const tenant = "alpha";
  const code = "135790";

  it("is redeemable when fresh, unused, and code matches", () => {
    const { codeHash, expiresAt } = issueOtp(code, tenant);
    expect(isOtpRedeemable(code, { codeHash, expiresAt, usedAt: null }, tenant)).toBe(true);
  });

  it("rejects an EXPIRED code", () => {
    const past = new Date(Date.now() - 60_000);
    const { codeHash } = issueOtp(code, tenant);
    const rec = { codeHash, expiresAt: past, usedAt: null };
    expect(isOtpExpired(rec)).toBe(true);
    expect(isOtpRedeemable(code, rec, tenant)).toBe(false);
  });

  it("rejects a REUSED (already-redeemed) code even if otherwise valid", () => {
    const { codeHash, expiresAt } = issueOtp(code, tenant);
    const rec = { codeHash, expiresAt, usedAt: new Date() };
    expect(isOtpUsed(rec)).toBe(true);
    expect(isOtpRedeemable(code, rec, tenant)).toBe(false);
  });

  it("issueOtp sets expiry ~TTL in the future", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const { expiresAt } = issueOtp(code, tenant, OTP_TTL_MS, now);
    expect(expiresAt.getTime()).toBe(now.getTime() + OTP_TTL_MS);
  });

  it("a wrong code is not redeemable even when fresh + unused", () => {
    const { codeHash, expiresAt } = issueOtp(code, tenant);
    expect(isOtpRedeemable("999999", { codeHash, expiresAt, usedAt: null }, tenant)).toBe(false);
  });
});

describe("new-password strength gate (post-OTP reset)", () => {
  it("accepts a strong-enough password", () => {
    expect(validateNewPassword("hunter2pass").ok).toBe(true);
  });

  it("rejects too-short", () => {
    const r = validateNewPassword("ab1");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/8 characters/);
  });

  it("rejects all-letters (no number) and all-digits (no letter)", () => {
    expect(validateNewPassword("abcdefghij").ok).toBe(false);
    expect(validateNewPassword("1234567890").ok).toBe(false);
  });
});
