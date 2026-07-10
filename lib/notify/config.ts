import { getSiteConfig } from "@/lib/site-config";
import type { NotifyChannel } from "./types";
import { ALL_CHANNELS } from "./types";

/**
 * Per-tenant notify-channel credential resolution — mirrors
 * lib/messaging-config.ts's "tenant SiteConfig, env fallback" pattern.
 *
 * Every channel resolves from chapter cfg keys first, then a global env var, so
 * a single-tenant deploy can wire a default while a white-label tenant sets its
 * own webhook per chapter in /admin/settings. A channel whose required config is
 * missing resolves to nulls, and its adapter no-ops — NEVER a hardcoded secret,
 * NEVER a throw.
 *
 * cfg keys:
 *   notify.teams.webhook
 *   notify.telegram.botToken / notify.telegram.chatId
 *   notify.slack.webhook
 *   notify.discord.webhook
 *   notify.webhook.url / notify.webhook.secret
 *   notify.email.to            (chapter-level fallback recipient)
 *   notify.channels            (JSON array of channels the CHAPTER offers; commit #2)
 */

export interface TeamsConfig {
  webhook: string | null;
}
export interface TelegramConfig {
  botToken: string | null;
  chatId: string | null;
}
export interface SlackConfig {
  webhook: string | null;
}
export interface DiscordConfig {
  webhook: string | null;
}
export interface GenericWebhookConfig {
  url: string | null;
  secret: string | null;
}
export interface EmailChannelConfig {
  /** Chapter-level fallback recipient. The provider (Resend/listmonk) is
   *  resolved inside lib/email; this only supplies WHO to send to when the
   *  message itself carries no per-user address. */
  to: string | null;
}

export interface NotifyConfig {
  teams: TeamsConfig;
  telegram: TelegramConfig;
  slack: SlackConfig;
  discord: DiscordConfig;
  webhook: GenericWebhookConfig;
  email: EmailChannelConfig;
  /** Which channels the CHAPTER has enabled/offers. Defaults to ALL when the
   *  admin has not restricted the set. A channel not in this list is never
   *  dispatched even if its secret is present. */
  enabledChannels: NotifyChannel[];
}

function clean(v: string | undefined | null): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

/** Parse the admin-controlled `notify.channels` JSON array. Invalid / empty →
 *  ALL_CHANNELS (chapter offers everything by default). */
function parseEnabledChannels(raw: string | undefined | null): NotifyChannel[] {
  const s = (raw ?? "").trim();
  if (!s) return [...ALL_CHANNELS];
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [...ALL_CHANNELS];
    const valid = parsed.filter(
      (c): c is NotifyChannel => typeof c === "string" && (ALL_CHANNELS as string[]).includes(c),
    );
    return valid.length ? valid : [...ALL_CHANNELS];
  } catch {
    return [...ALL_CHANNELS];
  }
}

/**
 * Pure resolver — takes an already-loaded cfg map so it's trivially unit-testable
 * without mocking getSiteConfig. Applies the cfg-first, env-fallback rule.
 */
export function resolveNotifyConfig(cfg: Record<string, string>): NotifyConfig {
  return {
    teams: {
      webhook: clean(cfg["notify.teams.webhook"]) || clean(process.env.NOTIFY_TEAMS_WEBHOOK),
    },
    telegram: {
      botToken:
        clean(cfg["notify.telegram.botToken"]) || clean(process.env.NOTIFY_TELEGRAM_BOT_TOKEN),
      chatId: clean(cfg["notify.telegram.chatId"]) || clean(process.env.NOTIFY_TELEGRAM_CHAT_ID),
    },
    slack: {
      webhook: clean(cfg["notify.slack.webhook"]) || clean(process.env.NOTIFY_SLACK_WEBHOOK),
    },
    discord: {
      webhook: clean(cfg["notify.discord.webhook"]) || clean(process.env.NOTIFY_DISCORD_WEBHOOK),
    },
    webhook: {
      url: clean(cfg["notify.webhook.url"]) || clean(process.env.NOTIFY_WEBHOOK_URL),
      secret: clean(cfg["notify.webhook.secret"]) || clean(process.env.NOTIFY_WEBHOOK_SECRET),
    },
    email: {
      to: clean(cfg["notify.email.to"]),
    },
    enabledChannels: parseEnabledChannels(cfg["notify.channels"]),
  };
}

/** Resolve the notify config for the CURRENT request's tenant. Degrades to
 *  DEFAULTS + env in a no-Host context (cron/script), same as the sibling
 *  messaging-config helpers. */
export async function getNotifyConfig(): Promise<NotifyConfig> {
  const cfg = await getSiteConfig().catch(() => ({}) as Record<string, string>);
  return resolveNotifyConfig(cfg);
}
