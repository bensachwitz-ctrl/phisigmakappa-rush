// lib/mobile-cors.ts — CORS + native-origin policy for the /api/mobile/* family.
//
// ───────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ───────────────────────────────────────────────────────────────────────────
// The BUNDLED iOS app runs on the Capacitor origin (capacitor://localhost on
// iOS, http://localhost on Android). It calls the hosted mobile APIs CROSS-
// ORIGIN. Two things must be true for that to work:
//
//   1. CORS — the browser/WebView blocks a cross-origin XHR response unless the
//      server returns Access-Control-Allow-Origin for the caller's origin. For
//      the POST routes (auth, rsvp, career, push, google) the WebView also fires
//      a CORS *preflight* (OPTIONS) because of the Authorization / Content-Type
//      headers; that must return 204 with the allow headers.
//
//   2. CSRF — middleware.ts rejects any state-changing /api request that carries
//      an explicit FOREIGN Origin (isSameOriginEdge → false). The native origin
//      IS foreign to greekstack.vercel.app, so without an allowance every mobile
//      POST would 403. We carve out a NARROW exception: a known native origin on
//      the /api/mobile/* prefix only. This is safe because the mobile routes do
//      not rely on cookies — they authenticate with a tenant-bound Bearer token
//      that a CSRF attacker cannot forge or read. (CSRF protects cookie-auth'd
//      mutations; these are header-token-auth'd, so the SameSite/Origin defense
//      is not the security boundary here.)
//
// The allowlist is intentionally tiny: only the fixed Capacitor shell origins,
// plus an optional operator-configured extra origin (NEXT_PUBLIC_GS_NATIVE_ORIGIN
// / GS_NATIVE_ORIGIN) for a custom scheme. The platform's own web origins keep
// flowing through the normal same-origin path and never need CORS.

/** The fixed origins the bundled native shell can present. */
const NATIVE_ORIGINS = new Set<string>([
  "capacitor://localhost", // iOS Capacitor WebView
  "ionic://localhost", // legacy Ionic scheme
  "http://localhost", // Android Capacitor WebView
]);

/**
 * Resolve the full set of allowed native origins, including an optional operator
 * override. Read at call time so a deploy can add a custom origin without a code
 * change. Accepts the public OR server-only var name (same value, two names so
 * either env convention works).
 */
function allowedNativeOrigins(): Set<string> {
  const extra =
    process.env.NEXT_PUBLIC_GS_NATIVE_ORIGIN || process.env.GS_NATIVE_ORIGIN;
  if (extra && extra.trim()) {
    return new Set([...NATIVE_ORIGINS, extra.trim()]);
  }
  return NATIVE_ORIGINS;
}

/**
 * True when `origin` is a recognised native shell origin. Used by middleware to
 * let the bundled app's state-changing /api/mobile/* POSTs past the CSRF gate,
 * and by the route handlers to decide whether to echo CORS headers.
 *
 * Pure-ish: `origin` is passed in (from the request header) so this is unit-
 * testable; only the env override is read from process.env.
 */
export function isAllowedNativeOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return allowedNativeOrigins().has(origin.trim());
}

/**
 * Build the CORS response headers for a mobile API response. When the caller's
 * Origin is an allowed native origin we echo it (credentials-safe: we DON'T set
 * Allow-Credentials because the mobile routes use a Bearer token, not cookies).
 * For same-origin / unknown origins we return {} so the response is unchanged
 * from today — the web app never sees a CORS header and behaves exactly as before.
 */
export function mobileCorsHeaders(origin: string | null | undefined): Record<string, string> {
  if (!isAllowedNativeOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": String(origin),
    // DELETE is required for the native account-deletion flow (DELETE
    // /api/mobile/account — Apple Guideline 5.1.1(v)); its WebView preflight asks
    // for DELETE in Access-Control-Request-Method and is blocked if it is absent.
    // PATCH/PUT are included so future mobile mutations don't re-trip this.
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Subdomain",
    "Access-Control-Max-Age": "86400",
    // Caches/proxies must vary on Origin since the allow header is origin-specific.
    Vary: "Origin",
  };
}

/**
 * Standard preflight (OPTIONS) response for a mobile route. Returns 204 with the
 * CORS headers when the origin is allowed, else a bare 204 (a disallowed origin
 * simply gets no allow header and the WebView blocks it — same as any other
 * unlisted origin).
 *
 * Returned as a Web `Response` so route handlers can `export const OPTIONS`
 * directly without importing NextResponse.
 */
export function mobilePreflightResponse(origin: string | null | undefined): Response {
  return new Response(null, {
    status: 204,
    headers: mobileCorsHeaders(origin),
  });
}
