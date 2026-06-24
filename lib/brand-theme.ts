/**
 * lib/brand-theme.ts — pure, dependency-free brand-theme helpers used by
 * app/layout.tsx to build the inline `:root{…}` <style> string injected into the
 * document head. Extracted so the brand-token math (hex validation + hex→HSL +
 * the emitted CSS-var string) is unit-testable in pure-node vitest WITHOUT
 * rendering the server RootLayout tree.
 *
 * Every value is admin-set (cfg) but lands inside a <style> tag, so safeHex is
 * the XSS guard: anything that isn't a clean #RGB/#RRGGBB coerces to the
 * platform default, which is what the renderer would have used anyway.
 */

/** Platform royal-blue + gold defaults (the Greek Stack identity). */
export const BRAND_DEFAULTS = {
  primary: "#2563eb",
  primaryDark: "#1e40af",
  primarySoft: "#eff6ff",
  secondary: "#f59e0b",
} as const;

/**
 * Validate a hex color string (#RGB or #RRGGBB). Defends against admin pasting
 * `red`, `https://…`, JS, or anything that would inject through the inline
 * <style> tag. Non-hex → the supplied fallback.
 */
export function safeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(trimmed)) return trimmed;
  return fallback;
}

/**
 * Parse a validated hex color (#RGB or #RRGGBB) into an [r,g,b] triple of
 * 0–255 integers. Input is always safeHex-validated by the caller.
 */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * WCAG relative luminance of an sRGB color (0 = black, 1 = white). Uses the
 * 0.03928 linearization threshold + 2.4 gamma from the WCAG 2.x definition.
 */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/**
 * WCAG contrast ratio between two hex colors (1:1 .. 21:1). Order-independent.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Convert an [r,g,b] triple (0–255) to an [h,s,l] triple (h:0–360, s/l:0–1). */
function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

/** Convert an [h,s,l] triple (h:0–360, s/l:0–1) to a #RRGGBB hex string. */
function hslToHex([h, s, l]: [number, number, number]): string {
  const hue = ((h % 360) + 360) % 360 / 360;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }
  const toHex = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Guarantee an AA-passing brand primary for use as on-white text / a fillable
 * accent on a white surface. If the supplied hex already clears 4.5:1 against
 * white it is returned unchanged (so the platform default #2563eb — 5.17:1 — and
 * any already-dark brand color are untouched). Otherwise the color is darkened
 * by reducing HSL Lightness in small steps while PRESERVING HUE (and saturation)
 * until it reaches >=4.5:1, so a light input like #FFD400 (gold) yields a darker
 * gold rather than a grey or a hue shift.
 */
export function ensureAccessiblePrimary(hex: string): string {
  const TARGET = 4.5;
  if (contrastRatio(hex, "#ffffff") >= TARGET) return hex;
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  let lightness = l;
  // Step Lightness down in 1% increments (hue + saturation held constant).
  for (let i = 0; i < 100 && lightness > 0; i++) {
    lightness = Math.max(0, lightness - 0.01);
    const candidate = hslToHex([h, s, lightness]);
    if (contrastRatio(candidate, "#ffffff") >= TARGET) return candidate;
  }
  // Hue-preserving fully-dark fallback (saturated black of the same hue).
  return hslToHex([h, s, 0]);
}

/**
 * Convert a validated hex color (#RGB or #RRGGBB) to a space-separated HSL
 * triple ("351 76% 42%") for the shadcn-style `--primary` / `--ring` tokens.
 * Input is always safeHex-validated by the caller.
 */
export function hexToHslTriple(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  const d = max - min;
  if (d !== 0) {
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      default:
        hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Build the inline `:root{…}` theme-style string from a site config. Emits the
 * hex brand tokens (--brand-primary / -dark / -soft / --brand-secondary) plus
 * the derived shadcn HSL tokens (--primary / --ring). An unbranded chapter (and
 * the apex) resolves to the platform royal-blue + gold, identical to today.
 */
export function buildBrandThemeStyle(cfg: Record<string, string>): string {
  const rawPrimary = safeHex(cfg["brand.primaryHex"], BRAND_DEFAULTS.primary);
  // Contrast floor: --brand-primary and the derived --primary/--ring are used as
  // on-white text / focus accents, so a light admin pick (e.g. #FFD400 gold) is
  // auto-darkened (hue preserved) until it clears WCAG AA (>=4.5:1) vs white. A
  // color that already passes (the platform default #2563eb included) is left
  // exactly as-is, so brand-default-blue / brand-secondary tests stay green.
  const brandPrimary = ensureAccessiblePrimary(rawPrimary);
  // --brand-primary-dark is bound (tailwind.config.ts) to text-maroon-400, which
  // is used as on-white INFORMATIONAL TEXT in ~20 portal spots, so it must clear
  // WCAG AA (>=4.5:1) just like --brand-primary. Floor the admin's "Primary dark"
  // pick through the same hue-preserving guard (the platform default #1e40af —
  // ~8.6:1 — and any already-dark pick pass untouched).
  const brandPrimaryDark = ensureAccessiblePrimary(
    safeHex(cfg["brand.primaryDarkHex"], BRAND_DEFAULTS.primaryDark),
  );
  const brandPrimarySoft = safeHex(cfg["brand.primarySoftHex"], BRAND_DEFAULTS.primarySoft);
  const brandSecondary = safeHex(cfg["brand.secondaryHex"], BRAND_DEFAULTS.secondary);
  // Derive the shadcn HSL token from the CONTRAST-CORRECTED hex so --primary /
  // --ring track the accessible value, not the raw input.
  const brandPrimaryHsl = hexToHslTriple(brandPrimary);
  return `:root{--brand-primary:${brandPrimary};--brand-primary-dark:${brandPrimaryDark};--brand-primary-soft:${brandPrimarySoft};--brand-secondary:${brandSecondary};--primary:${brandPrimaryHsl};--ring:${brandPrimaryHsl};}`;
}
