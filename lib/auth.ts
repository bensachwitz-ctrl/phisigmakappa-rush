import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "phisig_admin";
const MAX_AGE = 60 * 60 * 12; // 12h

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

// Token format: <brotherId>.<ts>.<sig>
export function createSessionToken(brotherId: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
  const ts = Date.now().toString();
  const payload = `${brotherId}.${ts}`;
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

export function parseSessionToken(token: string | undefined):
  | { brotherId: string; valid: boolean }
  | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [brotherId, ts, sig] = parts;
  if (!brotherId || !ts || !sig) return null;
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
  const expected = sign(`${brotherId}.${ts}`, secret);
  const sigOk = sig === expected;
  const age = Date.now() - parseInt(ts, 10);
  const ageOk = !Number.isNaN(age) && age <= MAX_AGE * 1000;
  return { brotherId, valid: sigOk && ageOk };
}

export function verifySessionToken(token: string | undefined) {
  const parsed = parseSessionToken(token);
  return !!parsed?.valid;
}

export function setBrotherCookie(brotherId: string) {
  cookies().set(COOKIE_NAME, createSessionToken(brotherId), {
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

export const ADMIN_COOKIE = COOKIE_NAME;
