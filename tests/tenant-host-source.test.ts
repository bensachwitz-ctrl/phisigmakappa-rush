import { describe, it, expect } from "vitest";
import { getSubdomain, getLeadingLabel, isApexHost, APEX_HOSTS } from "@/lib/tenant-host";
import { getSubdomain as prismaGetSubdomain } from "@/lib/prisma";
import { SUBDOMAIN_CASES } from "./subdomain-cases";

// ── round-4 (low) DEDUP PIN — the canonical tenant-host source ───────────────
// The apex-host set + suffix-strip chain used to be duplicated VERBATIM in
// getSubdomain (lib/prisma.ts), getRegistrySubdomain (lib/prisma.ts) and
// getSubdomainEdge (lib/auth-edge.ts). They now all delegate to ONE edge-safe
// source, lib/tenant-host. This test pins that canonical source against the
// SAME case matrix the prisma/edge tests use, and proves the prisma export is a
// pass-through of it (so a future re-inlining that drifts fails here too).

describe("tenant-host (canonical source) — getSubdomain matrix", () => {
  it.each(SUBDOMAIN_CASES)("host=$host ($note) → $expected", ({ host, expected }) => {
    expect(getSubdomain(host)).toBe(expected);
  });

  it("lib/prisma.getSubdomain is a pass-through of the canonical source", () => {
    for (const { host } of SUBDOMAIN_CASES) {
      expect(prismaGetSubdomain(host)).toBe(getSubdomain(host));
    }
  });
});

describe("tenant-host — isApexHost / getLeadingLabel", () => {
  it("every APEX_HOST is detected as apex and yields no subdomain", () => {
    for (const h of APEX_HOSTS) {
      expect(isApexHost(h)).toBe(true);
      expect(getLeadingLabel(h)).toBeNull();
      expect(getSubdomain(h)).toBeNull();
    }
  });

  it("a tenant host is not apex and yields its leading label (hyphens preserved)", () => {
    expect(isApexHost("alpha-beta.greekstack.vercel.app")).toBe(false);
    // getLeadingLabel preserves the hyphen ("alpha-beta"); getSubdomain sanitizes it.
    expect(getLeadingLabel("alpha-beta.greekstack.vercel.app")).toBe("alpha-beta");
    expect(getSubdomain("alpha-beta.greekstack.vercel.app")).toBe("alpha_beta");
  });

  it("null host is treated as apex", () => {
    expect(isApexHost(null)).toBe(true);
    expect(getLeadingLabel(null)).toBeNull();
  });
});
