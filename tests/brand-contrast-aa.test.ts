import { describe, it, expect } from "vitest";
import {
  buildBrandThemeStyle,
  ensureAccessiblePrimary,
  contrastRatio,
  hexToRgb,
  relativeLuminance,
} from "@/lib/brand-theme";

// ── White-label contrast floor (WCAG AA) ─────────────────────────────────────
// buildBrandThemeStyle() now feeds the admin brand primary through
// ensureAccessiblePrimary(), which auto-darkens a too-light pick (hue preserved)
// until --brand-primary / --primary / --ring clear 4.5:1 against white. This
// proves a light input like #FFD400 (gold, ~1.43:1 raw) is corrected to an
// AA-passing token without being turned grey or hue-shifted, while colors that
// already pass (the platform default #2563eb, ~5.17:1) pass through untouched.

const WHITE = "#ffffff";

// Pull the emitted --brand-primary hex out of the inline :root{…} style string.
function emittedBrandPrimary(style: string): string {
  const m = style.match(/--brand-primary:(#[0-9a-fA-F]{3,6});/);
  if (!m) throw new Error(`no --brand-primary in style: ${style}`);
  return m[1];
}

// Hue (0–360) of a hex, used only to assert the gold stays gold.
function hueOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h / 6) * 360;
}

describe("ensureAccessiblePrimary (contrast floor)", () => {
  it("(a) darkens light gold #FFD400 to an AA-passing (>=4.5:1) token vs white", () => {
    const corrected = ensureAccessiblePrimary("#FFD400");
    expect(contrastRatio(corrected, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves an already-AA color (platform default #2563eb) unchanged", () => {
    // Sanity: the default already clears 4.5:1, so it must pass through verbatim
    // (this is what keeps brand-default-blue.test.ts green).
    expect(contrastRatio("#2563eb", WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(ensureAccessiblePrimary("#2563eb")).toBe("#2563eb");
  });

  it("(c) preserves hue — corrected gold is still in the yellow/gold family", () => {
    const corrected = ensureAccessiblePrimary("#FFD400");
    const inputHue = hueOf("#FFD400"); // ~50°
    const outHue = hueOf(corrected);
    // Yellow/gold band, and within a few degrees of the input hue — not turned
    // grey (grey would read hue 0 with ~0 saturation) or shifted to blue.
    expect(outHue).toBeGreaterThan(40);
    expect(outHue).toBeLessThan(65);
    expect(Math.abs(outHue - inputHue)).toBeLessThan(8);
    // And it actually got darker than the input (lower luminance).
    expect(relativeLuminance(hexToRgb(corrected))).toBeLessThan(
      relativeLuminance(hexToRgb("#FFD400")),
    );
  });
});

describe("buildBrandThemeStyle emits an AA-passing --brand-primary", () => {
  it("(b) gold brand primary is corrected to AA in the emitted token", () => {
    const style = buildBrandThemeStyle({ "brand.primaryHex": "#FFD400" });
    const primary = emittedBrandPrimary(style);
    expect(contrastRatio(primary, WHITE)).toBeGreaterThanOrEqual(4.5);
    // The raw light gold must NOT be what's emitted.
    expect(primary.toLowerCase()).not.toBe("#ffd400");
  });

  it("the default (no override) still emits the unaltered platform blue", () => {
    const style = buildBrandThemeStyle({});
    expect(style).toContain("--brand-primary:#2563eb;");
  });

  it("a dark admin color that already passes is emitted unchanged", () => {
    // #500000 (Texas A&M maroon) is ~15.7:1 vs white → untouched.
    const style = buildBrandThemeStyle({ "brand.primaryHex": "#500000" });
    expect(style).toContain("--brand-primary:#500000;");
  });
});
