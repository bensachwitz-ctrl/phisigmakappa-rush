import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RUSH_STATUSES = [
  "ACTIVE",
  "DROPPED",
  "BID_EXTENDED",
  "ACCEPTED",
  "DECLINED",
] as const;

export type RushStatus = (typeof RUSH_STATUSES)[number];

export const STATUS_LABELS: Record<RushStatus, string> = {
  ACTIVE: "Active",
  DROPPED: "Dropped",
  BID_EXTENDED: "Bid Extended",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
};

export const STATUS_STYLES: Record<RushStatus, string> = {
  ACTIVE: "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200",
  DROPPED: "bg-zinc-200 text-zinc-500 ring-1 ring-zinc-300 line-through",
  BID_EXTENDED: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  ACCEPTED: "bg-phisig-red text-white ring-1 ring-phisig-red-dark",
  DECLINED: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200",
};

// Pin every server-side render to America/New_York. The chapter is at USC
// (Columbia, SC) so all event times are local to the East Coast, but Vercel's
// Node runtime is UTC. Without timeZone the SSR HTML rendered "midnight" for a
// 7 PM ET event, then hydration replaced it with the user's local time —
// causing both a hydration mismatch and a misleading initial paint for
// non-Eastern visitors. Pinning to America/New_York is correct for this
// chapter; a multi-tenant white-label fork should read this from cfg.
const SCHEDULE_TZ = "America/New_York";

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: SCHEDULE_TZ,
  });
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: SCHEDULE_TZ,
    timeZoneName: "short",
  });
}

/**
 * Sanitize a config-driven URL or email for safe rendering inside an `href`.
 *
 * Live audit caught two recurring bugs traced to admin-pasted values that had
 * trailing junk: (a) a URL like "https://hazingprevention.org/help/…." with a
 * literal Unicode ellipsis that 404s, and (b) mailto values like
 * "advisor@phisig-usc.com\" with a trailing backslash from a copy-paste.
 *
 * This strips:
 *   • trailing whitespace, line endings
 *   • trailing single backslash
 *   • trailing single horizontal-ellipsis or run of ASCII dots / periods
 *     beyond a single ".tld" — i.e. removes ".." or "...." but leaves ".com"
 *   • smart quotes that snuck in via auto-replace
 *
 * Apply at the LAST point of use (right inside `href={...}` / `<a href=`) —
 * not at admin-save time, because the chair might intentionally paste a URL
 * with a trailing slash that we want to preserve.
 */
export function cleanUrl(raw: string | undefined | null): string {
  if (!raw) return "";
  let s = String(raw).trim();
  // Unicode ellipsis (U+2026) is never legitimate in a URL — strip every
  // occurrence anywhere in the string. The R10 audit caught
  // 'https://hazingprevention.org/help/….' shipping live; the U+2026
  // character had been auto-inserted somewhere in copy-paste.
  s = s.replace(/…/g, "");
  // Normalize smart quotes that sneak in via WYSIWYG copy-paste.
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // Strip trailing punctuation pollution: backslash, isolated sentence-final
  // dot (URLs basically never end in a literal '.'), zero-width chars, and
  // whitespace. Run iteratively to peel layered junk.
  while (s.length > 0) {
    const last = s.charAt(s.length - 1);
    const code = s.charCodeAt(s.length - 1);
    if (
      last === "\\" || last === "." || last === " " ||
      last === "\n" || last === "\r" || last === "\t" ||
      code === 0x200B || code === 0x200C || code === 0x200D || // zero-width chars
      code === 0xFEFF // BOM
    ) {
      s = s.slice(0, -1);
      continue;
    }
    break;
  }
  return s;
}

/** Convenience for `mailto:` hrefs. Strips trailing junk + leading "mailto:" if doubled. */
export function cleanMailto(email: string | undefined | null): string {
  const cleaned = cleanUrl(email).replace(/^mailto:/i, "");
  return cleaned ? `mailto:${cleaned}` : "";
}

/** Convenience for `tel:` hrefs. Strips junk + non-dial chars except + and digits. */
export function cleanTel(phone: string | undefined | null): string {
  const cleaned = cleanUrl(phone).replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}
