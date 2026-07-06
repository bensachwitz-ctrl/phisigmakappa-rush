import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

/**
 * Release-gate fix guard: the bundled iOS shell must theme each chapter from its
 * REAL brand color (and default the picker/pre-login chrome to GS royal-blue),
 * NOT from a 7-color deterministic hash that ignored the chapter's configured
 * brand.primaryHex and could render purple/green/red.
 *
 * We assert against the actual bundled file (mobile-shell/index.html) AND its
 * cap-synced iOS copy (ios/App/App/public/index.html), then evaluate the brand
 * helpers in a sandbox to prove the behavior — not just the source text.
 */

const ROOT = resolve(__dirname, "..");
const SHELL = readFileSync(resolve(ROOT, "mobile-shell/index.html"), "utf8");

describe("bundled iOS shell — brand parity (no 7-color hash)", () => {
  it("removed the rainbow hash palette + hash-based brandFor", () => {
    expect(SHELL).not.toContain("SCHOOL_TINTS");
    // the old per-school hash routing (`hash(ch.school ...) % ...`) is gone
    expect(SHELL).not.toMatch(/hash\(ch\.school/);
    expect(SHELL).not.toContain("#7c3aed"); // purple — never in GS identity
  });

  it("defaults the brand identity to GS royal-blue (+ gold token retained)", () => {
    expect(SHELL).toContain('var GS_BRAND = "#2563eb"');
    expect(SHELL).toContain('GS_BRAND2 = "#1d4ed8"');
    // GS gold token is still defined for the crest/accents.
    expect(SHELL).toContain("--gold:#d4af37");
    // The canonical royal-blue temple navy is still the crest fill.
    expect(SHELL).toContain("#0F2350");
  });

  it("reads the chapter's real brand from the data payload after login", () => {
    // The data-driven adoption path exists and is hex-guarded.
    expect(SHELL).toContain("adoptBrandFromData");
    expect(SHELL).toContain("chapter.brand");
    expect(SHELL).toContain("primaryHex");
  });
});

/**
 * The mobile-shell crest must be the ELEVATED canonical temple (capitals +
 * bases + gold accents + stepped stylobate), identical geometry to the seal
 * SVGs / <GreekstackLogo> / the maskable icon — NOT the old flat-rectangle
 * 0-24 temple the owner flagged as "AI slop". (Cross-surface geometry parity is
 * pinned exhaustively in brand-mark-geometry.test.ts; this guards the SHELL.)
 */
describe("bundled iOS shell — elevated temple crest geometry", () => {
  it("both crests (boot SVG + CREST_SVG string) use the 100-unit grid, not 0-24", () => {
    // Two occurrences: the boot-screen inline SVG + the topbar CREST_SVG string.
    const matches = SHELL.match(/M16 44 L50 22 L84 44 Z/g) || [];
    expect(matches.length).toBe(2);
    // The old flat-column geometry must be gone.
    expect(SHELL).not.toContain("M2.6 8.6 12 3.2l9.4 5.4H2.6Z");
  });

  it("the crest columns have capitals + bases (not plain rectangles)", () => {
    // Leftmost column: capital y52.5 + base y69.7 (×2 — boot + CREST_SVG).
    expect((SHELL.match(/y="52\.5" width="9" height="2\.2"/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((SHELL.match(/y="69\.7" width="9" height="2\.3"/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("the crest carries the gold accents (cornice + medallion + floor)", () => {
    expect(SHELL).toContain("#E8B53A"); // the crest gold accent fill
    expect((SHELL.match(/cx="50" cy="36" r="3"/g) || []).length).toBe(2); // medallion ×2
    expect((SHELL.match(/y="43\.4" width="72" height="2"/g) || []).length).toBe(2); // cornice ×2
  });
});

/**
 * Evaluate the shell's pure brand helpers (safeHex / darken / brandFor) in a VM
 * sandbox to prove RUNTIME behavior, not just the presence of source strings.
 */
/** Extract one `function <name>(...) { ... }` from the shell by brace-balancing
 *  from its declaration, so we evaluate the SHIPPED source verbatim. */
function extractFn(name: string): string {
  const start = SHELL.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`could not locate function ${name} in shell`);
  const braceOpen = SHELL.indexOf("{", start);
  let depth = 0;
  for (let i = braceOpen; i < SHELL.length; i++) {
    const ch = SHELL[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return SHELL.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces extracting ${name}`);
}

function loadBrandHelpers() {
  // The three pure helpers are self-contained (depend only on GS_BRAND/GS_BRAND2
  // + each other), so evaluating them in a sandbox proves the shipped runtime
  // behavior — not just the presence of source strings.
  const src = `
    var GS_BRAND = "#2563eb", GS_BRAND2 = "#1d4ed8";
    ${extractFn("safeHex")}
    ${extractFn("darken")}
    ${extractFn("brandFor")}
    ({ safeHex: safeHex, darken: darken, brandFor: brandFor });
  `;
  return vm.runInNewContext(src) as {
    safeHex: (v: unknown) => string | null;
    darken: (hex: string, f: number) => string;
    brandFor: (ch: unknown) => { primary: string; dark: string };
  };
}

describe("bundled iOS shell — brand helper runtime behavior", () => {
  const H = loadBrandHelpers();

  it("safeHex passes only canonical #RRGGBB and rejects injection", () => {
    expect(H.safeHex("#500000")).toBe("#500000");
    expect(H.safeHex("#ABCDEF")).toBe("#ABCDEF");
    expect(H.safeHex("red; } body{}")).toBeNull();
    expect(H.safeHex("#fff")).toBeNull(); // shorthand not allowed
    expect(H.safeHex("")).toBeNull();
    expect(H.safeHex(null)).toBeNull();
  });

  it("brandFor defaults to GS royal-blue when the chapter has no brand", () => {
    expect(H.brandFor({})).toEqual({ primary: "#2563eb", dark: "#1d4ed8" });
    expect(H.brandFor(null)).toEqual({ primary: "#2563eb", dark: "#1d4ed8" });
    // A registry chapter (no brand field) reads as GreekStack, never a hashed hue.
    expect(H.brandFor({ school: "Some School", subdomain: "xyz" }).primary).toBe("#2563eb");
  });

  it("brandFor honors the chapter's REAL configured brand color", () => {
    const out = H.brandFor({ brand: { primaryHex: "#500000", primaryDarkHex: "#3a0000" } });
    expect(out).toEqual({ primary: "#500000", dark: "#3a0000" });
  });

  it("brandFor derives a dark stop when only a primary is configured", () => {
    const out = H.brandFor({ brand: { primaryHex: "#508000" } });
    expect(out.primary).toBe("#508000");
    expect(H.safeHex(out.dark)).toBe(out.dark); // a valid darker hex, not the default
    expect(out.dark).not.toBe("#1d4ed8");
  });

  it("brandFor ignores a malformed configured color (falls back to GS)", () => {
    const out = H.brandFor({ brand: { primaryHex: "not-a-color" } });
    expect(out).toEqual({ primary: "#2563eb", dark: "#1d4ed8" });
  });
});
