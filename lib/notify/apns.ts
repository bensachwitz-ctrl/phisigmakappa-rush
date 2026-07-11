// APNs (Apple Push Notification service) send path for the notify relay's "push"
// channel. Self-contained: signs the ES256 provider JWT with node:crypto and
// delivers over node:http2 (APNs requires HTTP/2) — no runtime dependency. The
// vendored node-apn clone at oss/node-apn was consulted for the protocol shape
// (token-auth headers, /3/device/<token>, apns-topic) but not imported.
//
// CONFIG IS READ FROM ENV AT RUNTIME — NEVER hardcoded (the p8 key is a secret):
//   APNS_KEY_ID       APNs Auth Key id (the 10-char key identifier)
//   APNS_TEAM_ID      Apple Developer Team id (QFC852BYB6)
//   APNS_TOPIC        app bundle id / push topic (com.greekstack.app)
//   APNS_PRIVATE_KEY  the .p8 auth key contents (PEM). Env-encoded "\n" newlines
//                     are normalized, so it can be stored as a single-line secret.
//   APNS_ENV          "sandbox" → api.sandbox.push.apple.com; anything else (or
//                     unset) → production api.push.apple.com.
//
// The channel is INERT (skipped) when any of the four required vars is missing,
// matching every other notify adapter's contract, and NEVER throws.

import http2 from "node:http2";
import crypto from "node:crypto";

export interface ApnsConfig {
  keyId: string;
  teamId: string;
  topic: string;
  /** PEM contents of the .p8 auth key. */
  privateKey: string;
  production: boolean;
}

/** APNS_PRIVATE_KEY is often stored with literal `\n` — restore real newlines. */
function normalizeKey(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return s.includes("\\n") ? s.replace(/\\n/g, "\n") : s;
}

/**
 * Resolve the APNs config from env. Returns null (→ channel inert) when any
 * required var is absent. Read fresh each call so an operator can set the secret
 * without a rebuild.
 */
export function getApnsConfig(): ApnsConfig | null {
  const keyId = (process.env.APNS_KEY_ID || "").trim();
  const teamId = (process.env.APNS_TEAM_ID || "").trim();
  const topic = (process.env.APNS_TOPIC || "").trim();
  const privateKey = normalizeKey(process.env.APNS_PRIVATE_KEY || "");
  if (!keyId || !teamId || !topic || !privateKey) return null;
  const env = (process.env.APNS_ENV || "production").trim().toLowerCase();
  return { keyId, teamId, topic, privateKey, production: env !== "sandbox" };
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Apple accepts a provider token for up to 1h and rate-limits regeneration; cache
// it ~50 min, re-minting on key rotation.
let cached: { jwt: string; iat: number; keyId: string; teamId: string } | null = null;

/** Build (or reuse) the ES256 provider JWT bearer token for token-based auth. */
export function apnsProviderToken(cfg: ApnsConfig, now: number = Date.now()): string {
  if (
    cached &&
    cached.keyId === cfg.keyId &&
    cached.teamId === cfg.teamId &&
    now - cached.iat < 50 * 60 * 1000
  ) {
    return cached.jwt;
  }
  const header = base64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }));
  const payload = base64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(now / 1000) }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign("SHA256", Buffer.from(signingInput), {
    key: cfg.privateKey,
    dsaEncoding: "ieee-p1363", // APNs/JWT ES256 expects raw r||s, not DER
  });
  const jwt = `${signingInput}.${base64url(signature)}`;
  cached = { jwt, iat: now, keyId: cfg.keyId, teamId: cfg.teamId };
  return jwt;
}

/** Test seam: clear the cached provider token. */
export function _resetApnsTokenCache(): void {
  cached = null;
}

export interface ApnsPushMessage {
  title: string;
  body: string;
  url?: string;
}

export interface ApnsDeliverArgs {
  host: string;
  path: string;
  headers: Record<string, string>;
  body: string;
}

/** The network primitive — one HTTP/2 POST to APNs. Injectable so tests never
 *  open a real socket. */
export type ApnsDeliver = (args: ApnsDeliverArgs) => Promise<{ status: number; body: string }>;

export interface ApnsTokenResult {
  token: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export interface ApnsSendResult {
  sent: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
  results: ApnsTokenResult[];
}

/** Real HTTP/2 delivery to APNs. */
const realDeliver: ApnsDeliver = ({ host, path, headers, body }) =>
  new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      try {
        client.close();
      } catch {
        /* noop */
      }
      fn();
    };
    client.on("error", (e) => done(() => reject(e)));
    const req = client.request({ ":method": "POST", ":path": path, ...headers });
    let status = 0;
    let data = "";
    req.on("response", (h) => {
      status = Number(h[":status"]) || 0;
    });
    req.setEncoding("utf8");
    req.on("data", (c) => {
      data += c;
    });
    req.on("end", () => done(() => resolve({ status, body: data })));
    req.on("error", (e) => done(() => reject(e)));
    req.write(body);
    req.end();
  });

/**
 * Send a push to one or more APNs device tokens. INERT (skipped) when APNs is
 * unconfigured or there are no tokens; NEVER throws. Each token is delivered
 * independently so one bad token can't sink the rest.
 */
export async function sendApnsPush(
  tokens: string[],
  msg: ApnsPushMessage,
  deps?: { config?: ApnsConfig | null; deliver?: ApnsDeliver; now?: number },
): Promise<ApnsSendResult> {
  const config = deps && "config" in deps ? deps.config : getApnsConfig();
  if (!config) return { sent: 0, failed: 0, skipped: true, reason: "not-configured", results: [] };

  const clean = [...new Set((tokens || []).map((t) => (t || "").trim()).filter(Boolean))];
  if (!clean.length) return { sent: 0, failed: 0, skipped: true, reason: "no-tokens", results: [] };

  const deliver = deps?.deliver || realDeliver;
  let jwt: string;
  try {
    jwt = apnsProviderToken(config, deps?.now);
  } catch (e) {
    // A malformed p8 key must not throw into the relay.
    return {
      sent: 0,
      failed: clean.length,
      results: clean.map((token) => ({
        token,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })),
    };
  }

  const host = config.production ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const payload = JSON.stringify({
    aps: { alert: { title: msg.title, body: msg.body }, sound: "default" },
    ...(msg.url ? { url: msg.url } : {}),
  });
  const headers = {
    authorization: `bearer ${jwt}`,
    "apns-topic": config.topic,
    "apns-push-type": "alert",
    "content-type": "application/json",
  };

  const results = await Promise.all(
    clean.map(async (token): Promise<ApnsTokenResult> => {
      try {
        const res = await deliver({ host, path: `/3/device/${token}`, headers, body: payload });
        if (res.status === 200) return { token, ok: true, status: 200 };
        return { token, ok: false, status: res.status, error: (res.body || "").slice(0, 160) };
      } catch (e) {
        return { token, ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );

  const sent = results.filter((r) => r.ok).length;
  return { sent, failed: results.length - sent, results };
}
