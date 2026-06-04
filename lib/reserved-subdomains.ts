// lib/reserved-subdomains.ts — single source of truth for subdomain validity.
//
// A provisioned subdomain becomes BOTH a live host
// (<sub>.greekstack.vercel.app) AND a Postgres schema, so platform/route names
// and common service hostnames must never be self-serve claimable — otherwise a
// signup could squat "admin", "api", "webhook", a name that shadows platform
// routing, or (via a "xn--" punycode prefix / double-hyphen) a homograph host.
//
// SYNC CONTRACT: these rules MUST agree with the FINAL-submit validation in
// app/api/onboard/route.ts. The live availability check (app/api/onboard/check)
// imports from here so the inline "available / taken / reserved / invalid"
// hint the user sees while typing matches exactly what the final POST enforces.
// app/api/onboard/route.ts currently inlines an identical RESERVED set + the
// same format regex + the same `--`/length guards; that file is owned by
// another agent, so this module is a faithful mirror, not its importer. If the
// denylist or format rule changes in ONE place, change it in BOTH.

/**
 * Reserved subdomains that can never be claimed by self-serve signup.
 * Mirrors the `RESERVED` set inlined in app/api/onboard/route.ts verbatim.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "www", "greekstack", "greeklifesystems", "greek-life-systems", "apex", "_apex",
  "admin", "api", "app", "apps", "dashboard", "portal", "auth", "login",
  "mail", "email", "smtp", "imap", "ftp", "ns", "ns1", "ns2", "dns",
  "static", "assets", "cdn", "img", "images", "media", "files", "uploads",
  "vercel", "next", "_next", "status", "health", "test", "staging", "dev",
  "billing", "stripe", "webhook", "webhooks", "internal", "system", "root",
  "support", "help", "docs", "blog", "about", "pricing", "demo", "onboard",
  "signup", "register", "account", "accounts", "settings", "config", "null",
]);

/**
 * Normalize a raw subdomain to its canonical, claimable form: trimmed,
 * lower-cased, and stripped of everything outside [a-z0-9-]. IDENTICAL to the
 * sanitizer in app/api/onboard/route.ts so the registry lookup key matches.
 */
export function normalizeSubdomain(raw: string | null | undefined): string {
  return (raw || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Why a subdomain can't be used, when it can't. `null` ⇒ shape is acceptable. */
export type SubdomainRejection = "invalid" | "reserved";

/**
 * Validate the SHAPE of an already-normalized subdomain (does NOT touch the
 * registry — uniqueness is checked separately). Returns:
 *   • null        — format + denylist OK, free to check availability
 *   • "invalid"   — empty, too short, bad chars, or `--`/punycode abuse
 *   • "reserved"  — well-formed but on the reserved denylist
 *
 * The order matters: an empty/malformed value is "invalid" even if it would
 * also collide with the denylist, so the user gets the most actionable reason.
 * These checks are byte-for-byte the same predicates the final POST applies.
 */
export function checkSubdomainFormat(subdomain: string): SubdomainRejection | null {
  // 3–63 chars, start/end alphanumeric, hyphens allowed only in the middle.
  const validFormat = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(subdomain);
  if (
    !subdomain ||
    subdomain.length < 3 ||
    !validFormat ||
    subdomain.includes("--") // blocks "xn--" punycode + double-hyphen abuse
  ) {
    return "invalid";
  }
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return "reserved";
  }
  return null;
}
