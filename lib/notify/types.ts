/**
 * Shared types for the multi-channel notify relay (lib/notify/).
 *
 * This is an apprise-style fan-out: one sendNotification() call routes a single
 * message out to every ENABLED + CONFIGURED channel a chapter has wired up.
 * Every adapter is INERT (returns { skipped:true }) until its secret/config is
 * present, and NEVER throws — a broken or unconfigured channel can never bubble
 * back through the mutation that fired the notification.
 *
 * NOTE ON MODULE LAYOUT: the legacy audit helper lives at lib/notify.ts and owns
 * the `@/lib/notify` import path. The relay deliberately lives in lib/notify/*
 * and is imported via explicit subpaths (`@/lib/notify/relay`) so the two never
 * collide.
 */

/** Every channel the relay knows how to dispatch to. "inapp" is acknowledged
 *  but NOT dispatched here — the in-app timeline is the existing Announcement /
 *  feed path (lib/notify.ts). It is listed so per-user prefs (commit #2) can
 *  express "in-app only" without a special case. */
export type NotifyChannel =
  | "teams"
  | "telegram"
  | "slack"
  | "discord"
  | "webhook"
  | "email"
  | "push"
  | "inapp";

/** All externally-dispatchable channels, in a stable order. */
export const ALL_CHANNELS: NotifyChannel[] = [
  "teams",
  "telegram",
  "slack",
  "discord",
  "webhook",
  "email",
  "push",
  "inapp",
];

/** Canonical event types the chapter surfaces fire. Free-form string is allowed
 *  so a new surface can add a type without editing this union, but the known
 *  ones are enumerated for the prefs UI + type-safety at call sites. */
export type NotifyEventType =
  | "event.posted"
  | "announcement.posted"
  | "job.posted"
  | "dues.reminder"
  | (string & {});

/** One message to fan out. */
export interface NotifyMessage {
  /** Optional chapter label used for attribution in the rendered message
   *  ("[Phi Sig] ..."). Falls back to the resolved chapter identity when unset;
   *  never load-bearing. */
  chapter?: string;
  /** The event type that fired — used by per-user routing (commit #2) and echoed
   *  in the generic-webhook payload. */
  event: NotifyEventType;
  title: string;
  body: string;
  /** Deep link back into the app (event/announcement/job). */
  url?: string;
  /** Direct email recipient for the email channel (per-user routing). Falls back
   *  to the chapter-level `notify.email.to` cfg when unset. */
  email?: string;
  /** APNs device tokens for the push channel (per-user routing). The push adapter
   *  is inert when this is empty (nobody to push to). Set by the prefs layer from
   *  each recipient's registered devices. */
  pushTokens?: string[];
  /** Restrict dispatch to these channels. Default = every enabled channel. */
  channels?: NotifyChannel[];
}

/** Per-channel dispatch outcome. Discriminated on `ok` / `skipped`. */
export type ChannelResult =
  | { channel: NotifyChannel; ok: true; skipped?: false; id?: string }
  | { channel: NotifyChannel; skipped: true; reason: string }
  | { channel: NotifyChannel; ok: false; error: string };

export interface NotifyResult {
  results: ChannelResult[];
}
