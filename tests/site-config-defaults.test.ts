import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// ── M2: no fabricated default testimonial on a fresh chapter site ────────────
// A net-new chapter must NOT publish a canned quote or an invented author. The
// testimonial defaults OFF and EMPTY; a chapter opts in with a REAL quote+author.
describe("testimonial DEFAULTS — anti-fabrication", () => {
  it("show.testimonial defaults to 'false' (chapter must opt in)", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    expect(DEFAULTS["show.testimonial"]).toBe("false");
  });

  it("testimonial.quote + author default to empty (no canned quote shipped)", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    expect(DEFAULTS["testimonial.quote"]).toBe("");
    expect(DEFAULTS["testimonial.author"]).toBe("");
  });
});

// ── M2 + L1: the testimonial renderer ships no fabricated author/rating ──────
describe("testimonial renderer — no fabricated author fallback or fixed 5/5 stars", () => {
  const src = readFileSync(
    resolve(__dirname, "..", "components/site/templates/section-map.tsx"),
    "utf8",
  );
  // Narrow to the testimonial section so spotlight's <Star> usage is out of scope.
  const block = src.slice(src.indexOf("testimonial:"), src.indexOf("spotlight:"));

  it("does not render the 'A. Mitchell' fabricated author fallback", () => {
    expect(block).not.toContain("A. Mitchell");
  });

  it("does not render a hardcoded [1,2,3,4,5] star row (no rating data model)", () => {
    expect(block).not.toMatch(/\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/);
  });

  it("gates the section on a non-empty quote (blank quote → section hidden)", () => {
    expect(block).toMatch(/testimonial\.quote.*\.trim\(\)\s*!==\s*""/);
  });
});
