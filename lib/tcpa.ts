import type { PrismaClient } from "@prisma/client";

/**
 * TCPA / CTIA compliance helpers for outbound SMS.
 *
 * Two independent legal guards, both required before any SMS blast:
 *
 *  1. QUIET HOURS — don't send marketing/mixed SMS before 8am or after 9pm
 *     recipient-local. `isWithinQuietHours()` is the single source of truth
 *     (previously inlined + hardcoded to America/New_York inside the broadcast
 *     route — now parameterized so each tenant passes its own timezone).
 *
 *  2. OPT-OUT — a rushee who texted STOP has `RushConsent.optedOut = true`.
 *     Blasting them again is a TCPA violation. `filterOptedOut()` removes them
 *     from a recipient set BEFORE send.
 */

/**
 * True if the current time is inside the 8am–9pm window in `timezone`.
 * Default America/New_York (most Greekstack rosters are East Coast and this
 * is the conservative choice — see broadcast route history).
 *
 * Uses Intl.DateTimeFormat to read the wall-clock hour in the target zone,
 * the same approach the broadcast route used inline. Fails OPEN (returns true)
 * if the hour can't be parsed or the timezone string is invalid, so a bad cfg
 * value never hard-blocks all messaging — it just loses the guard for that send.
 */
export function isWithinQuietHours(timezone: string = "America/New_York"): boolean {
  const now = new Date();
  let hour: number;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    hour = Number.parseInt(fmt.format(now), 10);
  } catch {
    // Invalid timezone identifier → fail open rather than block every send.
    return true;
  }
  if (Number.isNaN(hour)) return true; // fail open
  return hour >= 8 && hour < 21;
}

/**
 * Given a set of rush ids, return only those that are SAFE to text — i.e.
 * whose latest RushConsent does NOT have `optedOut === true`.
 *
 * Semantics:
 *  - A rush with NO consent row at all is ALLOWED (kept). Opt-out is the
 *    explicit signal; absence of a row is not a stop.
 *  - A rush is EXCLUDED only when its most-recent consent row (by createdAt)
 *    has optedOut === true. We look at the latest row so a later re-opt-in
 *    (a fresh consent row with optedOut=false) correctly re-enables sends.
 *  - Order of the returned ids matches the input order; duplicates in the
 *    input are preserved as-is (callers map over their own recipient list).
 *
 * On any DB error we FAIL CLOSED for safety is NOT appropriate here (it would
 * silently drop a whole legitimate blast); instead we let the error propagate
 * to the caller, which already wraps sends in try/catch and logging. Keeping
 * the query simple + correct.
 */
export async function filterOptedOut(
  db: PrismaClient,
  rushIds: string[]
): Promise<string[]> {
  if (rushIds.length === 0) return [];

  // Pull every consent row for the candidate rushes, newest first, so the
  // first row we see per rushId is the latest one.
  const consents = await db.rushConsent.findMany({
    where: { rushId: { in: rushIds } },
    select: { rushId: true, optedOut: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const latestOptedOut = new Map<string, boolean>();
  for (const c of consents) {
    // First occurrence per rushId == latest (list is desc by createdAt).
    if (!latestOptedOut.has(c.rushId)) {
      latestOptedOut.set(c.rushId, c.optedOut === true);
    }
  }

  // Keep a rush unless its latest consent row is explicitly opted out.
  return rushIds.filter((id) => latestOptedOut.get(id) !== true);
}
