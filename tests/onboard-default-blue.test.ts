import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * ── Release-gate guard: ONBOARDING brand default is GS royal-blue ─────────────
 * The onboarding wizard's color pickers (and their WColor fallbacks) used to
 * initialize to Phi-Sig cardinal red (#C8102E / #A20D26 / #FCEFF1). The
 * custom-school / custom-org / skip paths all leave those state values intact and
 * the wizard POSTs primaryColor/darkColor/softColor verbatim to /api/onboard, so
 * a chapter that never touches the pickers would provision with ANOTHER org's red.
 *
 * This asserts against the SHIPPED source: the wizard must default to the GS
 * royal-blue trio (matching lib/site-config.ts DEFAULTS) and must NOT contain the
 * legacy cardinal-red literals anywhere (init OR fallback).
 */

const ROOT = resolve(__dirname, "..");
const WIZARD = readFileSync(resolve(ROOT, "app/onboard/onboard-wizard.tsx"), "utf8");

describe("onboarding wizard — brand default is GS royal-blue (council blocker)", () => {
  it("initializes the color pickers to the royal-blue trio", () => {
    expect(WIZARD).toContain('useState("#2563eb")');
    expect(WIZARD).toContain('useState("#1e40af")');
    expect(WIZARD).toContain('useState("#eff6ff")');
  });

  it("the WColor fallbacks are royal-blue, not cardinal red", () => {
    expect(WIZARD).toContain('fallback="#2563eb"');
    expect(WIZARD).toContain('fallback="#1e40af"');
    expect(WIZARD).toContain('fallback="#eff6ff"');
  });

  it("NO cardinal-red literal survives anywhere in the wizard (init or fallback)", () => {
    // Case-insensitive so #c8102e / #C8102E both fail the gate.
    expect(WIZARD).not.toMatch(/#C8102E/i);
    expect(WIZARD).not.toMatch(/#A20D26/i);
    expect(WIZARD).not.toMatch(/#FCEFF1/i);
  });

  it("the wizard's defaults match lib/site-config.ts DEFAULTS exactly", async () => {
    const { DEFAULTS } = await import("@/lib/site-config");
    expect(WIZARD).toContain(`useState("${DEFAULTS["brand.primaryHex"]}")`);
    expect(WIZARD).toContain(`useState("${DEFAULTS["brand.primaryDarkHex"]}")`);
    expect(WIZARD).toContain(`useState("${DEFAULTS["brand.primarySoftHex"]}")`);
  });
});
