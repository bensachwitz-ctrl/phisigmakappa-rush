import { describe, it, expect } from "vitest";

// ── Chapter-site generator: the 4 new white-label config keys ────────────────
// The generator adds these to lib/site-config.ts DEFAULTS. They must default to
// the platform identity / empty so an un-customized chapter (and the apex) is
// byte-identical to the pre-generator render. None require a Prisma change (the
// SiteConfig KV covers them) and the settings route auto-validates *hex keys.

describe("chapter-site generator DEFAULTS", () => {
  it("seeds website.template = 'classic' (the original, unchanged layout)", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    expect(DEFAULTS["website.template"]).toBe("classic");
  });

  it("seeds brand.secondaryHex = platform gold #f59e0b", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    expect(DEFAULTS["brand.secondaryHex"]).toBe("#f59e0b");
    // key ends in "hex" → auto-scrubbed to clean #RRGGBB by the settings route.
    expect(DEFAULTS["brand.secondaryHex"]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("seeds brand.heroImageUrl + website.galleryJson as empty/empty-array", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    expect(DEFAULTS["brand.heroImageUrl"]).toBe("");
    expect(DEFAULTS["website.galleryJson"]).toBe("[]");
    // galleryJson default parses as an empty array (the renderer reads it safely).
    expect(JSON.parse(DEFAULTS["website.galleryJson"])).toEqual([]);
  });

  it("all four new keys exist on the DEFAULTS export", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    for (const key of [
      "website.template",
      "brand.secondaryHex",
      "brand.heroImageUrl",
      "website.galleryJson",
    ]) {
      expect(Object.prototype.hasOwnProperty.call(DEFAULTS, key)).toBe(true);
    }
  });
});
