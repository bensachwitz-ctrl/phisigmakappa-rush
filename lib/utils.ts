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

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
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
  // Strip trailing punctuation pollution: backslash, ellipsis, repeated dots.
  // Run iteratively in case multiple bad chars are stacked.
  while (s.length > 0) {
    const last = s[s.length - 1];
    if (last === "\\" || last === "…" || last === " " || last === "\n" || last === "\r" || last === "\t") {
      s = s.slice(0, -1);
      continue;
    }
    // Strip trailing run of 2+ ASCII dots (".." or "...") but keep a single
    // dot since it's needed for .com / .org / .edu TLDs.
    if (last === "." && s.length >= 2 && s[s.length - 2] === ".") {
      s = s.slice(0, -1);
      continue;
    }
    break;
  }
  // Normalize smart quotes that sometimes appear after WYSIWYG copy-paste.
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
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
