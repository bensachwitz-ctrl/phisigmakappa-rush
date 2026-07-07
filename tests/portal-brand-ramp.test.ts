import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrastRatio } from "@/lib/brand-theme";

// ── P1 #7 — the authed portal palette follows the brand on EVERY step ─────────
// The maroon/cream Tailwind ramps paint the logged-in member + alumni portals.
// R49 rebound only the mid band (400–700) to --brand-primary*, leaving the
// STRUCTURAL steps hardcoded: the 50–300 tints were a fixed COOL-BLUE, the
// 750–950 ink a fixed NAVY, and the cream ramp a fixed warm PARCHMENT. On a
// non-blue chapter that produced brand accents sitting on the wrong-hue tints
// with navy body text — the half-Phi-Sig / two-tone bug on the authed surface.
//
// The fix makes the structural steps HUE-NEUTRAL (low-sat color-mix that pulls a
// whisper of the LIVE --brand-primary into an otherwise neutral gray / near-black
// ink), keeps the accent band inside the live brand colors, and drives the Alumni
// (cream) accent from --brand-secondary. These are source-pins on tailwind.config
// (the ramp is a build-time color map, not executable in the node suite) and are
// RED→GREEN: before the fix the config held the exact fixed hexes asserted-absent
// below.

const ROOT = resolve(__dirname, "..");
const CONFIG = readFileSync(resolve(ROOT, "tailwind.config.ts"), "utf8");

// Grab the object literal body of a named ramp (`maroon: { … }`) so assertions
// are scoped to that ramp, not the whole file.
function rampBody(name: string): string {
  const m = CONFIG.match(new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
  if (!m) throw new Error(`ramp ${name} not found in tailwind.config.ts`);
  return m[1];
}

const MAROON = rampBody("maroon");
const CREAM = rampBody("cream");

describe("P1 #7 — maroon structural tints are hue-neutral, not fixed cool-blue", () => {
  // The legacy fixed cool-blue tints (a navy commitment) must be gone.
  const LEGACY_BLUE_TINTS = ["#eff5ff", "#dbe7fe", "#bcd2fb", "#93b4f8"];
  it.each(LEGACY_BLUE_TINTS)("no longer hardcodes the cool-blue tint %s", (hex) => {
    expect(MAROON).not.toContain(hex);
  });

  it("tints 50–300 derive from the live --brand-primary via color-mix", () => {
    for (const step of ["50:", "100:", "200:", "300:"]) {
      const line = MAROON.split("\n").find((l) => l.trim().startsWith(step)) || "";
      expect(line).toContain("color-mix");
      expect(line).toContain("--brand-primary");
    }
  });
});

describe("P1 #7 — maroon ink (900) is near-neutral, not a fixed navy", () => {
  it("no longer hardcodes the fixed deep-navy #0f2350 at 900", () => {
    expect(MAROON).not.toContain("#0f2350");
  });

  it("900 is a color-mix into a near-black neutral (still AA-dark on white)", () => {
    const line = MAROON.split("\n").find((l) => l.trim().startsWith("900:")) || "";
    expect(line).toContain("color-mix");
    // The neutral base the brand is mixed INTO must itself be a near-black ink so
    // body text stays high-contrast on white for ANY chapter hue. Pull the base
    // hex (the second color arg) and prove it clears text-grade AA on white.
    const base = line.match(/#[0-9a-fA-F]{6}(?=\s*\))/)?.[0];
    expect(base, `expected a near-black base hex in: ${line.trim()}`).toBeTruthy();
    expect(contrastRatio(base as string, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("P1 #7 — the accent band (400–700) stays inside the live brand colors", () => {
  it.each(["400:", "500:", "600:", "650:", "700:"])(
    "step %s is bound to a --brand-primary* var",
    (step) => {
      const line = MAROON.split("\n").find((l) => l.trim().startsWith(step)) || "";
      expect(line).toMatch(/var\(--brand-primary(-dark)?/);
    },
  );
});

describe("P1 #7 — the Alumni (cream) accent is driven by --brand-secondary", () => {
  // The legacy fixed parchment steps must be gone.
  const LEGACY_PARCHMENT = ["#fffdf6", "#fdf6e3", "#f8e7bf", "#f0d089"];
  it("no longer hardcodes the full fixed parchment ramp", () => {
    // At least the mid/edge steps (which carried the gold accent) must now be
    // brand-secondary driven; assert none of the legacy accent hexes remain as
    // standalone fixed values.
    for (const hex of LEGACY_PARCHMENT.slice(1)) {
      expect(CREAM).not.toContain(hex);
    }
  });

  it.each(["50:", "100:", "200:", "300:"])(
    "cream step %s color-mixes from --brand-secondary",
    (step) => {
      const line = CREAM.split("\n").find((l) => l.trim().startsWith(step)) || "";
      expect(line).toContain("color-mix");
      expect(line).toContain("--brand-secondary");
    },
  );
});
