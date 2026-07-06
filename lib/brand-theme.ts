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
  const clean = input.trim().replace(/^#/, "");
  if (/^[0-9A-Fa-f]{6}$/.test(clean)) return `#${clean}`;
  if (/^[0-9A-Fa-f]{3}$/.test(clean)) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  return fallback;
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
  const brandPrimary = safeHex(cfg["brand.primaryHex"], BRAND_DEFAULTS.primary);
  const brandPrimaryDark = safeHex(cfg["brand.primaryDarkHex"], BRAND_DEFAULTS.primaryDark);
  const brandPrimarySoft = safeHex(cfg["brand.primarySoftHex"], BRAND_DEFAULTS.primarySoft);
  const brandSecondary = safeHex(cfg["brand.secondaryHex"], BRAND_DEFAULTS.secondary);
  const brandPrimaryHsl = hexToHslTriple(brandPrimary);
  return `:root{--brand-primary:${brandPrimary};--brand-primary-dark:${brandPrimaryDark};--brand-primary-soft:${brandPrimarySoft};--brand-secondary:${brandSecondary};--primary:${brandPrimaryHsl};--ring:${brandPrimaryHsl};}`;
}
