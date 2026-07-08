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
 *
 * SECURITY NOTE: `x-forwarded-for` is client-forgeable, so an attacker can rotate
 * it per request to dodge a per-IP cap. For brute-force throttles prefer
 * `getClientIp` (lib/client-ip) — it prefers the platform-set, non-forgeable
 * `x-vercel-forwarded-for` — together with the DB-backed helpers below.
 */
export function clientIpFromRequest(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── DB-backed, cross-instance brute-force throttle ──────────────────────────
//
// The in-memory limiter above is a module-level Map, so on Vercel serverless each
// cold-started instance has its OWN empty Map — an attacker who spreads guesses
// across instances (or simply benefits from autoscaling) is never actually
// capped. Auth-critical paths (portal/mobile login, OTP verify, reset request)
// must therefore count attempts in a SHARED store.
//
// These helpers implement the SAME count-recent / record-on-failure / clear-on-
// success pattern app/api/admin/login already uses against the RushSubmitLog
// table (an existing table — zero new infra / no migration), but factored out so
// every auth route shares one implementation. They take the Prisma client as a
// parameter (Host-proxied `prisma`, an explicit getTenantClient(sub), or
// centralDb) so this file stays dependency-free and works in any tenant context.
//
// Rows carry BOTH `ipAddress` and an `email` account key, and the check counts
// each dimension independently: an IP spraying many accounts trips the IP bucket;
// a single account hit from many IPs trips the account bucket. Both fail OPEN on a
// DB error so a transient glitch never locks a legitimate user out.

/** Structural subset of the Prisma client's `rushSubmitLog` delegate we need. */
export interface RushSubmitLogDb {
  rushSubmitLog: {
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
  };
}

export interface DbThrottleOptions {
  /** Max recorded attempts within the window before the key is blocked. */
  limit: number;
  /** Sliding-window size in milliseconds. */
  windowMs: number;
  /** RushSubmitLog.status discriminator so this route's rows don't cross-count. */
  status: string;
}

/** Throttle dimensions. Either may be null/absent (that dimension is skipped). */
export interface ThrottleKeys {
  ip?: string | null;
  account?: string | null;
}

/**
 * Count recent attempts for the given dimensions in the SHARED RushSubmitLog
 * table and report whether the key is over the limit. Does NOT record a hit —
 * call `recordDbAttempt` on a failed attempt and `clearDbAttempts` on success.
 * Fails OPEN (blocked=false) on any DB error.
 */
export async function checkDbThrottle(
  db: RushSubmitLogDb,
  keys: ThrottleKeys,
  opts: DbThrottleOptions,
): Promise<RateLimitResult> {
  try {
    const since = new Date(Date.now() - opts.windowMs);
    const wheres: any[] = [];
    if (keys.ip) wheres.push({ ipAddress: keys.ip, status: opts.status, createdAt: { gte: since } });
    if (keys.account) wheres.push({ email: keys.account, status: opts.status, createdAt: { gte: since } });
    if (wheres.length === 0) return { ok: true, retryAfterSec: 0 };
    const counts = await Promise.all(wheres.map((w) => db.rushSubmitLog.count({ where: w })));
    const blocked = counts.some((c) => c >= opts.limit);
    return { ok: !blocked, retryAfterSec: blocked ? Math.ceil(opts.windowMs / 1000) : 0 };
  } catch {
    return { ok: true, retryAfterSec: 0 }; // fail open — never lock out on a DB glitch
  }
}

/**
 * Record ONE attempt against the shared store (typically on a failed login / OTP
 * redemption). Best-effort: swallows DB errors. Callers should `await` this before
 * returning the failure so the attempt is durably counted before a retry can land.
 */
export async function recordDbAttempt(
  db: RushSubmitLogDb,
  keys: ThrottleKeys,
  opts: DbThrottleOptions,
): Promise<void> {
  if (!keys.ip && !keys.account) return;
  try {
    await db.rushSubmitLog.create({
      data: { ipAddress: keys.ip ?? null, email: keys.account ?? null, status: opts.status },
    });
  } catch {
    // best-effort — a failed log must never block a legitimate user
  }
}

/**
 * Clear this route's recorded attempts for the given dimensions (typically on a
 * successful login), so a legitimate user isn't penalized by earlier failures.
 * Best-effort: swallows DB errors.
 */
export async function clearDbAttempts(
  db: RushSubmitLogDb,
  keys: ThrottleKeys,
  opts: DbThrottleOptions,
): Promise<void> {
  const or: any[] = [];
  if (keys.ip) or.push({ ipAddress: keys.ip });
  if (keys.account) or.push({ email: keys.account });
  if (or.length === 0) return;
  try {
    await db.rushSubmitLog.deleteMany({ where: { status: opts.status, OR: or } });
  } catch {
    // best-effort
  }
}
