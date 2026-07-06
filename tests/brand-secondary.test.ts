import { describe, it, expect } from "vitest";
import {
  buildBrandThemeStyle,
  safeHex,
  BRAND_DEFAULTS,
} from "@/lib/brand-theme";

// ── Secondary / accent (gold) brand token wiring ─────────────────────────────
// The Modern + Bold chapter-site templates read --brand-secondary (the platform
// gold). app/layout.tsx injects it via buildBrandThemeStyle into the inline
// <style> tag. These prove the token is emitted, defaults to platform gold for an
// unset/apex chapter, and that a hostile/invalid value coerces to the default
// (no <style> injection) — i.e. Classic + apex stay pixel-identical to today.

describe("safeHex", () => {
  it("returns the platform gold default for missing/empty input", () => {
    expect(safeHex(undefined, BRAND_DEFAULTS.secondary)).toBe("#f59e0b");
    expect(safeHex("", BRAND_DEFAULTS.secondary)).toBe("#f59e0b");
  });

  it("passes a valid #RRGGBB (and #RGB) through, trimmed", () => {
    expect(safeHex("#500000", "#f59e0b")).toBe("#500000");
    expect(safeHex("  #abc  ", "#f59e0b")).toBe("#aabbcc");
  });

  it("coerces a hostile / non-hex value to the default (no injection)", () => {
    expect(safeHex("red;}body{display:none", "#f59e0b")).toBe("#f59e0b");
    expect(safeHex("</style><script>", "#f59e0b")).toBe("#f59e0b");
    expect(safeHex("javascript:alert(1)", "#f59e0b")).toBe("#f59e0b");
  });
});

describe("buildBrandThemeStyle", () => {
  it("emits --brand-secondary (the gold token) for the Modern/Bold templates", () => {
    const style = buildBrandThemeStyle({});
    expect(style).toContain("--brand-secondary:#f59e0b;");
  });

  it("an unbranded chapter resolves to platform royal-blue + gold (identical to today)", () => {
    const style = buildBrandThemeStyle({});
    expect(style).toContain("--brand-primary:#2563eb;");
    expect(style).toContain("--brand-primary-dark:#1e40af;");
    expect(style).toContain("--brand-primary-soft:#eff6ff;");
    expect(style).toContain("--brand-secondary:#f59e0b;");
    // Derived shadcn HSL token still tracks the primary.
    expect(style).toMatch(/--primary:\d+ \d+% \d+%;/);
  });

  it("honors a chapter's own secondary override", () => {
    const style = buildBrandThemeStyle({ "brand.secondaryHex": "#d4af37" });
    expect(style).toContain("--brand-secondary:#d4af37;");
  });

  it("a bad secondary hex coerces back to platform gold (defense-in-depth)", () => {
    const style = buildBrandThemeStyle({ "brand.secondaryHex": "gold;}x{" });
    expect(style).toContain("--brand-secondary:#f59e0b;");
    // The hostile payload never reaches the emitted style string.
    expect(style).not.toContain("gold;}x{");
  });
});
