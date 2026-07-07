import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeHex, hexToHslTriple, buildBrandThemeStyle, BRAND_DEFAULTS } from "@/lib/brand-theme";

const ROOT = resolve(__dirname, "..");
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

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

// ── P1 #5 — the primary CTA follows the brand (no two-tone) ───────────────────
// The theme injects --primary/--ring per chapter (asserted above). This block
// pins the two remaining leaks that made a rebranded chapter render half-Phi-Sig:
//   (a) the STATIC :root fallback in globals.css was cardinal red (351 76% 42%)
//       while the injected default is platform blue — so a primary CTA flashed
//       red before the per-chapter <style> applied. Static + injected must agree.
//   (b) the default <Button> hover reached for phisig-red-dark instead of the
//       --primary token, drifting the hover state off the base hue.
// These are source-pins (the CSS/Tailwind class strings aren't executable in the
// node suite), and they are RED→GREEN: before the fix globals.css held
// "351 76% 42%" and button.tsx held "hover:bg-phisig-red-dark".
describe("P1 #5 — static :root defaults agree with the injected brand default", () => {
  const globals = readSrc("app/globals.css");
  const platformHsl = hexToHslTriple(BRAND_DEFAULTS.primary); // "221 83% 53%"

  it("the legacy cardinal-red default is gone from :root", () => {
    expect(globals).not.toContain("351 76% 42%");
  });

  it("globals.css :root --primary fallback is the platform blue triple", () => {
    expect(globals).toContain(`--primary: ${platformHsl};`);
  });

  it("globals.css :root --ring fallback is the platform blue triple", () => {
    expect(globals).toContain(`--ring: ${platformHsl};`);
  });

  it("the injected default (buildBrandThemeStyle({})) --primary matches the static fallback", () => {
    const style = buildBrandThemeStyle({});
    expect(style).toContain(`--primary:${platformHsl};`);
    expect(style).toContain(`--ring:${platformHsl};`);
    // Same triple in the static globals fallback → static and injected agree.
    expect(globals).toContain(`--primary: ${platformHsl};`);
  });
});

describe("P1 #5 — the default Button CTA is driven by the --primary token", () => {
  const button = readSrc("components/ui/button.tsx");

  it("the default variant fills with bg-primary and hovers on the same token", () => {
    expect(button).toContain("bg-primary text-primary-foreground");
    expect(button).toContain("hover:bg-primary/90");
  });

  it("the default CTA no longer reaches for the phisig-red-dark token", () => {
    expect(button).not.toContain("hover:bg-phisig-red-dark");
  });
});

// ── P1 #6 — the header/footer Wordmark is config-driven, not hardcoded Phi Sig ─
// The <Wordmark> in the site nav + footer reads chapter identity from config
// (via useChapterIdentity) and renders THOSE letters/school. The bundled Phi Sig
// shield asset is used ONLY behind the isPhiSig gate; every other chapter renders
// its own uploaded logo or the auto-branded generic shield. These source-pins
// lock the white-label behavior so a regression to a hardcoded ΦΣΚ / USC / Phi
// Sig-only mark fails CI.
describe("P1 #6 — Wordmark renders config letters/school, not the reference chapter", () => {
  const wordmark = readSrc("components/brand/wordmark.tsx");

  it("reads the chapter's letters + school from config context", () => {
    expect(wordmark).toContain("useChapterIdentity");
    expect(wordmark).toMatch(/fraternityLetters/);
    expect(wordmark).toMatch(/greekLettersGlyphs/);
    expect(wordmark).toMatch(/schoolName/);
    expect(wordmark).toMatch(/schoolShort/);
  });

  it("does not hardcode the reference chapter's ΦΣΚ letters or USC school", () => {
    expect(wordmark).not.toMatch(/ΦΣΚ/);
    expect(wordmark).not.toMatch(/\bUSC\b/);
  });

  it("uses the Phi Sig shield asset only behind the isPhiSig gate, with a generic + logo fallback", () => {
    expect(wordmark).toContain("isPhiSig");
    // Non-Phi-Sig chapters get their own logo or the auto-branded generic shield.
    expect(wordmark).toContain("logoUrl");
    expect(wordmark).toContain("renderGenericShield");
  });
});
