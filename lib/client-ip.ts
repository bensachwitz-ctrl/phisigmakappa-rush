/**
 * Resolve the client IP for security purposes (brute-force throttling, audit).
 *
 * SECURITY: a client can set ANY `x-forwarded-for` value on its request, so
 * deriving the throttle key from the raw `x-forwarded-for[0]` lets an attacker
 * rotate the apparent IP per request and slip under the per-IP fail cap. On
 * Vercel, the platform sets `x-vercel-forwarded-for` from the real connection
 * and a client CANNOT override it (Vercel strips/overwrites it at the edge), so
 * we prefer it. `x-real-ip` (also platform-set on Vercel) is the next-best.
 * We fall back to the raw `x-forwarded-for` ONLY when neither platform header is
 * present (e.g. local dev / non-Vercel hosting), which is acceptable there.
 *
 * Returns null when no IP can be determined (caller should still proceed but
 * cannot throttle by IP — never hard-fail a login just because the IP is
 * unknown).
 */
export function getClientIp(req: Request): string | null {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  return null;
}
