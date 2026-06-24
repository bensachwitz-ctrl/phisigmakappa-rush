import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrastRatio } from "@/lib/brand-theme";

/**
 * BRAND-MARK GEOMETRY GATE — pins the ONE canonical elevated-temple mark.
 * ----------------------------------------------------------------------
 * The owner re-approved the classical temple but rejected the prior execution
 * as "generic AI slop" (flat-rectangle columns on a muddy cream raster). The
 * elevated mark adds the craft tells: columns WITH capitals + bases, a gold
 * cornice + medallion (oculus) + architrave + floor, and a stepped stylobate.
 *
 * This gate proves:
 *   1. Every surface that paints the mark (the seal SVGs, <GreekstackLogo>, the
 *      maskable PWA icon, and the mobile-shell crest) carries the SAME canonical
 *      geometry on the 100-unit grid — so the mark can NEVER drift.
 *   2. The craft features (capitals, bases, gold accents, stepped stylobate)
 *      are present everywhere — a regression back to plain rectangles fails CI.
 *   3. The cream navy-temple raster is gone (no source reference to it).
 *   4. The navy/ivory/gold palettes all clear WCAG AA.
 */

const ROOT = resolve(__dirname, "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const SEAL_NAVY = read("brand/greekstack-seal.svg");
const SEAL_LIGHT = read("brand/greekstack-seal-light.svg");
const LOGO = read("components/brand/greekstack-logo.tsx");
const MASKABLE = read("app/maskable-icon/route.tsx");
const SHELL = read("mobile-shell/index.html");

// ── The canonical geometry fingerprints (the 100-unit grid) ──────────────────
// These exact path/rect strings are the load-bearing shape. If any surface
// drifts from them, this gate fails and the mark de-syncs.
const PEDIMENT = "M16 44 L50 22 L84 44 Z";
const ENTABLATURE = '"14" y="46.5" width="72" height="5"';
// A column's capital + shaft + base at shaft-x 23 (the leftmost column).
const CAPITAL_23 = '"21.5" y="52.5" width="9" height="2.2"';
const SHAFT_23 = '"23" y="54.7" width="6" height="15"';
const BASE_23 = '"21.5" y="69.7" width="9" height="2.3"';
// The four shafts sit at x = 23, 39, 55, 71 (w6 each).
const SHAFTS = [
  '"23" y="54.7" width="6" height="15"',
  '"39" y="54.7" width="6" height="15"',
  '"55" y="54.7" width="6" height="15"',
  '"71" y="54.7" width="6" height="15"',
];
// Gold accents + stepped stylobate.
const GOLD_CORNICE = '"14" y="43.4" width="72" height="2"';
const GOLD_MEDALLION = 'cx="50" cy="36" r="3"';
const GOLD_ARCHITRAVE = '"16" y="51" width="68" height="1"';
const GOLD_FLOOR = '"13" y="79.9" width="74" height="1.1"';
const STYLOBATE_STEP1 = '"18" y="72.5" width="64" height="3.2"';
const STYLOBATE_STEP2 = '"13" y="76.2" width="74" height="3.4"';

const SURFACES: Array<[string, string]> = [
  ["seal (navy)", SEAL_NAVY],
  ["seal (light)", SEAL_LIGHT],
  ["GreekstackLogo", LOGO],
  ["maskable icon", MASKABLE],
  ["mobile-shell crest", SHELL],
];

describe("brand mark — one canonical elevated-temple geometry on every surface", () => {
  it.each(SURFACES)("%s carries the canonical pediment + entablature", (_name, src) => {
    expect(src).toContain(PEDIMENT);
    expect(src).toContain(ENTABLATURE);
  });

  it.each(SURFACES)("%s has all four column shafts at x=23/39/55/71", (_name, src) => {
    for (const shaft of SHAFTS) expect(src).toContain(shaft);
  });

  it.each(SURFACES)("%s gives columns CAPITALS + BASES (not plain rectangles)", (_name, src) => {
    // The capital + base of the leftmost column must be present everywhere —
    // this is the single biggest "crafted vs AI-slop" tell.
    expect(src).toContain(CAPITAL_23);
    expect(src).toContain(BASE_23);
    expect(src).toContain(SHAFT_23);
  });

  it.each(SURFACES)("%s has the restrained gold accents + stepped stylobate", (_name, src) => {
    expect(src).toContain(GOLD_CORNICE);
    expect(src).toContain(GOLD_MEDALLION);
    expect(src).toContain(GOLD_ARCHITRAVE);
    expect(src).toContain(GOLD_FLOOR);
    expect(src).toContain(STYLOBATE_STEP1);
    expect(src).toContain(STYLOBATE_STEP2);
  });
});

describe("brand mark — the cream AI-slop raster is gone", () => {
  it("no surface references the deleted cream temple raster", () => {
    for (const [, src] of SURFACES) {
      // The only allowed mention is a comment in the generators documenting the
      // replacement; the rendering surfaces must not reference the PNG at all.
      expect(src).not.toMatch(/greekstack-mark(-alt)?\.png["')]/);
    }
  });

  it("the React logo renders an inline vector, not an <img> raster", () => {
    expect(LOGO).toContain("<svg");
    expect(LOGO).toContain('viewBox="0 0 100 100"');
    expect(LOGO).not.toMatch(/<img[\s>]/);
  });
});

describe("brand mark — two presentations, one geometry", () => {
  it("the navy seal uses the deep-navy tile + ivory temple + gold accents", () => {
    expect(SEAL_NAVY).toContain('fill="#0B1B3A"'); // tile
    expect(SEAL_NAVY).toContain('fill="#F4F1E6"'); // temple
    expect(SEAL_NAVY).toContain('fill="#E8B53A"'); // gold
  });

  it("the light tile uses ivory tile + navy temple + AA-floored gold", () => {
    expect(SEAL_LIGHT).toContain('fill="#F7F5EE"'); // tile
    expect(SEAL_LIGHT).toContain('fill="#16264E"'); // temple
    expect(SEAL_LIGHT).toContain('fill="#A8780F"'); // gold (AA-floored)
  });

  it("the React component defines both LIGHT and DARK palettes", () => {
    expect(LOGO).toMatch(/tile:\s*"#F7F5EE"/); // light tile
    expect(LOGO).toMatch(/temple:\s*"#16264E"/); // light temple
    expect(LOGO).toMatch(/gold:\s*"#A8780F"/); // light gold (AA-floored)
    expect(LOGO).toMatch(/tile:\s*"#0B1B3A"/); // dark tile
    expect(LOGO).toMatch(/temple:\s*"#F4F1E6"/); // dark temple
    expect(LOGO).toMatch(/gold:\s*"#E8B53A"/); // dark gold
  });
});

describe("brand mark — palettes clear WCAG AA", () => {
  it("navy seal: ivory temple + gold accents read on the deep-navy tile", () => {
    // Primary figure (temple) must clear text-grade AA (4.5:1); gold accents
    // must clear graphical-object AA (3:1).
    expect(contrastRatio("#F4F1E6", "#0B1B3A")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#E8B53A", "#0B1B3A")).toBeGreaterThanOrEqual(3);
  });

  it("light tile: navy temple + gold accents read on the ivory tile", () => {
    expect(contrastRatio("#16264E", "#F7F5EE")).toBeGreaterThanOrEqual(4.5);
    // The AA-floored gold #A8780F clears 3:1 as a graphical object on ivory;
    // the prior #C8901C (2.58:1) would fail — guard the regression.
    expect(contrastRatio("#A8780F", "#F7F5EE")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio("#C8901C", "#F7F5EE")).toBeLessThan(3);
  });
});
