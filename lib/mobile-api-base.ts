// lib/mobile-api-base.ts — the single source of truth for WHERE the member-
// facing mobile client sends its API calls.
//
// ───────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ───────────────────────────────────────────────────────────────────────────
// The web app (greekstack.vercel.app/app) is served from the platform origin,
// so its fetches are plain same-origin relative paths ("/api/mobile/data") and
// the browser fills in the origin for free.
//
// The BUNDLED iOS app is different. Its UI ships INSIDE the binary and runs on
// the Capacitor origin (capacitor://localhost on iOS). A relative "/api/mobile/*"
// from there would resolve to capacitor://localhost/api/mobile/* — which does
// not exist — instead of the hosted backend. So the native client must call the
// platform with an ABSOLUTE origin.
//
// This module resolves that origin ONCE and exposes apiUrl() so every call site
// is identical on web and native. The mobile APIs already take `subdomain` as a
// body/query param (not from the Host header), so they work cross-origin; the
// only thing that changes is the base.
//
// CONFIGURABILITY: the base is overridable via NEXT_PUBLIC_GS_API_BASE so a
// preview build, a self-host, or a custom apex can point the binary at a
// different backend without a code change. Falls back to the production apex.
//
// SAFETY: on web we deliberately return a RELATIVE base ("") so the live web app
// keeps issuing same-origin requests byte-for-byte as before (no CORS, no
// cross-origin preflight, no behavior change). Only the native shell switches to
// the absolute origin.

/** The production platform origin the bundled app talks to by default. */
export const DEFAULT_API_BASE = "https://greekstack.vercel.app";

/**
 * True only inside the native Capacitor shell. Mirrors lib/native-bridge's
 * isNative() but kept dependency-free here so this module is safe to import from
 * anywhere (including pure-logic tests) without dragging the bridge in.
 *
 * We detect native by either the injected Capacitor runtime reporting native,
 * OR the document being served from the capacitor:// (iOS) / http://localhost
 * (Android) shell origin. The latter is a defensive fallback for the window
 * before the Capacitor JS finishes booting.
 */
export function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) {
      return true;
    }
    // Fallback: the bundled webDir is served from a non-http(s) app origin.
    const proto = window.location.protocol;
    if (proto === "capacitor:" || proto === "ionic:") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Resolve the configured API base. Trailing slashes are trimmed so apiUrl() can
 * always join with a leading-slash path. An empty string means "same-origin"
 * (the web default).
 *
 * Pure + side-effect-free given its inputs so it is unit-testable: the optional
 * `opts` lets tests inject the native flag and env value deterministically.
 */
export function resolveApiBase(opts?: {
  native?: boolean;
  envBase?: string | undefined;
}): string {
  const native = opts?.native ?? isNativeRuntime();
  // On the web we stay relative (same-origin) — no behavior change, no CORS.
  if (!native) return "";

  const raw =
    opts && "envBase" in opts
      ? opts.envBase
      : process.env.NEXT_PUBLIC_GS_API_BASE;
  const base = (raw && raw.trim()) || DEFAULT_API_BASE;
  return base.replace(/\/+$/, "");
}

/**
 * Join the resolved API base with an app-relative path. Always pass a path that
 * starts with "/", e.g. apiUrl("/api/mobile/data?subdomain=usc").
 *
 *   web:    apiUrl("/api/mobile/data") -> "/api/mobile/data"        (same-origin)
 *   native: apiUrl("/api/mobile/data") -> "https://greekstack.vercel.app/api/mobile/data"
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${resolveApiBase()}${p}`;
}
