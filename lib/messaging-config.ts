import { getSiteConfig } from "@/lib/site-config";

/**
 * Per-tenant messaging credential resolution — mirrors lib/stripe.ts's
 * "tenant secret with env fallback" pattern, but for outbound messaging
 * (Resend email + Twilio SMS).
 *
 * WHY: Resend / Twilio creds were previously read straight off GLOBAL
 * `process.env`, so every chapter on the platform shared ONE sender domain
 * and ONE Twilio number. A white-label tenant must be able to send from its
 * OWN verified Resend domain / its OWN Twilio number. We resolve per-tenant
 * values from `SiteConfig` first, then fall back to the env vars so an
 * existing single-tenant deploy keeps working unchanged.
 *
 * `getSiteConfig()` resolves to the CURRENT REQUEST's tenant schema (via the
 * Host-header proxy), so these helpers are correct inside request-scoped API
 * routes. In a no-Host context (cron/script) getSiteConfig degrades to the
 * public schema + DEFAULTS, which means cfg keys are unset and we fall back to
 * env — the same behavior the old code had, so nothing regresses.
 *
 * Both helpers return a NULLABLE primary credential when unconfigured (apiKey
 * null / accountSid null) so callers preserve their existing mock-when-
 * -unconfigured path and never throw a 500 on a chapter that hasn't set up
 * messaging.
 */

/** A Resend API key that is empty, whitespace, or the docs placeholder
 *  `re_xxxxx...` counts as "not configured". */
function isUsableResendKey(key: string | undefined | null): key is string {
  if (!key || !key.trim()) return false;
  if (key.startsWith("re_xxxxx")) return false;
  return true;
}

export type ResendConfig = {
  /** null when no usable key is configured (tenant cfg OR env). */
  apiKey: string | null;
  /** From-ADDRESS (local part + domain). Always a string — defaults to a
   *  NEUTRAL platform address (no-reply@greekstack.vercel.app) so an
   *  unconfigured chapter never leaks another chapter's sender domain. The
   *  chapter-aware From-NAME is layered on by the caller (lib/email via
   *  getChapterIdentity). */
  fromEmail: string;
};

/**
 * Resolve Resend config for the current tenant.
 * cfg `resend.apiKey` / `resend.fromEmail`, falling back to
 * `process.env.RESEND_API_KEY` / `process.env.RESEND_FROM_EMAIL`.
 * Empty / `re_xxxxx` placeholder key → apiKey null (caller stays in mock mode).
 */
export async function getResendConfig(): Promise<ResendConfig> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));

  const rawKey = cfg["resend.apiKey"]?.trim() || process.env.RESEND_API_KEY;
  const apiKey = isUsableResendKey(rawKey) ? rawKey : null;

  const fromEmail =
    cfg["resend.fromEmail"]?.trim() ||
    process.env.RESEND_FROM_EMAIL ||
    // NEUTRAL platform default. A fresh non-Phi-Sig chapter that sets a Resend
    // key but no fromEmail must NOT send From: <their name> <rush@phisig-usc.com>
    // (cross-brand leak). The per-tenant resend.fromEmail / env still override.
    "no-reply@greekstack.vercel.app";

  return { apiKey, fromEmail };
}

export type TwilioConfig = {
  /** All three are present together or all null — Twilio needs the full
   *  triple to send, so a partial config is treated as "not configured". */
  accountSid: string | null;
  authToken: string | null;
  phoneNumber: string | null;
};

/**
 * Resolve Twilio config for the current tenant.
 * cfg `twilio.accountSid` / `twilio.authToken` / `twilio.phoneNumber`,
 * falling back to `process.env.TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`
 * / `TWILIO_PHONE_NUMBER`. Returns all-null when ANY of the three is missing
 * (caller stays in mock mode rather than half-sending).
 */
export async function getTwilioConfig(): Promise<TwilioConfig> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));

  const accountSid =
    cfg["twilio.accountSid"]?.trim() || process.env.TWILIO_ACCOUNT_SID || "";
  const authToken =
    cfg["twilio.authToken"]?.trim() || process.env.TWILIO_AUTH_TOKEN || "";
  const phoneNumber =
    cfg["twilio.phoneNumber"]?.trim() || process.env.TWILIO_PHONE_NUMBER || "";

  if (!accountSid || !authToken || !phoneNumber) {
    return { accountSid: null, authToken: null, phoneNumber: null };
  }

  return { accountSid, authToken, phoneNumber };
}
