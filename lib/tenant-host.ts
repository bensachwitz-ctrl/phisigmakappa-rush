// Single source of truth for tenant host → subdomain parsing.
//
// This module is DEPENDENCY-FREE and edge-safe (no @prisma/client, no Node
// builtins) so it can be imported by BOTH the Node runtime (lib/prisma.ts) and
// the Edge runtime (lib/auth-edge.ts / middleware). Previously the apex-host
// list and the suffix-strip chain were duplicated verbatim in three places
// (getSubdomain, getRegistrySubdomain, getSubdomainEdge), and a drifting copy
// would silently mis-resolve the tenant tag the HMAC session token is signed
// with — so a single canonical definition lives here.
//
// The CANONICAL apex is `greekstack.vercel.app`. The `greeklifesystems*` hosts
// are LEGACY apex aliases kept so an old-domain request still resolves to the
// platform apex (never a chapter) — do not remove them; doing so would make the
// old host resolve to a bogus `greeklifesystems` tenant schema.

/** Bare hostnames (no subdomain) that resolve to the platform apex, not a chapter. */
export const APEX_HOSTS: readonly string[] = [
  "localhost",
  "greekstack",
  "greekstack.vercel.app",
  "greeklifesystems", // legacy apex alias
  "greeklifesystems.vercel.app", // legacy apex alias
  "greek-life-systems.vercel.app", // legacy apex alias
  "www",
];

/** Host suffixes stripped to reveal the leading subdomain label. */
export const APEX_STRIP_SUFFIXES: readonly string[] = [
  ".localhost:3000",
  ".localhost:3001",
  ".greekstack.vercel.app",
  ".greeklifesystems.vercel.app",
  ".greek-life-systems.vercel.app",
];

/** Leftover labels that are themselves apex (post-strip), never a chapter. */
const RESERVED_LABELS: readonly string[] = ["www", "greekstack", "greeklifesystems"];

/** True when the host (port-stripped, lowercased) is the platform apex. */
export function isApexHost(host: string | null): boolean {
  if (!host) return true;
  return APEX_HOSTS.includes(host.split(":")[0].toLowerCase());
}

/**
 * Strip the apex suffix + port from a host, returning the leading subdomain
 * label (or "" if none / the host was itself apex). Shared by every parser so
 * the apex set + strip list can never drift between Node and Edge.
 */
function leadingLabel(host: string): string {
  if (isApexHost(host)) return "";
  let cleanHost = host;
  for (const suffix of APEX_STRIP_SUFFIXES) cleanHost = cleanHost.replace(suffix, "");
  cleanHost = cleanHost.trim();
  if (!cleanHost || RESERVED_LABELS.includes(cleanHost)) return "";
  return cleanHost;
}

/**
 * Extract and sanitize the subdomain from a hostname, collapsing every
 * non-alphanumeric char to "_" — the form used to build the Postgres SCHEMA
 * name ("schema_phi_sig"); a bare hyphen is illegal in an unquoted identifier.
 * Returns null on the apex / unknown hosts.
 *
 * This is the canonical implementation behind lib/prisma.getSubdomain and the
 * edge mirror in lib/auth-edge — keep them delegating here, never re-inlined.
 */
export function getSubdomain(host: string | null): string | null {
  if (!host) return null;
  const label = leadingLabel(host);
  if (!label) return null;
  return label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

/**
 * Resolve a host to the HYPHEN-PRESERVING leading label (e.g. "phi-sig" stays
 * "phi-sig"). Callers apply their own normalizeSubdomain() to match the central
 * registry key. Returns null on the apex / unknown hosts.
 */
export function getLeadingLabel(host: string | null): string | null {
  if (!host) return null;
  return leadingLabel(host) || null;
}
