// Google Calendar OAuth helpers — pure functions where possible, with a small
// fetch-based runtime layer for the OAuth + push-sync flows.
//
// ── MOCK MODE ──────────────────────────────────────────────────────────────
// If `process.env.GOOGLE_CLIENT_ID` is unset, every function in this module
// returns a "not configured" sentinel instead of hitting Google. The /account/
// calendar UI uses `isGoogleCalendarConfigured()` to surface a placeholder.
//
// This mock-mode keeps the build green on dev/CI deploys without secrets, and
// lets tests cover the OAuth-state shape without network.
// ───────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CAL_API_BASE = "https://www.googleapis.com/calendar/v3";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

/** Whether the deployment has the env-vars to talk to Google. */
export function isGoogleCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Build the consent URL we redirect users to. */
export function buildAuthUrl(opts: {
  redirectUri: string;
  state: string;
}): string | null {
  if (!isGoogleCalendarConfigured()) return null;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: opts.state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Sign a state token with HMAC so the callback can verify the request
 * originated from us. Format: <brotherId>.<ts>.<sig>
 */
export function signOAuthState(brotherId: string, ts: number = Date.now()): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
  const payload = `${brotherId}.${ts}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** Verify a state token. Returns the brotherId if valid; null otherwise. */
export function verifyOAuthState(state: string | undefined | null, maxAgeMs = 10 * 60 * 1000): string | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [brotherId, tsStr, sig] = parts;
  if (!brotherId || !tsStr || !sig) return null;
  const ts = parseInt(tsStr, 10);
  if (!Number.isFinite(ts)) return null;
  if (Date.now() - ts > maxAgeMs) return null;
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
  const expected = crypto.createHmac("sha256", secret).update(`${brotherId}.${ts}`).digest("hex");
  if (sig !== expected) return null;
  return brotherId;
}

/** Exchange an OAuth code for tokens. */
export async function exchangeCodeForTokens(opts: {
  code: string;
  redirectUri: string;
}): Promise<
  | { ok: true; refreshToken: string; accessToken: string; expiresIn: number; idToken?: string }
  | { ok: false; error: string }
> {
  if (!isGoogleCalendarConfigured()) return { ok: false, error: "Google Calendar not configured" };
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: opts.code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: opts.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!res.ok) return { ok: false, error: `Google returned ${res.status}` };
    const json: any = await res.json();
    if (!json.refresh_token) {
      return { ok: false, error: "Google did not return a refresh_token (revoke + re-consent)" };
    }
    return {
      ok: true,
      refreshToken: json.refresh_token,
      accessToken: json.access_token,
      expiresIn: json.expires_in ?? 3600,
      idToken: json.id_token,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error" };
  }
}

/** Exchange a stored refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<
  | { ok: true; accessToken: string; expiresIn: number }
  | { ok: false; error: string }
> {
  if (!isGoogleCalendarConfigured()) return { ok: false, error: "Google Calendar not configured" };
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
    if (!res.ok) return { ok: false, error: `Google returned ${res.status}` };
    const json: any = await res.json();
    return { ok: true, accessToken: json.access_token, expiresIn: json.expires_in ?? 3600 };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error" };
  }
}

/** Upsert a single calendar event for a brother who has linked their Google account. */
export async function pushEvent(opts: {
  accessToken: string;
  calendarId?: string;
  event: {
    sourceId: string; // e.g. our Event.id — used as `iCalUID` for dedupe
    summary: string;
    description?: string;
    location?: string;
    start: Date | string;
    end: Date | string;
  };
}): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  if (!isGoogleCalendarConfigured()) return { ok: false, error: "Google Calendar not configured" };
  const calId = opts.calendarId || "primary";
  // Use `import` to set a stable iCalUID so re-syncs upsert instead of duplicate.
  const url = `${CAL_API_BASE}/calendars/${encodeURIComponent(calId)}/events/import`;
  const startIso = (typeof opts.event.start === "string" ? new Date(opts.event.start) : opts.event.start).toISOString();
  const endIso = (typeof opts.event.end === "string" ? new Date(opts.event.end) : opts.event.end).toISOString();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${opts.accessToken}`,
      },
      body: JSON.stringify({
        iCalUID: `${opts.event.sourceId}@greekstack.vercel.app`,
        summary: opts.event.summary,
        description: opts.event.description ?? "",
        location: opts.event.location ?? "",
        start: { dateTime: startIso, timeZone: "America/New_York" },
        end: { dateTime: endIso, timeZone: "America/New_York" },
      }),
    });
    if (!res.ok) return { ok: false, error: `Google returned ${res.status}` };
    const json: any = await res.json();
    return { ok: true, eventId: json.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error" };
  }
}

/** Public summary returned to UI for connect/disconnect surfaces. */
export interface GoogleCalendarStatus {
  configured: boolean;
  linked: boolean;
  googleEmail?: string;
  lastSyncedAt?: string;
  syncEnabled?: boolean;
}
