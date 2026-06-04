import * as React from "react";
import {
  IllustrationBase,
  IllustrationGround,
  ILLUSTRATION_ACCENT,
  ACCENT_OPACITY,
  ACCENT_OPACITY_STRONG,
  type IllustrationProps,
} from "./illustration-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ILLUSTRATION — Inbox / no messages or announcements
 * ────────────────────────────────────────────────────────────────────────────
 * An open envelope with a chat/announcement bubble rising out of it, the bubble
 * carrying a couple of text lines — the "no announcements yet, chapter news will
 * land here" scene. Reads equally well for messages, announcements, and surveys.
 *
 * Duotone + themeable per the shared language: currentColor linework + a
 * currentColor accent fill softened via fillOpacity, aria-hidden, no motion.
 */
export function IllustrationInbox({ accent = ILLUSTRATION_ACCENT, ...props }: IllustrationProps) {
  return (
    <IllustrationBase {...props}>
      <IllustrationGround accent={accent} />

      {/* envelope body */}
      <rect x="34" y="58" width="92" height="54" rx="10" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <rect x="34" y="58" width="92" height="54" rx="10" />
      {/* envelope flap / valley */}
      <path d="M36 64l40 30a8 8 0 0 0 8 0l40-30" fill={accent} fillOpacity={ACCENT_OPACITY} stroke="none" />
      <path d="M36 64l40 30a8 8 0 0 0 8 0l40-30" />

      {/* announcement bubble rising out of the envelope */}
      <path
        d="M58 30a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10H82l-9 9v-9h-5a10 10 0 0 1-10-10V30Z"
        fill="hsl(var(--background))"
      />
      <path
        d="M58 30a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10H82l-9 9v-9h-5a10 10 0 0 1-10-10V30Z"
        fill={accent}
        fillOpacity={ACCENT_OPACITY_STRONG}
        stroke="none"
      />
      <path d="M58 30a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10H82l-9 9v-9h-5a10 10 0 0 1-10-10V30Z" />
      {/* bubble text lines */}
      <path d="M68 31h28" />
      <path d="M68 39h18" strokeOpacity={0.55} />
    </IllustrationBase>
  );
}
