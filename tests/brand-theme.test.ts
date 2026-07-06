import { describe, it, expect } from "vitest";
import { safeHex, hexToHslTriple, buildBrandThemeStyle, BRAND_DEFAULTS } from "@/lib/brand-theme";

describe("brand-theme helpers", () => {
  describe("safeHex", () => {
    it("returns fallback for undefined input", () => {
      expect(safeHex(undefined, "#000000")).toBe("#000000");
    });

    it("returns fallback for empty input", () => {
      expect(safeHex("", "#000000")).toBe("#000000");
    });

    it("accepts valid 6-character hex strings with or without #", () => {
      expect(safeHex("#1a2B3c", "#000000")).toBe("#1a2B3c");
      expect(safeHex("1a2B3c", "#000000")).toBe("#1a2B3c");
      expect(safeHex("#FFFFFF", "#000000")).toBe("#FFFFFF");
      expect(safeHex("FFFFFF", "#000000")).toBe("#FFFFFF");
      expect(safeHex("123456", "#000000")).toBe("#123456");
    });

    it("accepts valid 3-character hex strings and expands them to 6 chars", () => {
      expect(safeHex("#1a2", "#000000")).toBe("#11aa22");
      expect(safeHex("1a2", "#000000")).toBe("#11aa22");
      expect(safeHex("#FFF", "#000000")).toBe("#FFFFFF");
      expect(safeHex("FFF", "#000000")).toBe("#FFFFFF");
      expect(safeHex("#000", "#FFFFFF")).toBe("#000000");
    });

    it("rejects invalid hex strings and returns fallback", () => {
      expect(safeHex("red", "#000000")).toBe("#000000");
      expect(safeHex("#12", "#000000")).toBe("#000000"); // Too short
      expect(safeHex("12", "#000000")).toBe("#000000"); // Too short
      expect(safeHex("#1234", "#000000")).toBe("#000000"); // Invalid length
      expect(safeHex("#12345", "#000000")).toBe("#000000"); // Invalid length
      expect(safeHex("#1234567", "#000000")).toBe("#000000"); // Too long
      expect(safeHex("#GHIJKL", "#000000")).toBe("#000000"); // Invalid characters
    });

    it("handles whitespace correctly by trimming", () => {
      expect(safeHex("  #123456  ", "#000000")).toBe("#123456");
      expect(safeHex("  123456  ", "#000000")).toBe("#123456");
      expect(safeHex("\n#1a2B3c\t", "#000000")).toBe("#1a2B3c");
    });
  });

  describe("hexToHslTriple", () => {
    it("converts #000000 to HSL", () => {
      expect(hexToHslTriple("#000000")).toBe("0 0% 0%");
    });

    it("converts #FFFFFF to HSL", () => {
      expect(hexToHslTriple("#FFFFFF")).toBe("0 0% 100%");
    });

    it("converts 3-char hex to HSL correctly", () => {
      expect(hexToHslTriple("#F00")).toBe("0 100% 50%");
    });

    it("converts primary colors to HSL", () => {
      expect(hexToHslTriple("#FF0000")).toBe("0 100% 50%");
      expect(hexToHslTriple("#00FF00")).toBe("120 100% 50%");
      expect(hexToHslTriple("#0000FF")).toBe("240 100% 50%");
    });

    it("converts mixed colors accurately", () => {
      // 0.5, 0.5, 0.5 -> hsl(0, 0%, 50%)
      expect(hexToHslTriple("#808080")).toBe("0 0% 50%");
      // royal blue #2563eb
      expect(hexToHslTriple("#2563eb")).toBe("221 83% 53%");
    });

    it("handles r = max, g < b case correctly", () => {
      // Need a color where r is max, and g < b
      // e.g. rgb(255, 0, 128) -> #FF0080
      expect(hexToHslTriple("#FF0080")).toBe("330 100% 50%");
    });
  });

  describe("buildBrandThemeStyle", () => {
    it("uses defaults when config is empty", () => {
      const style = buildBrandThemeStyle({});
      expect(style).toContain(`--brand-primary:${BRAND_DEFAULTS.primary}`);
      expect(style).toContain(`--brand-primary-dark:${BRAND_DEFAULTS.primaryDark}`);
      expect(style).toContain(`--brand-primary-soft:${BRAND_DEFAULTS.primarySoft}`);
      expect(style).toContain(`--brand-secondary:${BRAND_DEFAULTS.secondary}`);

      const primaryHsl = hexToHslTriple(BRAND_DEFAULTS.primary);
      expect(style).toContain(`--primary:${primaryHsl}`);
      expect(style).toContain(`--ring:${primaryHsl}`);
    });

    it("overrides with provided valid hex colors", () => {
      const cfg = {
        "brand.primaryHex": "#ff0000",
        "brand.primaryDarkHex": "#aa0000",
        "brand.primarySoftHex": "#ffaaaa",
        "brand.secondaryHex": "#00ff00",
      };
      const style = buildBrandThemeStyle(cfg);
      expect(style).toContain(`--brand-primary:#eb0000`);
      expect(style).toContain(`--brand-primary-dark:#aa0000`);
      expect(style).toContain(`--brand-primary-soft:#ffaaaa`);
      expect(style).toContain(`--brand-secondary:#00ff00`);

      const primaryHsl = hexToHslTriple("#eb0000");
      expect(style).toContain(`--primary:${primaryHsl}`);
      expect(style).toContain(`--ring:${primaryHsl}`);
    });

    it("falls back to defaults when invalid hex colors are provided", () => {
      const cfg = {
        "brand.primaryHex": "invalid",
        "brand.primaryDarkHex": "also-invalid",
      };
      const style = buildBrandThemeStyle(cfg);
      expect(style).toContain(`--brand-primary:${BRAND_DEFAULTS.primary}`);
      expect(style).toContain(`--brand-primary-dark:${BRAND_DEFAULTS.primaryDark}`);
    });
  });
});
