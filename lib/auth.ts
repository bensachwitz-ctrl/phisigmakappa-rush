import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "phisig_admin";
const MAX_AGE = 60 * 60 * 12; // 12h

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

// Token format: <brotherId>.<isAdmin01>.<ts>.<sig>
export function createSessionToken(brotherId: string, isAdmin: boolean) {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
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
  // Backwards-compatible: also accept legacy 3-part token <brotherId>.<ts>.<sig>
  // and treat those as non-admin until they re-login.
  if (parts.length === 4) {
    const [brotherId, adminFlag, ts, sig] = parts;
    if (!brotherId || !ts || !sig) return null;
    const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
    const expected = sign(`${brotherId}.${adminFlag}.${ts}`, secret);
    const sigOk = sig === expected;
    const age = Date.now() - parseInt(ts, 10);
    const ageOk = !Number.isNaN(age) && age <= MAX_AGE * 1000;
    return { brotherId, isAdmin: adminFlag === "1", valid: sigOk && ageOk };
  }
  if (parts.length === 3) {
    const [brotherId, ts, sig] = parts;
    if (!brotherId || !ts || !sig) return null;
    const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
    const expected = sign(`${brotherId}.${ts}`, secret);
    const sigOk = sig === expected;
    const age = Date.now() - parseInt(ts, 10);
    const ageOk = !Number.isNaN(age) && age <= MAX_AGE * 1000;
    return { brotherId, isAdmin: false, valid: sigOk && ageOk };
  }
  return null;
}

export function verifySessionToken(token: string | undefined) {
  const parsed = parseSessionToken(token);
  return !!parsed?.valid;
}

export function setBrotherCookie(brotherId: string, isAdmin: boolean = false) {
  cookies().set(COOKIE_NAME, createSessionToken(brotherId, isAdmin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
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
  const id = getCurrentBrotherId();
  if (!id) return null;
  try {
    return await prisma.brother.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<{ brother: any; isAdmin: boolean } | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const parsed = parseSessionToken(token);
  if (!parsed?.valid) return null;
  const brother = await prisma.brother.findUnique({ where: { id: parsed.brotherId } }).catch(() => null);
  return brother ? { brother, isAdmin: parsed.isAdmin } : null;
}

export const ADMIN_COOKIE = COOKIE_NAME;
