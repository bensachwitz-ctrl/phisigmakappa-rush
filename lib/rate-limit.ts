// Reusable per-IP sliding-window rate limiter.
//
// Mirrors the in-memory throttle pattern already used in
// app/api/platform/login/route.ts: a module-level Map<key, timestamp[]>
// pruned to the active window on every check. In-memory is sufficient for a
// single instance; a multi-instance deploy would back this with Redis.
// Dependency-free on purpose so any route can import it.

const buckets = new Map<string, number[]>();

export interface RateLimitOptions {
  /** Max number of recorded hits allowed within the window. */
  limit: number;
  /** Sliding-window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** false once the key has met or exceeded `limit` within the window. */
  ok: boolean;
  /** Seconds until the oldest in-window hit expires (for a Retry-After header). */
  retryAfterSec: number;
}

/**
 * Check whether `key` is currently rate-limited. This does NOT record a hit —
 * call `recordRateLimit` on a failed/expensive attempt and `clearRateLimit` on
 * success, matching the record-on-failure / clear-on-success pattern used by
 * the platform login throttle.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < opts.windowMs);
  buckets.set(key, recent);

  if (recent.length >= opts.limit) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Record one hit against `key` (typically on a failed attempt). */
export function recordRateLimit(key: string, opts: RateLimitOptions): void {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < opts.windowMs);
  recent.push(now);
  buckets.set(key, recent);
}

/** Clear all recorded hits for `key` (typically on a successful attempt). */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Derive the client IP from the `x-forwarded-for` header (first hop), falling
 * back to `x-real-ip`, then to a constant so the limiter never keys on an empty
 * string. Matches the `clientIp` helper in the platform login route.
 */
export function clientIpFromRequest(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
