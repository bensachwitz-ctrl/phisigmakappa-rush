import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
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

/**
 * SSRF guard for the admin-supplied generic-webhook URL. The chapter pastes this
 * in /admin/settings, so it is attacker-influenceable and the request is made
 * server-side from our infra — an unvalidated fetch could be pointed at cloud
 * metadata (169.254.169.254), localhost, or an internal RFC-1918 host to probe /
 * exfiltrate. We require an https/http URL to a PUBLIC host and block loopback,
 * link-local, and private ranges. Hostname literals are checked directly; a
 * DNS-name is allowed through (we can't resolve here) but the obvious literal
 * targets an attacker would use are refused.
 */
function isBlockedWebhookHost(rawUrl: string): boolean {
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
  if (host === "::1" || host === "0.0.0.0") return true;
  // IPv6 loopback / unique-local / link-local shorthands.
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  // IPv4 literal → range checks (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16).
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => n > 255)) return true;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
    if (a === 0) return true; // "this" network
  }
  return false;
}

// ── Generic webhook (chapter's own endpoint) ─────────────────────────────────
export async function sendWebhook(msg: NotifyMessage, cfg: NotifyConfig): Promise<ChannelResult> {
  if (!cfg.webhook.url) return { channel: "webhook", skipped: true, reason: NOT_CONFIGURED };
  // SSRF: refuse a webhook aimed at a private/loopback/link-local host.
  if (isBlockedWebhookHost(cfg.webhook.url)) {
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
};
