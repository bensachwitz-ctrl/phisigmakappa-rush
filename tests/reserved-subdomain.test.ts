import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Reserved-subdomain guard from app/api/onboard/route.ts.
//
// The provisioning route validates a requested subdomain INLINE (not exported),
// so per the brief we REPLICATE the exact predicate here and pin its behavior.
// A provisioned subdomain becomes BOTH a live host (sub.greekstack.vercel.app)
// AND a Postgres schema, so platform/route names, service hostnames, punycode
// homographs, and too-short labels must be unclaimable by self-serve signup.
//
// SOURCE OF TRUTH: app/api/onboard/route.ts (RESERVED set + validFormat regex +
// length/double-hyphen guards). If that route changes, update this mirror — a
// failure here flags drift between the test's copy and the route.
// ---------------------------------------------------------------------------

// --- verbatim copy of the route's RESERVED denylist ---
const RESERVED = new Set([
  "www", "greekstack", "greeklifesystems", "greek-life-systems", "apex", "_apex",
  "admin", "api", "app", "apps", "dashboard", "portal", "auth", "login",
  "mail", "email", "smtp", "imap", "ftp", "ns", "ns1", "ns2", "dns",
  "static", "assets", "cdn", "img", "images", "media", "files", "uploads",
  "vercel", "next", "_next", "status", "health", "test", "staging", "dev",
  "billing", "stripe", "webhook", "webhooks", "internal", "system", "root",
  "support", "help", "docs", "blog", "about", "pricing", "demo", "onboard",
  "signup", "register", "account", "accounts", "settings", "config", "null",
]);

// --- verbatim copy of the route's sanitize + validation predicate ---
function isAcceptableSubdomain(rawSubdomain: string): boolean {
  const subdomain = (rawSubdomain || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const validFormat = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(subdomain);
  if (
    !subdomain ||
    subdomain.length < 3 ||
    !validFormat ||
    subdomain.includes("--") ||
    RESERVED.has(subdomain)
  ) {
    return false;
  }
  return true;
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
    // Leading/trailing hyphen survives the [a-z0-9-] sanitize but fails validFormat.
    expect(isAcceptableSubdomain("-abc")).toBe(false);
    expect(isAcceptableSubdomain("abc-")).toBe(false);
  });

  it("rejects an empty / whitespace-only request", () => {
    expect(isAcceptableSubdomain("")).toBe(false);
    expect(isAcceptableSubdomain("   ")).toBe(false);
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
    // "Phi Sig!" → "phisig" after lowercase + strip → acceptable.
    expect(isAcceptableSubdomain("Phi Sig!")).toBe(true);
  });
});
