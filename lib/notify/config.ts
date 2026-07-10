import { getSiteConfig } from "@/lib/site-config";
import type { NotifyChannel } from "./types";
import { ALL_CHANNELS } from "./types";

/**
 * Per-tenant notify-channel credential resolution.
 *
 * TENANT ISOLATION (P1): the per-destination channels (teams / telegram / slack /
 * discord / generic webhook) resolve STRICTLY from the current chapter's cfg —
 * there is NO global `process.env.NOTIFY_*` fallback. A shared operator webhook /
 * token would otherwise become the silent default for EVERY tenant that never set
 * its own, so a chapter with no per-tenant secret would post into the operator's
 * single channel (cross-tenant leak). A channel with no per-tenant secret is
 * therefore INERT — its adapter no-ops. NEVER a hardcoded secret, NEVER a throw.
 *
 * (Email is the one exception the relay allows a shared provider for, but that is
 *  handled inside lib/email — it is addressed per-recipient, so there is no
 *  cross-tenant destination to leak. This resolver only carries the chapter-level
 *  fallback recipient address, never a provider secret.)
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

/** Chapter branding for the email channel's HTML wrapper (lib/email-template).
 *  Resolved purely from cfg so the notify email inherits the same white-label
 *  masthead/CTA color + chapter name as every other transactional email. */
export interface NotifyBrandConfig {
  hex: string | null;
  chapterName: string | null;
}

export interface NotifyConfig {
  teams: TeamsConfig;
  telegram: TelegramConfig;
  slack: SlackConfig;
  discord: DiscordConfig;
  webhook: GenericWebhookConfig;
  email: EmailChannelConfig;
  brand: NotifyBrandConfig;
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
 * without mocking getSiteConfig.
 *
 * Per-destination channel secrets resolve STRICTLY from the tenant cfg (NO env
 * fallback) so a shared operator channel can never become another tenant's silent
 * default — see the tenant-isolation note at the top of this file.
 */
export function resolveNotifyConfig(cfg: Record<string, string>): NotifyConfig {
  return {
    teams: {
      webhook: clean(cfg["notify.teams.webhook"]),
    },
    telegram: {
      botToken: clean(cfg["notify.telegram.botToken"]),
      chatId: clean(cfg["notify.telegram.chatId"]),
    },
    slack: {
      webhook: clean(cfg["notify.slack.webhook"]),
    },
    discord: {
      webhook: clean(cfg["notify.discord.webhook"]),
    },
    webhook: {
      url: clean(cfg["notify.webhook.url"]),
      secret: clean(cfg["notify.webhook.secret"]),
    },
    email: {
      to: clean(cfg["notify.email.to"]),
    },
    brand: {
      hex: clean(cfg["brand.primaryHex"]),
      chapterName:
        clean(cfg["chapter.fraternityShort"]) || clean(cfg["chapter.fraternityName"]),
    },
    enabledChannels: parseEnabledChannels(cfg["notify.channels"]),
  };
}

/** Resolve the notify config for the CURRENT request's tenant. In a no-Host
 *  context (cron/script) getSiteConfig yields an empty map, so every channel
 *  resolves INERT — never a shared operator default. */
export async function getNotifyConfig(): Promise<NotifyConfig> {
  const cfg = await getSiteConfig().catch(() => ({}) as Record<string, string>);
  return resolveNotifyConfig(cfg);
}
