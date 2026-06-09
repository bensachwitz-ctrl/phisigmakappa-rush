import { getTextbeeConfig, getTwilioConfig } from "./messaging-config";
import { isWithinQuietHours } from "./tcpa";
import { getSiteConfig } from "./site-config";

/**
 * Unified chapter SMS sender — automated rush + brother texts.
 *
 * PROVIDER INTERFACE (degrades gracefully behind env vars — no fake "sent"):
 *
 *   1. textbee — self-hosted Android SMS gateway (the $0 primary path). Set
 *      TEXTBEE_API_URL / TEXTBEE_API_KEY / TEXTBEE_DEVICE_ID (or the per-tenant
 *      SiteConfig textbee.* keys).
 *   2. Twilio  — the existing fallback (TWILIO_* / tenant twilio.* keys), used
 *      when textbee isn't configured.
 *   3. mock    — neither configured → return { provider: "mock" } so callers
 *      can log to SmsLog without claiming a real send.
 *
 * TCPA / CTIA COMPLIANCE is built in (this is the single choke-point so no
 * caller can forget it):
 *
 *   • Quiet hours — sendSms()/sendBulkSms() refuse to send outside the
 *     recipient-local 8am–9pm window unless `force: true` is passed. The
 *     timezone is the chapter's `chapter.timezone` cfg (default America/
 *     New_York). Callers get a typed `quietHours` rejection, not a thrown error.
 *   • Per-recipient opt-in — pass `optedIn` on each recipient. A recipient with
 *     `optedIn === false` is DROPPED before send. `optedIn === undefined` is
 *     treated as allowed (legacy rows / explicitly-collected numbers); callers
 *     that maintain a strict opt-in flag should pass it. (Rushee STOP/opt-out is
 *     enforced separately via lib/tcpa.filterOptedOut at the route layer.)
 */

export type SmsProvider = "textbee" | "twilio" | "mock";

export type SmsRecipient = {
  /** Phone in any format — normalized to E.164 before send. */
  phone: string;
  /** Optional first-name personalization ("Hey Alex — ..."). */
  name?: string | null;
  /** Per-member TCPA opt-in flag. false → dropped. undefined → allowed. */
  optedIn?: boolean;
};

export type SmsSendResult = {
  ok: boolean;
  provider: SmsProvider;
  /** Number of messages the provider accepted. */
  sent: number;
  /** Recipients dropped because optedIn === false. */
  optedOut: number;
  /** Recipients the provider rejected (bad number, gateway error). */
  failed: number;
  /** Set when the send was blocked entirely by quiet hours. */
  quietHoursBlocked?: { tz: string; window: string };
};

/** Normalize a phone to E.164 (US default). Mirrors the existing route helper. */
export function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return p.startsWith("+") ? p : `+${d}`;
}

/** Resolve the chapter's TCPA quiet-hours timezone. */
async function resolveTimezone(): Promise<string> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  return cfg["chapter.timezone"] || "America/New_York";
}

// ── textbee REST send ────────────────────────────────────────────────────────

/**
 * Send via the textbee gateway. textbee accepts a `recipients[]` array per call,
 * so we batch in one request. Throws on a hard HTTP/network error so the caller
 * can fall back to Twilio.
 */
async function textbeeSend(
  cfg: { apiUrl: string; apiKey: string; deviceId: string },
  recipients: string[],
  message: string,
): Promise<void> {
  const url = `${cfg.apiUrl}/api/v1/gateway/devices/${cfg.deviceId}/send-sms`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": cfg.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipients, message }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`textbee send ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
}

// ── Twilio REST send (one message) ───────────────────────────────────────────

async function twilioSendOne(
  creds: { sid: string; token: string; from: string },
  to: string,
  body: string,
): Promise<boolean> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages.json`;
  const auth = Buffer.from(`${creds.sid}:${creds.token}`).toString("base64");
  const form = new URLSearchParams({ From: creds.from, To: to, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return res.ok;
}

// ── public surface ───────────────────────────────────────────────────────────

/** True when ANY SMS provider (textbee OR Twilio) is configured for this tenant. */
export async function isSmsConfigured(): Promise<boolean> {
  const tb = await getTextbeeConfig();
  if (tb.apiUrl && tb.apiKey && tb.deviceId) return true;
  const tw = await getTwilioConfig();
  return !!(tw.accountSid && tw.authToken && tw.phoneNumber);
}

/** Which SMS provider would be used right now (for status/diagnostics UI). */
export async function activeSmsProvider(): Promise<SmsProvider> {
  const tb = await getTextbeeConfig();
  if (tb.apiUrl && tb.apiKey && tb.deviceId) return "textbee";
  const tw = await getTwilioConfig();
  if (tw.accountSid && tw.authToken && tw.phoneNumber) return "twilio";
  return "mock";
}

/**
 * Send one SMS to one recipient. Thin wrapper over sendBulkSms.
 */
export async function sendSms(
  recipient: SmsRecipient,
  message: string,
  opts: { force?: boolean } = {},
): Promise<SmsSendResult> {
  return sendBulkSms([recipient], message, opts);
}

/**
 * Send an SMS to many recipients, applying the TCPA quiet-hours + per-member
 * opt-in guards, then dispatching via textbee (preferred) → Twilio → mock.
 *
 * The `message` is the same for everyone; per-recipient name personalization is
 * applied on the Twilio path (one message per number). textbee batches, so when
 * names are present and personalization matters, callers should pass distinct
 * messages by calling per-recipient — but for chapter blasts a single shared
 * body is the norm and the cheaper batched path is used.
 */
export async function sendBulkSms(
  recipients: SmsRecipient[],
  message: string,
  opts: { force?: boolean } = {},
): Promise<SmsSendResult> {
  // ── TCPA quiet-hours gate ──
  const tz = await resolveTimezone();
  if (!opts.force && !isWithinQuietHours(tz)) {
    return {
      ok: false,
      provider: "mock",
      sent: 0,
      optedOut: 0,
      failed: 0,
      quietHoursBlocked: { tz, window: "08:00–21:00" },
    };
  }

  // ── Per-member opt-in gate (drop optedIn === false) ──
  const allowed = recipients.filter((r) => r.optedIn !== false && !!r.phone?.trim());
  const optedOut = recipients.length - allowed.length;
  if (allowed.length === 0) {
    return { ok: true, provider: await activeSmsProvider(), sent: 0, optedOut, failed: 0 };
  }

  // ── Provider 1: textbee (batched) ──
  const tb = await getTextbeeConfig();
  if (tb.apiUrl && tb.apiKey && tb.deviceId) {
    const e164 = allowed.map((r) => normalizePhone(r.phone));
    try {
      await textbeeSend(
        { apiUrl: tb.apiUrl, apiKey: tb.apiKey, deviceId: tb.deviceId },
        e164,
        message,
      );
      return { ok: true, provider: "textbee", sent: e164.length, optedOut, failed: 0 };
    } catch (err: any) {
      console.warn("[sms] textbee send failed, falling back to Twilio:", err?.message || err);
      // fall through to Twilio
    }
  }

  // ── Provider 2: Twilio (per-message, supports name personalization) ──
  const tw = await getTwilioConfig();
  if (tw.accountSid && tw.authToken && tw.phoneNumber) {
    const creds = { sid: tw.accountSid, token: tw.authToken, from: tw.phoneNumber };
    let sent = 0;
    let failed = 0;
    for (const r of allowed) {
      const personalized = r.name ? `Hey ${r.name.split(" ")[0]} — ${message}` : message;
      try {
        const ok = await twilioSendOne(creds, normalizePhone(r.phone), personalized);
        if (ok) sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    return { ok: failed === 0, provider: "twilio", sent, optedOut, failed };
  }

  // ── Provider 3: mock (no creds — caller should log to SmsLog) ──
  return { ok: true, provider: "mock", sent: 0, optedOut, failed: 0 };
}
