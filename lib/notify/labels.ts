/**
 * Client-safe notify label constants (notify #2).
 *
 * These are PURE presentation maps with NO server-only imports. They are split
 * out of lib/notify/prefs.ts so a "use client" component (e.g. the chapter admin
 * channels card) can import a channel/event label WITHOUT dragging the server
 * routing graph (prefs -> relay -> channels -> node:net / node:dns/promises) into
 * the client bundle. The webpack "UnhandledSchemeError: node:net" build failure
 * was caused exactly by that transitive pull. prefs.ts re-exports these so every
 * existing server-side import path keeps working unchanged.
 */

import { type NotifyChannel, type NotifyEventType } from "./types";

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
  push: "Push (mobile app)",
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  webhook: "Webhook",
  teams: "Teams",
};
