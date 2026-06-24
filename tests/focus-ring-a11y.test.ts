import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── L2: focus-ring contrast (WCAG 2.2 1.4.11 / 2.4.13) + interactive-card a11y ─
// --ring tracks the per-chapter --primary (lib/brand-theme.ts injects
// --ring:<brandPrimaryHsl>), so a focus ring whose ONLY color is --ring is the
// same hue as a red-filled active control → invisible. The global focus rule must
// layer a --background-colored offset band BETWEEN the control and the --ring
// outer ring so the indicator always contrasts. The EmptyState CTA must not ring
// in its own fill color. An interactive Tilt3DCard must be keyboard-operable.
// Static source-pins (no DOM/CSSOM harness in this node suite).

const ROOT = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("global focus ring — guaranteed-contrast offset (globals.css)", () => {
  const css = read("app/globals.css");
  const rule = css.slice(css.indexOf("*:focus-visible"), css.indexOf("*:focus-visible") + 400);

  it("layers a background-colored offset ring inside the --ring outer ring", () => {
    // box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))
    expect(rule).toMatch(/box-shadow:[\s\S]*hsl\(var\(--background\)\)[\s\S]*hsl\(var\(--ring\)\)/);
  });

  it("keeps an outline fallback for box-shadow-suppressing modes", () => {
    expect(rule).toMatch(/outline:\s*2px solid hsl\(var\(--ring\)\)/);
  });

  it("honors forced-colors (Windows High Contrast) with a system focus color", () => {
    expect(css).toMatch(/@media\s*\(forced-colors:\s*active\)/);
  });
});

describe("EmptyState CTA — ring contrasts with the fill (empty-state.tsx)", () => {
  const src = read("components/admin/empty-state.tsx");

  it("no longer rings in phisig-red on a phisig-red fill", () => {
    expect(src).not.toContain("focus-visible:ring-phisig-red/40");
  });

  it("uses a high-contrast ring (ring-foreground) + a white ring offset", () => {
    expect(src).toContain("focus-visible:ring-foreground");
    expect(src).toContain("focus-visible:ring-offset-2");
  });
});

describe("Tilt3DCard — keyboard-operable when interactive (tilt-3d-card.tsx)", () => {
  const src = read("components/site/anim/tilt-3d-card.tsx");

  it("adds role=button + tabIndex + Enter/Space keydown when onClick is provided", () => {
    expect(src).toMatch(/role:\s*"button"/);
    expect(src).toMatch(/tabIndex:\s*0/);
    expect(src).toMatch(/e\.key === "Enter" \|\| e\.key === " "/);
  });

  it("spreads the interactive props into BOTH the static and the 3D branch", () => {
    const occurrences = (src.match(/\{\.\.\.interactiveProps\}/g) || []).length;
    expect(occurrences).toBe(2);
  });

  it("only attaches the interactive props when onClick exists (no onClick → plain container)", () => {
    expect(src).toMatch(/const interactiveProps = onClick\s*\?/);
  });
});
