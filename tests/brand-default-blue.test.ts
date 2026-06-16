import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Council blocker: BRAND-RED → ROYAL-BLUE DEFAULT ──────────────────────────
// lib/site-config.ts DEFAULTS now seed the GS royal-blue platform identity for
// an unbranded/unconfigured chapter (was the legacy Phi-Sig garnet #C8102E).
// This proves:
//   (1) the raw DEFAULTS export carries the royal-blue trio, and
//   (2) the per-tenant web manifest's theme_color resolves to royal-blue for an
//       unbranded chapter (no brand.primaryHex row in the DB), because
//       getSiteConfig() merges DEFAULTS — i.e. the live theme_color the OS reads
//       on "Add to Home Screen" is blue, not garnet.

describe("brand DEFAULTS are royal-blue (council blocker)", () => {
  it("the raw DEFAULTS export is royal-blue, not garnet", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    expect(DEFAULTS["brand.primaryHex"]).toBe("#2563eb");
    expect(DEFAULTS["brand.primaryDarkHex"]).toBe("#1e40af");
    expect(DEFAULTS["brand.primarySoftHex"]).toBe("#eff6ff");
    // The legacy garnet must be gone from the defaults.
    expect(DEFAULTS["brand.primaryHex"]).not.toBe("#C8102E");
  });
});

// ── Manifest theme_color resolves blue for an UNBRANDED chapter ───────────────
const mocks = vi.hoisted(() => ({
  mockSiteConfigFindMany: vi.fn(),
  mockHeadersGet: vi.fn(),
}));

// The manifest reads getSiteConfig() (which findMany()s SiteConfig + merges
// DEFAULTS) and getSubdomain(host). We mock the DB to return NO brand row (an
// unbranded chapter) and a chapter Host so the route takes the per-tenant branch.
vi.mock("@/lib/prisma", () => ({
  prisma: { siteConfig: { findMany: mocks.mockSiteConfigFindMany } },
  // A chapter subdomain host → getSubdomain returns "demo" (non-apex), so the
  // route reads the chapter brand color instead of the apex's fixed slate.
  getSubdomain: (host: string | null) =>
    host && host !== "greekstack.vercel.app" ? host.split(".")[0] : null,
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: mocks.mockHeadersGet }),
}));

import { GET as getManifest } from "@/app/manifest.webmanifest/route";

describe("manifest theme_color for an unbranded chapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    // Chapter host (non-apex) so the per-tenant branch runs.
    mocks.mockHeadersGet.mockImplementation((k: string) =>
      k === "host" ? "demo.greekstack.vercel.app" : null,
    );
    // No brand.* rows in the DB → getSiteConfig falls back to DEFAULTS.
    mocks.mockSiteConfigFindMany.mockResolvedValue([]);
  });

  it("resolves royal-blue (#2563eb) when the chapter has no brand override", async () => {
    const res = await getManifest();
    const body = await res.json();
    expect(body.theme_color.toLowerCase()).toBe("#2563eb");
    expect(body.theme_color).not.toBe("#C8102E");
  });

  it("still honors an explicit chapter brand override", async () => {
    // A chapter that set Texas A&M maroon keeps its color — DEFAULTS only fill gaps.
    mocks.mockSiteConfigFindMany.mockResolvedValue([
      { key: "brand.primaryHex", value: "#500000" },
    ]);
    const res = await getManifest();
    const body = await res.json();
    expect(body.theme_color.toLowerCase()).toBe("#500000");
  });
});
