import { describe, it, expect } from "vitest";
import { makeCustomBrand } from "@/app/app/_demo/mock-data";
import { contrastRatio, ensureAccessiblePrimary } from "@/lib/brand-theme";

// ── Demo custom-brand AA contrast floor (AOTY council finding) ────────────────
// R3 source fix: app/app/_demo/mock-data.ts makeCustomBrand() now runs the raw
// founder-picked primaryColor through ensureAccessiblePrimary() — the SAME WCAG
// helper the live theme uses (lib/brand-theme) — before returning the brand. The
// reason: every demo surface paints text-white on
// `style={{ backgroundColor: brand.primaryColor }}`, so a light founder pick
// (e.g. #fbbf24 amber, ~1.6:1 raw vs white) would render unreadable white-on-
// light text. Flooring at the brand source means the returned primaryColor is
// guaranteed >=4.5:1 against white.
//
// This is a BEHAVIORAL test on the real makeCustomBrand output, verified with the
// SAME contrastRatio() the app ships (not a re-implemented ratio), so it fails
// loudly if a future edit drops the ensureAccessiblePrimary() call.
//
// NOTE on the signature: makeCustomBrand takes the founder-input OBJECT
// `{ name, letters, primaryColor, secondaryColor? }`, not a bare hex — so the
// brief's `makeCustomBrand('#fbbf24')` is exercised as
// `makeCustomBrand({ ..., primaryColor: '#fbbf24' }).primaryColor`.

// "white" the demo surfaces use as the text color over the brand fill. AA for
// normal text is 4.5:1; we test against pure white (#ffffff), the worst case for
// a light fill (a slightly off-white like #fefefd only makes the ratio higher).
const WHITE = "#ffffff";

function customPrimary(hex: string): string {
  return makeCustomBrand({
    name: "Test Chapter",
    letters: "ΦΣΚ",
    primaryColor: hex,
  }).primaryColor;
}

// A spread of LIGHT hexes that all fail AA raw (white text on them is illegible).
// Each must be corrected by makeCustomBrand to clear 4.5:1.
const LIGHT_INPUTS = [
  "#fbbf24", // amber-400 (the brief's example)  ~1.6:1 raw
  "#FFD400", // bright gold                       ~1.4:1 raw
  "#22d3ee", // cyan-400                          ~1.9:1 raw
  "#4ade80", // green-400                         ~1.8:1 raw
  "#f9a8d4", // pink-300 (very light)             ~1.4:1 raw
];

describe("demo makeCustomBrand: primaryColor is WCAG-AA over white", () => {
  // Guard rail: the inputs really ARE failing AA raw, so the assertions below are
  // discriminating (a no-op makeCustomBrand would fail them).
  it("the chosen light inputs fail AA against white BEFORE correction", () => {
    for (const hex of LIGHT_INPUTS) {
      expect(
        contrastRatio(hex, WHITE),
        `${hex} should be a too-light (<4.5:1) input to be a meaningful test`,
      ).toBeLessThan(4.5);
    }
  });

  it("#fbbf24 (brief example) yields a primaryColor that clears 4.5:1 vs white", () => {
    const primary = customPrimary("#fbbf24");
    expect(contrastRatio(primary, WHITE)).toBeGreaterThanOrEqual(4.5);
    // And the raw too-light value is NOT what's returned.
    expect(primary.toLowerCase()).not.toBe("#fbbf24");
  });

  it("every light input is floored to an AA-passing primaryColor", () => {
    for (const hex of LIGHT_INPUTS) {
      const primary = customPrimary(hex);
      expect(
        contrastRatio(primary, WHITE),
        `${hex} -> ${primary} must clear 4.5:1 vs white`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses the app's own ensureAccessiblePrimary helper (output matches)", () => {
    // The returned primaryColor for a light pick equals ensureAccessiblePrimary
    // of the raw hex — pins the fix to the shared helper, not a bespoke darken.
    for (const hex of LIGHT_INPUTS) {
      expect(customPrimary(hex)).toBe(ensureAccessiblePrimary(hex));
    }
  });

  it("an already-AA dark pick passes through unchanged", () => {
    // #500000 (maroon, ~15.7:1 vs white) already clears AA → returned verbatim.
    expect(contrastRatio("#500000", WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(customPrimary("#500000").toLowerCase()).toBe("#500000");
  });

  it("an invalid hex falls back to the legible #6366F1 default (still floored)", () => {
    // makeCustomBrand replaces a non-#rrggbb input with the indigo fallback, then
    // floors it; the result must still be AA so white text stays legible.
    const primary = customPrimary("not-a-hex");
    expect(contrastRatio(primary, WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});
