import * as React from "react";
import { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICONS — Signup steps & platform console
 * ────────────────────────────────────────────────────────────────────────────
 * Glyphs for the onboarding wizard steps (chapter → branding → comms → admin →
 * launch) and the platform/super-admin console (tenants, activate, suspend,
 * delete). These lean hardest into the Greek motif since they front the
 * "spin up your chapter" flow. (Launch is shared from ./features.)
 */

/** Chapter — a Greek temple: pediment + fluted columns + stylobate. The signature glyph. */
export function IconChapter({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: pediment fill */}
      <path d="M12 3l9 4.2H3L12 3Z" fill={accent} opacity={0.18} stroke="none" />
      {/* pediment (roof) */}
      <path d="M12 3l9 4.2H3L12 3Z" />
      {/* entablature + base */}
      <path d="M4.5 9.5h15M3.5 20.5h17" />
      {/* three fluted columns */}
      <path d="M6.5 9.8v10.2M12 9.8v10.2M17.5 9.8v10.2" />
    </IconBase>
  );
}

/** Branding — a palette with a thumb-hole and a paint dab (chapter colours). */
export function IconBranding({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: palette body */}
      <path
        d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-1 2-2 0-1.4 1-2 2.2-2H18a3 3 0 0 0 3-3c0-4.7-4-7-9-7Z"
        fill={accent}
        opacity={0.14}
        stroke="none"
      />
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-1 2-2 0-1.4 1-2 2.2-2H18a3 3 0 0 0 3-3c0-4.7-4-7-9-7Z" />
      {/* paint wells */}
      <circle cx="7.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16.3" cy="9" r="0.9" fill={accent} stroke="none" />
    </IconBase>
  );
}

/** Comms — an envelope with a chat bubble (email + announcements). */
export function IconComms({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: envelope */}
      <rect x="3" y="5" width="14" height="11" rx="2" fill={accent} opacity={0.14} stroke="none" />
      <rect x="3" y="5" width="14" height="11" rx="2" />
      <path d="M3.5 6l6.5 4.5L16.5 6" />
      {/* chat bubble overlapping the corner */}
      <path d="M13 13h6a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 19 19h-1.5l-2 2v-2H13a1.5 1.5 0 0 1-1.5-1.5v-3A1.5 1.5 0 0 1 13 13Z" fill={accent} opacity={0.18} />
      <path d="M13 13h6a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 19 19h-1.5l-2 2v-2H13a1.5 1.5 0 0 1-1.5-1.5v-3A1.5 1.5 0 0 1 13 13Z" />
    </IconBase>
  );
}

/** Admin — a person paired with a key (account owner / privileged user). */
export function IconAdmin({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: head */}
      <circle cx="9" cy="7.5" r="3" fill={accent} opacity={0.18} stroke="none" />
      <circle cx="9" cy="7.5" r="3" />
      <path d="M3.5 19v-1.2A3.8 3.8 0 0 1 7.3 14h3.4a3.8 3.8 0 0 1 3.4 2.1" />
      {/* key */}
      <circle cx="17.5" cy="13.5" r="2" />
      <path d="M16.1 14.9L13 18v2h2l.6-.6" />
    </IconBase>
  );
}

/** Tenants — stacked chapter buildings on a network (multi-tenant console). */
export function IconTenants({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: lead building */}
      <rect x="3" y="8" width="8" height="12" rx="1.4" fill={accent} opacity={0.16} stroke="none" />
      <rect x="3" y="8" width="8" height="12" rx="1.4" />
      {/* secondary building */}
      <rect x="12.5" y="4" width="8" height="16" rx="1.4" />
      {/* windows */}
      <path d="M5.5 11h3M5.5 14h3M15 7.5h3M15 11h3M15 14.5h3" />
      <path d="M2 20h20" />
    </IconBase>
  );
}

/** Active — a toggle switched on with a pulse (live / enabled tenant). */
export function IconActive({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: track */}
      <rect x="2.5" y="8" width="15" height="8" rx="4" fill={accent} opacity={0.18} stroke="none" />
      <rect x="2.5" y="8" width="15" height="8" rx="4" />
      {/* knob (on = right) */}
      <circle cx="13.5" cy="12" r="2.4" fill="currentColor" stroke="none" />
      {/* pulse */}
      <path d="M19 12h1M20.5 9.5a4 4 0 0 1 0 5" />
    </IconBase>
  );
}

/** Suspend — a pause symbol in a ring (temporarily disabled tenant). */
export function IconSuspend({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" fill={accent} opacity={0.14} stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9v6M14 9v6" />
    </IconBase>
  );
}

/** Trash — a lidded bin with an accent body (delete tenant / record). */
export function IconTrash({ accent = GS_ACCENT, ...props }: IconProps) {
  return (
    <IconBase {...props}>
      {/* accent: can body */}
      <path d="M6 7h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5L6 7Z" fill={accent} opacity={0.14} stroke="none" />
      <path d="M6 7h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5L6 7Z" />
      {/* lid + handle */}
      <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      {/* ribs */}
      <path d="M10 11v6M14 11v6" />
    </IconBase>
  );
}
