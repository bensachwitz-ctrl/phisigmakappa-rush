import { describe, it, expect } from "vitest";
import {
  RESERVED_SUBDOMAINS,
  checkSubdomainFormat,
  normalizeSubdomain,
} from "@/lib/reserved-subdomains";

// ---------------------------------------------------------------------------
// Reserved-subdomain guard — SINGLE SOURCE OF TRUTH (lib/reserved-subdomains.ts).
//
// app/api/onboard/route.ts (final submit) and app/api/onboard/check/route.ts
// (live availability) BOTH import checkSubdomainFormat + RESERVED_SUBDOMAINS from
// this module — there is no longer an inline copy in the route to drift. We test
// the lib directly so these assertions ARE the contract both routes enforce.
//
// A provisioned subdomain becomes BOTH a live host (sub.greekstack.vercel.app)
// AND a Postgres schema, so platform/route names, service hostnames, punycode
// homographs, the loaded "public" schema identifier, and too-short labels must
// be unclaimable by self-serve signup.
// ---------------------------------------------------------------------------

// Helper mirroring how the routes use the lib: normalize, then format/denylist.
function isAcceptableSubdomain(rawSubdomain: string): boolean {
  return checkSubdomainFormat(normalizeSubdomain(rawSubdomain)) === null;
}

describe("reserved-subdomain guard — rejects reserved platform/service names", () => {
  it.each(["admin", "api", "greekstack", "www"])(
    "rejects reserved name %s",
    (name) => {
      expect(isAcceptableSubdomain(name)).toBe(false);
    },
  );

  it("rejects a representative sample of the rest of the denylist", () => {
    for (const r of ["webhook", "stripe", "billing", "portal", "vercel", "_next", "null", "root"]) {
      expect(isAcceptableSubdomain(r)).toBe(false);
    }
  });

  it('rejects "public" — the loaded Postgres default-schema identifier (L3)', () => {
    expect(RESERVED_SUBDOMAINS.has("public")).toBe(true);
    expect(isAcceptableSubdomain("public")).toBe(false);
  });
});

describe("reserved-subdomain guard — format rules", () => {
  it("rejects too-short labels (< 3 chars)", () => {
    expect(isAcceptableSubdomain("ab")).toBe(false);
    expect(isAcceptableSubdomain("a")).toBe(false);
  });

  it('rejects double-hyphen / punycode-style "a--b" (xn-- abuse guard)', () => {
    expect(isAcceptableSubdomain("a--b")).toBe(false);
    expect(isAcceptableSubdomain("xn--abc")).toBe(false);
  });

  it("rejects a label that would start or end with a hyphen", () => {
    expect(isAcceptableSubdomain("-abc")).toBe(false);
    expect(isAcceptableSubdomain("abc-")).toBe(false);
  });

  it("rejects an empty / whitespace-only request", () => {
    expect(isAcceptableSubdomain("")).toBe(false);
    expect(isAcceptableSubdomain("   ")).toBe(false);
  });

  it("checkSubdomainFormat returns the most actionable reason", () => {
    expect(checkSubdomainFormat("ab")).toBe("invalid");      // too short
    expect(checkSubdomainFormat("admin")).toBe("reserved");  // well-formed but denied
    expect(checkSubdomainFormat("public")).toBe("reserved"); // L3
    expect(checkSubdomainFormat("phisig")).toBe(null);       // OK
  });
});

describe("reserved-subdomain guard — accepts a legitimate chapter subdomain", () => {
  it('accepts "phisig"', () => {
    expect(isAcceptableSubdomain("phisig")).toBe(true);
  });

  it("accepts other normal multi-char labels", () => {
    expect(isAcceptableSubdomain("betasigma")).toBe(true);
    expect(isAcceptableSubdomain("kappa-alpha")).toBe(true); // single interior hyphen ok
    expect(isAcceptableSubdomain("abc")).toBe(true); // exactly 3 chars, boundary
  });

  it("normalizes case + strips illegal chars before validating", () => {
    expect(isAcceptableSubdomain("Phi Sig!")).toBe(true); // → "phisig"
  });
});

// ── Drift guard: the two onboard routes must keep importing from this module ──
// (No inline RESERVED copy may reappear in either route.) A source-pin catches a
// future regression where someone re-inlines the denylist and lets it drift.
describe("reserved-subdomain guard — onboard routes use the single source", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const { resolve } = require("node:path") as typeof import("node:path");
  const ROOT = resolve(__dirname, "..");

  for (const rel of ["app/api/onboard/route.ts", "app/api/onboard/check/route.ts"]) {
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    it(`${rel} imports checkSubdomainFormat from lib/reserved-subdomains`, () => {
      expect(src).toMatch(/from\s+["']@\/lib\/reserved-subdomains["']/);
      expect(src).toContain("checkSubdomainFormat");
    });
    it(`${rel} does not re-inline a local RESERVED Set`, () => {
      expect(src).not.toMatch(/const\s+RESERVED\s*=\s*new Set/);
    });
  }
});
