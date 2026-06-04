/**
 * Treasury shared helpers — kept in lib (NOT in a route.ts) so they can be
 * imported by both the API route and the server page without tripping Next's
 * "unexpected export in a route segment" build error (only the HTTP-method
 * handlers + recognized segment config may live in a route file).
 */

/**
 * The current academic-term tag, e.g. "2026-fall" / "2026-spring".
 * Convention (matches the BudgetLine.period comment in schema.prisma):
 * August–December → "fall", January–July → "spring".
 */
export function currentPeriod(now = new Date()): string {
  const y = now.getFullYear();
  const term = now.getMonth() >= 7 ? "fall" : "spring"; // getMonth() is 0-indexed
  return `${y}-${term}`;
}
