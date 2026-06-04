/**
 * Service-hour counter helpers.
 *
 * `ServiceHourLog.hoursLogged` is stored as `Decimal(4,2)` (e.g. 2.50), but the
 * denormalized `Brother.serviceHours` total is an `Int`. When an approval
 * credits the member's counter — and when an un-approval (reject of a
 * previously-approved log) backs it out — both directions MUST round the same
 * way so a submitted→approved→rejected round-trip nets exactly to zero and the
 * counter can never drift away from the sum of approved logs.
 *
 * Prisma's Decimal is Decimal.js-compatible (has .toNumber()/.toString()), but
 * we accept anything number-coercible (Decimal, number, string) so callers
 * don't have to import the Decimal type. NaN / negative inputs clamp to 0 so a
 * malformed row can never decrement a counter into nonsense.
 */
export function serviceHoursToInt(hours: unknown): number {
  const n = typeof hours === "number" ? hours : Number((hours as any)?.toString?.() ?? hours);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}
