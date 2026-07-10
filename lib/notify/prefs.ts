/**
 * Per-user notification preferences + event routing (notify #2).
 *
 * Each member/alumni picks WHICH channels (telegram / email / slack / discord /
 * webhook / in-app) and WHICH event types (event posted, announcement, job,
 * dues reminder) they want. When a surface fires an event it calls
 * `routeEventToRecipients`, which looks up every recipient's prefs and fans the
 * message out through the relay to ONLY the channels + types that recipient
 * opted into — intersected with the channels the CHAPTER offers (notify.channels)
 * and the channels that are actually configured (each adapter stays inert).
 *
 * STORAGE: reuses the existing SiteConfig key/value store (per tenant, no Prisma
 * migration). One row per user, key `notify.prefs.<userId>`, value = JSON of
 * UserNotifyPrefs. This mirrors the cfg-store pattern the rest of lib/notify
 * already reads from (getSiteConfig).
 */

import { getSiteConfig } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";
import { getNotifyConfig, type NotifyConfig } from "./config";
import { sendNotificationWith } from "./relay";
import {
  ALL_CHANNELS,
  type NotifyChannel,
  type NotifyEventType,
  type NotifyMessage,
} from "./types";

/** Canonical, user-selectable event types (the prefs UI enumerates these). */
export const NOTIFY_EVENT_TYPES: NotifyEventType[] = [
  "event.posted",
  "announcement.posted",
  "job.posted",
  "dues.reminder",
];

/** Human labels for the prefs UI (no em-dash in copy). */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  "event.posted": "New events",
  "announcement.posted": "Announcements",
  "job.posted": "Job and internship posts",
  "dues.reminder": "Dues reminders",
};

export const CHANNEL_LABELS: Record<NotifyChannel, string> = {
  inapp: "In-app",
  email: "Email",
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  webhook: "Webhook",
  teams: "Teams",
};

export interface UserNotifyPrefs {
  /** Channels this user wants delivery on. */
  channels: NotifyChannel[];
  /** Event types this user opted into. */
  events: NotifyEventType[];
  /** Optional per-user delivery address for the email channel. Falls back to the
   *  recipient's on-file email, then the chapter-level notify.email.to. */
  email?: string;
}

/** A member who has never touched the prefs UI: in-app only (the existing feed),
 *  every event type. External channels are strictly opt-in so nobody is emailed
 *  or messaged without choosing it. */
export const DEFAULT_PREFS: UserNotifyPrefs = {
  channels: ["inapp"],
  events: [...NOTIFY_EVENT_TYPES],
};

const PREFS_PREFIX = "notify.prefs.";

function prefsKey(userId: string): string {
  return `${PREFS_PREFIX}${userId}`;
}

const CHANNEL_SET = new Set<string>(ALL_CHANNELS);

/** Coerce an arbitrary parsed value into a clean UserNotifyPrefs. Invalid /
 *  missing input yields the defaults, so a corrupt row never throws at a call
 *  site that fires a notification. */
export function normalizePrefs(input: unknown): UserNotifyPrefs {
  if (!input || typeof input !== "object") return { ...DEFAULT_PREFS };
  const obj = input as Record<string, unknown>;

  const channels = Array.isArray(obj.channels)
    ? (obj.channels.filter(
        (c): c is NotifyChannel => typeof c === "string" && CHANNEL_SET.has(c),
      ) as NotifyChannel[])
    : [...DEFAULT_PREFS.channels];

  const events = Array.isArray(obj.events)
    ? (obj.events.filter((e): e is NotifyEventType => typeof e === "string") as NotifyEventType[])
    : [...DEFAULT_PREFS.events];

  const email = typeof obj.email === "string" && obj.email.trim() ? obj.email.trim() : undefined;

  // De-dupe while preserving order.
  return {
    channels: [...new Set(channels)],
    events: [...new Set(events)],
    ...(email ? { email } : {}),
  };
}

/** Parse a raw SiteConfig JSON string into prefs. Empty / malformed => defaults. */
export function parsePrefs(raw: string | undefined | null): UserNotifyPrefs {
  const s = (raw ?? "").trim();
  if (!s) return { ...DEFAULT_PREFS };
  try {
    return normalizePrefs(JSON.parse(s));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Pure routing decision — the testable core. Given a user's prefs, the event
 * type that fired, and the channels the chapter offers, return the channels the
 * user should actually be delivered on. Empty array = deliver nothing (either
 * the user muted this event type, or none of their channels are offered).
 */
export function resolveUserChannels(
  prefs: UserNotifyPrefs,
  event: NotifyEventType,
  chapterChannels: NotifyChannel[],
): NotifyChannel[] {
  if (!prefs.events.includes(event)) return [];
  const offered = new Set(chapterChannels);
  return prefs.channels.filter((c) => offered.has(c));
}

/** Read one user's prefs from the tenant SiteConfig store. */
export async function getUserPrefs(userId: string): Promise<UserNotifyPrefs> {
  const cfg = await getSiteConfig().catch(() => ({}) as Record<string, string>);
  return parsePrefs(cfg[prefsKey(userId)]);
}

/** Persist one user's prefs (upsert, no migration — reuses SiteConfig). */
export async function setUserPrefs(userId: string, prefs: UserNotifyPrefs): Promise<void> {
  const value = JSON.stringify(normalizePrefs(prefs));
  await prisma.siteConfig.upsert({
    where: { key: prefsKey(userId) },
    update: { value },
    create: { key: prefsKey(userId), value },
  });
}

/** A recipient of a fired event. `email` is the on-file address fallback. */
export interface NotifyRecipient {
  userId: string;
  email?: string;
}

/**
 * Enumerate the tenant's portal users as notification recipients, optionally
 * filtered by portal role ("brother" | "alumni" | "pnm"). Best-effort: any DB
 * error yields an empty list so a notification lookup never breaks the mutation
 * that triggered it. The prefs layer keys off each user's portal id, so a user
 * who never opted into an external channel simply routes to nothing.
 */
export async function listPortalRecipients(roles?: string[]): Promise<NotifyRecipient[]> {
  try {
    const where = roles && roles.length ? { role: { in: roles } } : {};
    const users = await prisma.portalUser.findMany({
      where,
      select: { id: true, email: true },
    });
    return users.map((u) => ({ userId: u.id, email: u.email || undefined }));
  } catch {
    return [];
  }
}

/**
 * Route a single fired event to a set of recipients, each through their own
 * prefs. Best-effort and NEVER throws — a notification failure can never bubble
 * back through the mutation that fired it. The relay itself re-intersects the
 * requested channels with the configured adapters, so an opted-in-but-unconfigured
 * channel simply no-ops.
 */
export async function routeEventToRecipients(
  base: Omit<NotifyMessage, "channels" | "email">,
  recipients: NotifyRecipient[],
): Promise<void> {
  if (!recipients.length) return;
  let config: NotifyConfig;
  let cfg: Record<string, string>;
  try {
    config = await getNotifyConfig();
    cfg = await getSiteConfig();
  } catch {
    return;
  }

  await Promise.all(
    recipients.map(async (r) => {
      const prefs = parsePrefs(cfg[prefsKey(r.userId)]);
      const channels = resolveUserChannels(prefs, base.event, config.enabledChannels);
      if (!channels.length) return;
      const email = prefs.email || r.email;
      try {
        await sendNotificationWith(
          { ...base, channels, ...(email ? { email } : {}) },
          config,
        );
      } catch {
        /* isolate one recipient's failure */
      }
    }),
  );
}
