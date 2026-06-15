// iOS companion-app helpers. Keeps the TestFlight-link resolution logic in one
// testable place so the marketing /ios page can never re-ship a dead
// `…/join/placeholder` store link (a broken store link reads as abandonware and
// tanks trust on a conversion page).

/**
 * Resolve a usable TestFlight invite URL from a raw env value.
 *
 * Returns the URL ONLY when it is a real, well-formed TestFlight invite:
 *   - non-empty
 *   - does NOT still contain the word "placeholder" (a stale default never ships)
 *   - matches `https://testflight.apple.com/join/<code>`
 *
 * Otherwise returns null, and the caller renders an honest "coming soon" state.
 * Owner-gated: a real value only exists once the iOS build is live in App Store
 * Connect / TestFlight (set NEXT_PUBLIC_TESTFLIGHT_URL).
 */
export function resolveTestFlightUrl(raw: string | null | undefined): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (v.toLowerCase().includes("placeholder")) return null;
  if (!/^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]+$/.test(v)) return null;
  return v;
}
