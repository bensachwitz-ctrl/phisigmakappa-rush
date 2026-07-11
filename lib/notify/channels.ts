import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { sendApnsPush } from "./apns";
import type { ChannelResult, NotifyChannel, NotifyMessage } from "./types";
import type { NotifyConfig } from "./config";

/**
 * Per-channel adapters for the notify relay.
 *
 * CONTRACT for every adapter:
 *   • INERT until configured — returns { skipped:true, reason } when the
 *     channel's required config/secret is absent. No network call, no throw.
 *   • NEVER throws — any transport/HTTP error is caught and returned as
 *     { ok:false, error } so one bad channel can't sink the fan-out.
 *   • Returns a ChannelResult tagged with its own channel name.
 *
 * The message rendering is intentionally simple (title + body + link). Each
 * adapter shapes it into the provider's minimal accepted payload.
 */

const NOT_CONFIGURED = "not-configured";

/** Compose a plain-text block shared by the text-first channels. */
function plainText(msg: NotifyMessage): string {
  const parts = [msg.title, msg.body];
  if (msg.url) parts.push(msg.url);
  return parts.filter(Boolean).join("\n");
}

/** POST JSON and normalize the outcome. Never throws. */
async function postJson(
  channel: NotifyChannel,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<ChannelResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        channel,
        ok: false,
        error: `${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      };
    }
    return { channel, ok: true };
  } catch (err) {
    return { channel, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Microsoft Teams (incoming webhook — legacy MessageCard) ──────────────────
export async function sendTeams(msg: NotifyMessage, cfg: NotifyConfig): Promise<ChannelResult> {
  if (!cfg.teams.webhook) return { channel: "teams", skipped: true, reason: NOT_CONFIGURED };
  const card: Record<string, unknown> = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: msg.title,
    themeColor: "2563EB",
    title: msg.title,
    text: msg.body,
  };
  if (msg.url) {
    card.potentialAction = [
      {
        "@type": "OpenUri",
        name: "Open",
        targets: [{ os: "default", uri: msg.url }],
      },
    ];
  }
  return postJson("teams", cfg.teams.webhook, card);
}

// ── Telegram (Bot API sendMessage) ───────────────────────────────────────────
export async function sendTelegram(msg: NotifyMessage, cfg: NotifyConfig): Promise<ChannelResult> {
  if (!cfg.telegram.botToken || !cfg.telegram.chatId) {
    return { channel: "telegram", skipped: true, reason: NOT_CONFIGURED };
  }
  const url = `https://api.telegram.org/bot${cfg.telegram.botToken}/sendMessage`;
  return postJson("telegram", url, {
    chat_id: cfg.telegram.chatId,
    text: plainText(msg),
    disable_web_page_preview: false,
  });
}

// ── Slack (incoming webhook) ─────────────────────────────────────────────────
export async function sendSlack(msg: NotifyMessage, cfg: NotifyConfig): Promise<ChannelResult> {
  if (!cfg.slack.webhook) return { channel: "slack", skipped: true, reason: NOT_CONFIGURED };
  const text = msg.url
    ? `*${msg.title}*\n${msg.body}\n<${msg.url}|Open>`
    : `*${msg.title}*\n${msg.body}`;
  return postJson("slack", cfg.slack.webhook, { text });
}

// ── Discord (webhook) ────────────────────────────────────────────────────────
export async function sendDiscord(msg: NotifyMessage, cfg: NotifyConfig): Promise<ChannelResult> {
  if (!cfg.discord.webhook) return { channel: "discord", skipped: true, reason: NOT_CONFIGURED };
  return postJson("discord", cfg.discord.webhook, { content: plainText(msg).slice(0, 1900) });
}

/** True when a 32-bit IPv4 value falls in a loopback/private/link-local/reserved
 *  range that must never be a webhook target. */
function isPrivateIpv4(value: number): boolean {
  const a = (value >>> 24) & 255;
  const b = (value >>> 16) & 255;
  if (a === 0) return true; // 0.0.0.0/8 ("this" network, incl. 0.0.0.0)
  if (a === 127) return true; // loopback 127.0.0.0/8
  if (a === 10) return true; // private 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
  if (a === 192 && b === 168) return true; // private 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16 (cloud metadata)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast 224/4 + reserved 240/4
  return false;
}

/**
 * Parse an IPv4 literal in ANY of the notations the C resolver (inet_aton) — and
 * therefore fetch/undici and getaddrinfo — accept: dotted-quad, but also decimal
 * (2130706433), octal (0177.0.0.1), hex (0x7f.0.0.1 / 0x7f000001), and the
 * 1-to-3-part shorthands. Returns the 32-bit value, or null when the host is not
 * an IPv4 literal at all (a real DNS hostname). This is what defeats the encoded-
 * IP SSRF bypasses that a naive "startsWith('127.')" check misses.
 */
function parseLooseIpv4(host: string): number | null {
  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (p === "") return null;
    let n: number;
    if (/^0x[0-9a-f]+$/i.test(p)) n = parseInt(p, 16);
    else if (/^0[0-7]+$/.test(p)) n = parseInt(p, 8);
    else if (/^[0-9]+$/.test(p)) n = parseInt(p, 10);
    else return null; // a non-numeric label → not an IPv4 literal
    if (!Number.isFinite(n) || n < 0) return null;
    nums.push(n);
  }
  const last = nums.length - 1;
  for (let i = 0; i < last; i++) if (nums[i] > 255) return null;
  if (nums[last] >= Math.pow(256, 4 - last)) return null; // final part holds the rest
  let value = nums[last];
  for (let i = 0; i < last; i++) value += nums[i] * Math.pow(256, 3 - i);
  return value >>> 0;
}

/** Classify an IPv6 literal (already lowercased, no brackets) as private/reserved,
 *  including ::1 loopback, :: unspecified, fc00::/7 ULA, fe80::/10 link-local, and
 *  IPv4-mapped forms (::ffff:127.0.0.1 / ::ffff:7f00:1). */
function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10
  const dotted = /::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(h);
  if (dotted) {
    const v = parseLooseIpv4(dotted[1]);
    return v != null && isPrivateIpv4(v);
  }
  const hex = /::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(h);
  if (hex) {
    const v = (((parseInt(hex[1], 16) << 16) >>> 0) + parseInt(hex[2], 16)) >>> 0;
    return isPrivateIpv4(v);
  }
  return false;
}

/**
 * SSRF guard for the admin-supplied generic-webhook URL. The chapter pastes this
 * in /admin/settings, so it is attacker-influenceable and the fetch is made
 * server-side from our infra — an unvalidated request could be pointed at cloud
 * metadata (169.254.169.254), localhost, or an internal RFC-1918 host to probe /
 * exfiltrate. We: require http(s); reject localhost + internal TLDs; canonicalize
 * an IP literal in ANY notation and reject private/reserved ranges (defeats the
 * decimal/octal/hex/IPv6-mapped bypasses); and finally DNS-resolve a hostname,
 * blocking if ANY resolved address is private/reserved (defeats DNS rebinding).
 * Returns true = BLOCK. Best-effort: a DNS error fails OPEN (the literal bypasses
 * are already refused above), so a transient resolver hiccup can't wedge a
 * legitimate public webhook.
 */
async function isBlockedWebhookTarget(rawUrl: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return true; // unparseable → block
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return true;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;

  // IPv6 literal.
  if (isIP(host) === 6 || host.includes(":")) return isPrivateIpv6(host);

  // IPv4 literal in any notation (decimal/octal/hex/shorthand).
  const v4 = parseLooseIpv4(host);
  if (v4 != null) return isPrivateIpv4(v4);

  // Real hostname → resolve and block if ANY address is private/reserved.
  try {
    const addrs = await lookup(host, { all: true });
    for (const a of addrs) {
      if (a.family === 4) {
        const parsed = parseLooseIpv4(a.address);
        if (parsed != null && isPrivateIpv4(parsed)) return true;
      } else if (a.family === 6 && isPrivateIpv6(a.address.toLowerCase())) {
        return true;
      }
    }
  } catch {
    // Fail open — encoded-IP literals are already blocked without DNS.
  }
  return false;
}

// ── Generic webhook (chapter's own endpoint) ─────────────────────────────────
export async function sendWebhook(msg: NotifyMessage, cfg: NotifyConfig): Promise<ChannelResult> {
  if (!cfg.webhook.url) return { channel: "webhook", skipped: true, reason: NOT_CONFIGURED };
  // SSRF: refuse a webhook aimed at a private/loopback/link-local/rebinding host.
  if (await isBlockedWebhookTarget(cfg.webhook.url)) {
    return { channel: "webhook", ok: false, error: "blocked-non-public-host" };
  }
  const headers: Record<string, string> = cfg.webhook.secret
    ? { "X-Notify-Secret": cfg.webhook.secret }
    : {};
  return postJson(
    "webhook",
    cfg.webhook.url,
    {
      chapter: msg.chapter,
      event: msg.event,
      title: msg.title,
      body: msg.body,
      url: msg.url,
    },
    headers,
  );
}

// ── Email (reuse lib/email — Resend/listmonk/mock) ───────────────────────────
export async function sendEmailChannel(
  msg: NotifyMessage,
  cfg: NotifyConfig,
): Promise<ChannelResult> {
  // The email channel needs a recipient: per-user address on the message, else
  // the chapter-level notify.email.to fallback. No recipient → inert.
  const to = (msg.email || cfg.email.to || "").trim();
  if (!to) return { channel: "email", skipped: true, reason: "no-recipient" };

  // Route through the shared white-label wrapper so the notify email carries the
  // chapter masthead/branding AND the CAN-SPAM unsubscribe footer — the same
  // opt-out affordance every other broadcast email gets. escapeHtml keeps the
  // caller-supplied body safe; renderEmail escapes the heading + CTA url itself.
  const bodyHtml = `<p>${escapeHtml(msg.body)}</p>`;
  const html = renderEmail({
    brandHex: cfg.brand.hex,
    chapterName: cfg.brand.chapterName,
    heading: msg.title,
    bodyHtml,
    cta: msg.url ? { label: "Open", url: msg.url } : null,
    unsubscribe: true,
    unsubscribeText:
      "You can change which notifications you receive, or turn them off, in your portal settings.",
  });
  const text = plainText(msg);

  const res = await sendEmail({ to, subject: msg.title, html, text });
  // lib/email returns provider:"mock"/notConfigured when no provider is set —
  // surface that as skipped so the relay doesn't claim a real send.
  if (res.ok && "notConfigured" in res && res.notConfigured) {
    return { channel: "email", skipped: true, reason: NOT_CONFIGURED };
  }
  if (res.ok) return { channel: "email", ok: true, id: "id" in res ? res.id : undefined };
  return { channel: "email", ok: false, error: res.error };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Push (APNs — per-user device tokens) ─────────────────────────────────────
export async function sendPushChannel(
  msg: NotifyMessage,
  _cfg: NotifyConfig,
): Promise<ChannelResult> {
  // Per-user routing supplies the recipient's registered device tokens on the
  // message; no tokens → nobody to push to. APNs credentials come from env (see
  // lib/notify/apns) and the send path is inert when they're absent.
  const tokens = msg.pushTokens || [];
  if (!tokens.length) return { channel: "push", skipped: true, reason: "no-tokens" };
  const res = await sendApnsPush(tokens, { title: msg.title, body: msg.body, url: msg.url });
  if (res.skipped) return { channel: "push", skipped: true, reason: res.reason || NOT_CONFIGURED };
  if (res.sent > 0) return { channel: "push", ok: true, id: `${res.sent}/${res.results.length}` };
  return { channel: "push", ok: false, error: res.results[0]?.error || "all-failed" };
}

/** Adapter lookup by channel. "inapp" has no external adapter — the relay
 *  acknowledges it as skipped (the in-app feed is written elsewhere). */
export const ADAPTERS: Partial<
  Record<NotifyChannel, (msg: NotifyMessage, cfg: NotifyConfig) => Promise<ChannelResult>>
> = {
  teams: sendTeams,
  telegram: sendTelegram,
  slack: sendSlack,
  discord: sendDiscord,
  webhook: sendWebhook,
  email: sendEmailChannel,
  push: sendPushChannel,
};
