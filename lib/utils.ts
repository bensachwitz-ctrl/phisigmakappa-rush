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
  ACCEPTED: "bg-brand-red text-white ring-1 ring-brand-red-dark",
  DECLINED: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200",
};

// Default timezone for server-side date/time rendering. Vercel's Node runtime
// is UTC, so without an explicit timeZone the SSR HTML renders "midnight" for a
// 7 PM event and then hydration swaps in the viewer's local time — a hydration
// mismatch plus a misleading first paint.
//
// WHITE-LABEL: this is now the LAST-RESORT fallback only. The per-chapter
// timezone lives in SiteConfig under "chapter.timezone" (see DEFAULTS) and is
// surfaced as `ChapterIdentity.timeZone`; server callers that have cfg/identity
// loaded pass it through the `timezone` arg below, so each tenant's events
// render in THEIR local zone. A single-tenant deploy can also pin the fallback
// at build time via NEXT_PUBLIC_CHAPTER_TIMEZONE (inlined into the client
// bundle, so it's safe in the shared client utils) without touching code. We
// only hardcode "America/New_York" as the final default when neither is set.
const SCHEDULE_TZ =
  process.env.NEXT_PUBLIC_CHAPTER_TIMEZONE || "America/New_York";

export function formatDate(d: Date | string, timezone = SCHEDULE_TZ) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
}

export function formatTime(d: Date | string, timezone = SCHEDULE_TZ) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
}

/**
 * Idiot-proof title-case for short admin-entered strings (chapter address,
 * city/state, names). Capitalizes the first letter of each word, lowercases
 * the rest, but preserves common all-caps tokens like state codes ("SC", "NC")
 * and Roman-numeral suffixes ("II", "III", "IV") — so "1525 college street, columbia, sc"
 * becomes "1525 College Street, Columbia, SC" without breaking edge cases.
 *
 * Defends against admin pasting all-lowercase addresses from typing tests or
 * autofill — the live site renders title-cased even if the cfg row has bad
 * casing.
 */
const ROMAN_SUFFIXES = new Set(["II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]);
const STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
]);
export function titleCaseAddress(input: string | undefined | null): string {
  if (!input) return "";
  return String(input)
    .split(/(\s+|,)/)
    .map((tok) => {
      if (/^\s+$/.test(tok) || tok === ",") return tok;
      const upper = tok.toUpperCase();
      if (STATE_CODES.has(upper) || ROMAN_SUFFIXES.has(upper)) return upper;
      // Numbers stay as-is.
      if (/^\d+$/.test(tok)) return tok;
      // Mixed alphanumeric (e.g. "29208"): keep digits; capitalize letters.
      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Sanitize a config-driven URL or email for safe rendering inside an `href`.
 *
 * Live audit caught two recurring bugs traced to admin-pasted values that had
 * trailing junk: (a) a URL like "https://hazingprevention.org/help/…." with a
 * literal Unicode ellipsis that 404s, and (b) mailto values like
 * "advisor@chapter.example\" with a trailing backslash from a copy-paste.
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
