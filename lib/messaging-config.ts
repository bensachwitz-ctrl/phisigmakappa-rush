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

// ─────────────────────────────────────────────────────────────────────────────
// listmonk — self-hosted email-list + transactional sender (OSS Mailchimp alt).
// Resolved the same way as Resend/Twilio: per-tenant SiteConfig first, env
// fallback. When unconfigured, lib/email.ts stays on its existing Resend→mock
// path, so nothing regresses. listmonk is an ADDITIVE second email provider
// that also maintains durable subscriber lists (brothers/alumni segments).
//
// Auth is HTTP Basic api_user:token. `url` is the listmonk base origin
// (no trailing /api). All four resolve together — a partial config (e.g. URL
// but no token) is treated as "not configured" so we never half-send.
// ─────────────────────────────────────────────────────────────────────────────
export type ListmonkConfig = {
  /** Base origin of the listmonk instance, e.g. "https://lists.chapter.org".
   *  Null when not fully configured. */
  url: string | null;
  /** API username (listmonk "API user"). */
  user: string | null;
  /** API access token / password for the API user. */
  pass: string | null;
};

/**
 * Resolve listmonk config for the current tenant.
 * cfg `listmonk.url` / `listmonk.user` / `listmonk.pass`, falling back to
 * `process.env.LISTMONK_URL` / `LISTMONK_USER` / `LISTMONK_PASS`.
 * Returns all-null when ANY of the three is missing.
 */
export async function getListmonkConfig(): Promise<ListmonkConfig> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));

  const rawUrl =
    cfg["listmonk.url"]?.trim() || process.env.LISTMONK_URL?.trim() || "";
  const user =
    cfg["listmonk.user"]?.trim() || process.env.LISTMONK_USER?.trim() || "";
  const pass =
    cfg["listmonk.pass"]?.trim() || process.env.LISTMONK_PASS?.trim() || "";

  if (!rawUrl || !user || !pass) {
    return { url: null, user: null, pass: null };
  }
  // Normalize: drop any trailing slash and a trailing /api so callers can
  // append /api/... uniformly regardless of how the operator pasted the URL.
  const url = rawUrl.replace(/\/+$/, "").replace(/\/api$/i, "");
  return { url, user, pass };
}

export type TwilioConfig = {
  /** All three are present together or all null — Twilio needs the full
   *  triple to send, so a partial config is treated as "not configured". */
  accountSid: string | null;
  authToken: string | null;
  phoneNumber: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// textbee — self-hosted Android SMS gateway (REST). The $0 SMS path for Greek
// Stack rush/brother texts. Resolved per-tenant SiteConfig → env, exactly like
// Twilio. When unconfigured, lib/sms.ts falls back to Twilio (if configured)
// and finally to the DB-logged mock path. textbee is the PRIMARY SMS provider
// when present; Twilio is the secondary.
//
// Send shape (see lib/sms.ts):
//   POST {apiUrl}/api/v1/gateway/devices/{deviceId}/send-sms
//   headers: { x-api-key: apiKey }
//   body: { recipients: [E164...], message }
// ─────────────────────────────────────────────────────────────────────────────
export type TextbeeConfig = {
  /** Base origin of the textbee API, e.g. "https://api.textbee.dev" or a
   *  self-hosted origin. Null when not fully configured. */
  apiUrl: string | null;
  /** textbee API key (sent as the x-api-key header). */
  apiKey: string | null;
  /** Registered device id the SMS is dispatched through. */
  deviceId: string | null;
};

/**
 * Resolve textbee config for the current tenant.
 * cfg `textbee.apiUrl` / `textbee.apiKey` / `textbee.deviceId`, falling back to
 * `process.env.TEXTBEE_API_URL` / `TEXTBEE_API_KEY` / `TEXTBEE_DEVICE_ID`.
 * Returns all-null when ANY of the three is missing (caller falls back to
 * Twilio/mock rather than half-sending).
 */
export async function getTextbeeConfig(): Promise<TextbeeConfig> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));

  const rawUrl =
    cfg["textbee.apiUrl"]?.trim() || process.env.TEXTBEE_API_URL?.trim() || "";
  const apiKey =
    cfg["textbee.apiKey"]?.trim() || process.env.TEXTBEE_API_KEY?.trim() || "";
  const deviceId =
    cfg["textbee.deviceId"]?.trim() || process.env.TEXTBEE_DEVICE_ID?.trim() || "";

  if (!rawUrl || !apiKey || !deviceId) {
    return { apiUrl: null, apiKey: null, deviceId: null };
  }
  const apiUrl = rawUrl.replace(/\/+$/, "");
  return { apiUrl, apiKey, deviceId };
}

// ─────────────────────────────────────────────────────────────────────────────
// cal.diy — self-hosted Cal.com booking. Optional event-booking push target.
// When configured, lib/events.ts can register/announce a created chapter event
// as a bookable slot (e.g. rush meetings). When unconfigured we still generate
// ICS "add to calendar" links + in-app event rows — booking is purely additive.
// ─────────────────────────────────────────────────────────────────────────────
export type CalDiyConfig = {
  /** Booking portal base URL (also used by the public Scheduler embed). Null
   *  when unset. */
  url: string | null;
  /** Optional API key for cal.diy/Cal.com REST push. Null when unset → embed-
   *  only mode (no programmatic event push). */
  apiKey: string | null;
};

/**
 * Resolve cal.diy config for the current tenant.
 * cfg `calendar.calDiyUrl` (already an existing key powering the Scheduler
 * embed) / `calendar.calDiyApiKey`, falling back to env
 * `CAL_DIY_URL` / `CAL_DIY_API_KEY`.
 */
export async function getCalDiyConfig(): Promise<CalDiyConfig> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const url =
    cfg["calendar.calDiyUrl"]?.trim() || process.env.CAL_DIY_URL?.trim() || "";
  const apiKey =
    cfg["calendar.calDiyApiKey"]?.trim() ||
    process.env.CAL_DIY_API_KEY?.trim() ||
    "";
  return { url: url || null, apiKey: apiKey || null };
}

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
