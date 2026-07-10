// dues-config.ts — pure predicate for "has this chapter configured online dues?"
//
// Framework-free on purpose so it imports cleanly from server pages, route
// handlers, and Node tests. It reads the resolved SiteConfig map (see
// lib/site-config DEFAULTS for the `dues.*` keys) and returns the SAME verdict
// the member portal already uses to decide whether the Dues tab belongs on a
// plain member's navigation.

/**
 * True only when the chapter has actually set dues up: online dues collection is
 * ENABLED (`dues.enabled === "true"`) AND a positive amount is configured
 * (`dues.amountCents > 0`). A chapter that never touched dues (disabled, or a
 * $0 plan) is NOT configured, so the member-facing Dues surface stays hidden.
 * When dues IS configured, callers keep their existing behavior unchanged.
 */
export function isDuesConfigured(
  cfg: Record<string, string> | null | undefined,
): boolean {
  if (!cfg) return false;
  const enabled = cfg["dues.enabled"] === "true";
  const amountCents = parseInt(cfg["dues.amountCents"] || "0", 10);
  return enabled && Number.isFinite(amountCents) && amountCents > 0;
}
