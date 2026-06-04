// Shared host→subdomain expectation table.
//
// This is the SINGLE source of truth for what getSubdomain (lib/prisma.ts) and
// its edge mirror getSubdomainEdge (lib/auth-edge.ts) must each return. Both the
// pure getSubdomain test and the edge-drift test consume this table, so the two
// functions are asserted against the SAME inputs — the whole point of the
// "documented mirror" invariant (if one drifts, a row here fails for that fn).

export interface SubdomainCase {
  host: string | null;
  expected: string | null;
  note: string;
}

export const SUBDOMAIN_CASES: SubdomainCase[] = [
  // --- Apex / null cases: every one of these must resolve to the public apex. ---
  { host: null, expected: null, note: "null host" },
  { host: "localhost", expected: null, note: "bare localhost" },
  { host: "localhost:3000", expected: null, note: "localhost with port" },
  { host: "localhost:3001", expected: null, note: "localhost alt port" },
  { host: "greekstack", expected: null, note: "bare greekstack label" },
  { host: "greekstack.vercel.app", expected: null, note: "apex vercel host" },
  { host: "greeklifesystems", expected: null, note: "bare greeklifesystems label" },
  { host: "greeklifesystems.vercel.app", expected: null, note: "alt apex vercel host" },
  { host: "greek-life-systems.vercel.app", expected: null, note: "hyphenated apex host" },
  { host: "www", expected: null, note: "bare www" },
  { host: "GREEKSTACK.VERCEL.APP", expected: null, note: "apex host uppercased (case-insensitive)" },

  // --- Real tenant subdomains: extracted, port-stripped, lowercased, sanitized. ---
  { host: "phisig.greekstack.vercel.app", expected: "phisig", note: "tenant on apex" },
  { host: "phisig.greeklifesystems.vercel.app", expected: "phisig", note: "tenant on alt apex" },
  { host: "phisig.localhost:3001", expected: "phisig", note: "tenant on localhost:3001" },
  { host: "phisig.localhost:3000", expected: "phisig", note: "tenant on localhost:3000" },
  { host: "PhiSig.greekstack.vercel.app", expected: "phisig", note: "mixed-case tenant lowercased" },
  { host: "alpha-beta.greekstack.vercel.app", expected: "alpha_beta", note: "hyphen sanitized to underscore" },
  { host: "kappa.kappa.greekstack.vercel.app", expected: "kappa_kappa", note: "multi-label leftover dot sanitized" },
];
