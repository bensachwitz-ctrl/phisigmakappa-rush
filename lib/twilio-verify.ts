import crypto from "crypto";
import { forEachTenant } from "@/lib/prisma";

/**
 * Twilio inbound-webhook signature verification — TENANT-AWARE.
 *
 * Twilio signs each inbound webhook with the auth token of the ACCOUNT that
 * owns the receiving number. The platform supports per-tenant Twilio credentials
 * (lib/messaging-config.ts resolves cfg["twilio.authToken"] BEFORE the env
 * token, and outbound sends with those creds). So a chapter on its OWN Twilio
 * account signs an inbound STOP with its OWN token — NOT the platform env token.
 * Verifying against only process.env.TWILIO_AUTH_TOKEN would 403 that chapter's
 * STOP, the optedOut flip would never run, and the opted-out rushee would keep
 * getting messaged — a real TCPA harm. We therefore accept if the signature
 * matches the env token OR any distinct per-tenant configured token.
 *
 * These helpers are extracted from the route handler so they can be unit-tested
 * directly (a Next.js `route.ts` may only export the HTTP method handlers).
 */

/**
 * Compute the Twilio request signature for a single auth token and compare it
 * (constant-time) to the header value. Twilio computes HMAC-SHA1 of
 * (full URL + sorted form params) using the account auth token, base64-encoded.
 */
export function signatureMatchesToken(
  url: string,
  params: Record<string, string>,
  signatureHeader: string,
  token: string
): boolean {
  if (!token || !signatureHeader) return false;
  // Concatenate URL with sorted (key + value) pairs per Twilio's spec.
  const sorted = Object.keys(params).sort();
  let signed = url;
  for (const k of sorted) signed += k + params[k];
  const expected = crypto
    .createHmac("sha1", token)
    .update(signed, "utf-8")
    .digest("base64");
  // Constant-time compare to avoid timing attacks (length-guard first).
  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

/**
 * Verify the X-Twilio-Signature header against ANY of the candidate auth
 * tokens. Accepts as soon as one token matches.
 *
 * Behavior when NO candidate tokens exist at all:
 *   - Production (NODE_ENV=production OR VERCEL_ENV=production):  DENY.
 *     Fail-closed: an attacker cannot send forged STOP events just because
 *     no token is configured anywhere.
 *   - Dev / preview / test: accept with a warning so local testing works
 *     without round-tripping through the Twilio Console.
 */
export function verifyTwilioSignatureMultiToken(
  url: string,
  params: Record<string, string>,
  signatureHeader: string | null,
  candidateTokens: string[]
): boolean {
  // De-dupe + drop empties so we don't waste HMACs on blanks.
  const tokens = Array.from(new Set(candidateTokens.filter((t) => t && t.trim())));
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (tokens.length === 0) {
    if (isProd) {
      console.error(
        "[sms/inbound] no Twilio auth token configured (env or any tenant) in production — denying"
      );
      return false;
    }
    console.warn(
      "[sms/inbound] no Twilio auth token configured (dev/preview) — accepting unverified"
    );
    return true;
  }
  if (!signatureHeader) return false;
  // Accept if the signature matches ANY configured account's token.
  for (const token of tokens) {
    if (signatureMatchesToken(url, params, signatureHeader, token)) return true;
  }
  return false;
}

/**
 * Collect every distinct Twilio auth token that could legitimately have signed
 * an inbound webhook: the platform env token plus every active tenant's
 * configured cfg["twilio.authToken"]. Errors per tenant are isolated so one bad
 * chapter never blocks verification for the rest.
 */
export async function collectCandidateTwilioTokens(): Promise<string[]> {
  const tokens: string[] = [];
  const envToken = process.env.TWILIO_AUTH_TOKEN;
  if (envToken) tokens.push(envToken);
  try {
    const perTenant = await forEachTenant<string | null>(async (db) => {
      try {
        const row = await db.siteConfig.findUnique({
          where: { key: "twilio.authToken" },
          select: { value: true },
        });
        return row?.value?.trim() || null;
      } catch {
        return null;
      }
    });
    for (const t of perTenant) {
      if (t.ok && t.result) tokens.push(t.result);
    }
  } catch {
    // Registry/DB hiccup → fall back to just the env token (still fail-closed
    // in prod if that's also empty).
  }
  return tokens;
}
