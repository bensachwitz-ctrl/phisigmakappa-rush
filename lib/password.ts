import crypto from "crypto";

/**
 * Password hashing with Node's built-in scrypt — no extra dependency required.
 * Format: scrypt$<saltHex>$<hashHex>
 */

const SALT_BYTES = 16;
const KEY_LEN = 64;

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(plain, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const got = crypto.scryptSync(plain, salt, expected.length);
    return crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}
