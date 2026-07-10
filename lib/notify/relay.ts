import { getChapterIdentity } from "@/lib/chapter-identity";
import { getNotifyConfig, type NotifyConfig } from "./config";
import { ADAPTERS } from "./channels";
import { ALL_CHANNELS, type ChannelResult, type NotifyChannel, type NotifyMessage, type NotifyResult } from "./types";

/**
 * The notify relay — one apprise-style entry point that fans a single message
 * out to every ENABLED + CONFIGURED channel.
 *
 * Selection precedence:
 *   1. Start from the caller's requested `channels` (or ALL when unset).
 *   2. Intersect with the channels the CHAPTER has enabled (cfg notify.channels).
 *   3. Each adapter then no-ops (skipped) if its own secret is absent.
 *
 * The whole thing is best-effort: every adapter catches its own errors, and the
 * relay itself never throws, so a notification failure can never bubble back
 * through the mutation that fired it.
 */
export async function sendNotification(input: NotifyMessage): Promise<NotifyResult> {
  let config: NotifyConfig;
  try {
    config = await getNotifyConfig();
  } catch {
    return { results: [] };
  }

  // Attribution label — falls back to the resolved chapter identity when the
  // caller didn't pass one. Best-effort; never load-bearing.
  let chapter = input.chapter;
  if (!chapter) {
    try {
      const identity = await getChapterIdentity();
      chapter = identity.chapterAttribution || identity.fraternityShort || undefined;
    } catch {
      chapter = undefined;
    }
  }
  return sendNotificationWith({ ...input, chapter }, config);
}

/**
 * Fan out with an EXPLICIT config — used by the per-user routing layer
 * (lib/notify/prefs.ts) which overlays each recipient's own delivery targets
 * onto the chapter config, so it must not re-resolve the tenant config per
 * recipient. Does NOT fetch the chapter identity (the caller sets msg.chapter).
 */
export async function sendNotificationWith(
  input: NotifyMessage,
  config: NotifyConfig,
): Promise<NotifyResult> {
  const requested = input.channels && input.channels.length ? input.channels : ALL_CHANNELS;
  const selected = requested.filter((c) => config.enabledChannels.includes(c));

  const results = await Promise.all(
    selected.map((channel) => dispatchOne(channel, input, config)),
  );
  return { results };
}

async function dispatchOne(
  channel: NotifyChannel,
  msg: NotifyMessage,
  config: NotifyConfig,
): Promise<ChannelResult> {
  // "inapp" is not dispatched here — the in-app timeline is the existing
  // Announcement/feed path (lib/notify.ts). Acknowledge it as skipped.
  if (channel === "inapp") {
    return { channel, skipped: true, reason: "inapp-handled-by-feed" };
  }
  const adapter = ADAPTERS[channel];
  if (!adapter) return { channel, skipped: true, reason: "no-adapter" };
  try {
    return await adapter(msg, config);
  } catch (err) {
    // Defense in depth — adapters already catch, but never let one escape.
    return { channel, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type { NotifyMessage, NotifyResult, ChannelResult, NotifyChannel } from "./types";
export { ALL_CHANNELS } from "./types";
