// Umami — privacy-first, cookieless product analytics (MIT, self-hostable).
//
// The GOAL (item #39.2): a single-line, env/cfg-gated <script> that is INERT by
// default (no key → no script → no network → byte-identical output) and collects
// NO PII — Umami is cookieless and does not fingerprint, so there is no cookie
// banner and no consent gate required. This module is the PURE brain:
//   • validators that make an admin/env-supplied website-id + script src safe to
//     drop into raw HTML attributes (defense-in-depth: the values are trusted-ish
//     but land in the DOM, so a hostile value must never break out),
//   • resolveUmamiConfig(): env-first, cfg-fallback resolution → a render decision,
//   • track(): a tiny client-side custom-event helper that no-ops until the script
//     has loaded, so callers can fire chapter events without importing the SDK.
//
// Mirrors the shape of the existing Plausible wiring in app/layout.tsx so the two
// privacy analytics options are configured the same way.

/** Umami Cloud's default script endpoint. Self-hosters override with their own
 *  instance's `/script.js` via NEXT_PUBLIC_UMAMI_SRC / analytics.umamiSrc. */
export const UMAMI_DEFAULT_SRC = "https://cloud.umami.is/script.js";

/**
 * Validate an Umami website id. Umami issues UUIDs, but self-hosted instances may
 * use other opaque tokens — so accept a conservative charset (hex/alnum + hyphen,
 * 8..64 chars) rather than a strict UUID. This rejects spaces, quotes, angle
 * brackets, and anything else that could break out of the `data-website-id`
 * attribute. Returns "" for anything invalid so the caller renders no script.
 */
export function safeUmamiWebsiteId(input: string | undefined | null): string {
  if (!input) return "";
  const s = input.trim();
  if (/^[A-Za-z0-9-]{8,64}$/.test(s)) return s;
  return "";
}

/**
 * Validate an Umami script src. Must be an absolute https URL whose path ends in
 * ".js" — this blocks `javascript:` / `data:` schemes, protocol-relative tricks,
 * and any non-script endpoint. Returns "" (→ caller falls back to the default)
 * for anything that doesn't parse to a clean https .js URL.
 */
export function safeUmamiSrc(input: string | undefined | null): string {
  if (!input) return "";
  const s = input.trim();
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return "";
  }
  if (u.protocol !== "https:") return "";
  if (!/\.js$/i.test(u.pathname)) return "";
  return u.toString();
}

export interface UmamiConfig {
  /** The validated website id → the `data-website-id` attribute. */
  websiteId: string;
  /** The validated script URL → the `<script src>`. */
  src: string;
}

/**
 * Resolve the render decision from env + cfg inputs. ENV wins over cfg for the
 * website id (a host-level opt-in), and the src falls back env → cfg → default.
 * Returns null when there is no valid website id — the "render nothing, load
 * nothing" signal the layout uses to stay inert. Pure: no `process.env` reads
 * here so it is trivially testable; callers pass the raw values in.
 */
export function resolveUmamiConfig(inputs: {
  envWebsiteId?: string;
  envSrc?: string;
  cfgWebsiteId?: string;
  cfgSrc?: string;
}): UmamiConfig | null {
  const websiteId =
    safeUmamiWebsiteId(inputs.envWebsiteId) || safeUmamiWebsiteId(inputs.cfgWebsiteId);
  if (!websiteId) return null;
  const src =
    safeUmamiSrc(inputs.envSrc) || safeUmamiSrc(inputs.cfgSrc) || UMAMI_DEFAULT_SRC;
  return { websiteId, src };
}

// ── Client-side custom events ──────────────────────────────────────────────────

declare global {
  interface Window {
    umami?: {
      track: ((eventName: string, data?: Record<string, unknown>) => void) &
        ((payload: Record<string, unknown>) => void);
    };
  }
}

/**
 * Fire a custom Umami event. No-op on the server, and no-op on the client until
 * the (env/cfg-gated) script has actually loaded and attached window.umami — so
 * an unconfigured tenant never errors and never phones home. Keep `data` free of
 * PII: pass counts / enums / ids, never names, emails, or phone numbers.
 */
export function track(eventName: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const u = window.umami;
  if (!u || typeof u.track !== "function") return;
  try {
    if (data) u.track(eventName, data);
    else u.track(eventName);
  } catch {
    // Analytics must never break the surface that fired the event.
  }
}
