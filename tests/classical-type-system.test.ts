import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * PHASE-2 brand guard — the CLASSICAL Greek/Roman type system + the elevated
 * (non-generic) login.
 *
 * The owner asked for "old greek/roman font … that style through the entire
 * site … the login is generic and just plain." This suite pins the wiring so it
 * can't silently regress:
 *   1. Cinzel (display) + Cormorant Garamond (serif) are loaded via next/font
 *      and bound to --font-display / --font-serif on <html>.
 *   2. globals.css carries the classical fallback stacks AND renders every
 *      heading (h1–h6) in the display face, so the voice carries site-wide.
 *   3. Tailwind exposes both font-display (Cinzel) and font-serif (Cormorant)
 *      utilities, with --font-sans (Inter) kept for dense data/forms.
 *   4. The login surfaces use the elevated TEMPLE seal + Cinzel, not a plain
 *      default form.
 *
 * Pure-node (no DOM) — inspects source text, mirroring tests/mobile-shell-*.
 */

const ROOT = resolve(__dirname, "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const LAYOUT = read("app/layout.tsx");
const GLOBALS = read("app/globals.css");
const TAILWIND = read("tailwind.config.ts");

describe("classical type system — fonts wired via next/font", () => {
  it("imports Cinzel + Cormorant Garamond from next/font/google", () => {
    expect(LAYOUT).toMatch(/import\s*\{[^}]*\bCinzel\b[^}]*\}\s*from\s*["']next\/font\/google["']/);
    expect(LAYOUT).toMatch(/import\s*\{[^}]*\bCormorant_Garamond\b[^}]*\}\s*from\s*["']next\/font\/google["']/);
  });

  it("Cinzel is bound to --font-display (the inscriptional display face)", () => {
    // The Cinzel(...) instance declares variable: "--font-display".
    expect(LAYOUT).toMatch(/Cinzel\(\s*\{[\s\S]*?variable:\s*["']--font-display["'][\s\S]*?\}\s*\)/);
  });

  it("Cormorant Garamond is bound to --font-serif (the classical accent face)", () => {
    expect(LAYOUT).toMatch(/Cormorant_Garamond\(\s*\{[\s\S]*?variable:\s*["']--font-serif["'][\s\S]*?\}\s*\)/);
  });

  it("all three font variables are applied on the <html> element", () => {
    // className composes inter.variable + cinzel.variable + cormorant.variable.
    expect(LAYOUT).toMatch(/className=\{`?\$\{inter\.variable\}\s*\$\{cinzel\.variable\}\s*\$\{cormorant\.variable\}`?\}/);
  });
});

describe("classical type system — globals.css carries the voice site-wide", () => {
  it("declares fallback stacks naming Cinzel (display) + Cormorant (serif)", () => {
    expect(GLOBALS).toMatch(/--font-display:\s*"Cinzel"/);
    expect(GLOBALS).toMatch(/--font-serif:\s*"Cormorant Garamond"/);
  });

  it("renders every heading (h1–h6) in the display face from one base rule", () => {
    // A single rule applies var(--font-display) to all heading levels so the
    // classical character carries through every surface without touching
    // call-sites. (Whitespace-tolerant.)
    expect(GLOBALS).toMatch(
      /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?font-family:\s*var\(--font-display\)/,
    );
  });

  it("keeps Inter as the body/data face for legibility", () => {
    expect(GLOBALS).toMatch(/--font-sans:\s*"Inter"/);
    expect(GLOBALS).toMatch(/font-family:\s*var\(--font-sans\)/); // body { ... }
  });
});

describe("classical type system — Tailwind utilities", () => {
  it("exposes font-display (Cinzel) AND font-serif (Cormorant) utilities", () => {
    expect(TAILWIND).toMatch(/display:\s*\[\s*["']var\(--font-display\)["']/);
    expect(TAILWIND).toMatch(/serif:\s*\[\s*["']var\(--font-serif\)["']/);
  });
});

describe("login is elevated, not generic — temple seal + Cinzel", () => {
  const APEX = read("components/site/login-entry.tsx");
  const BRO = read("app/portal/brothers/BrothersLoginPage.tsx");
  const ALUM = read("app/portal/alumni/AlumniLoginPage.tsx");

  it("apex sign-in centers the elevated navy TEMPLE seal", () => {
    expect(APEX).toMatch(/<GreekstackLogo[\s\S]*?variant="seal"/);
  });

  it("apex sign-in title + CTA use the classical Cinzel face", () => {
    // Cinzel eyebrow/CTA (font-display) + a Cormorant (font-serif) subhead.
    expect(APEX).toContain("font-display");
    expect(APEX).toContain("font-serif");
    // The premium gold "ENTER" CTA replaced the plain "Continue to sign in".
    expect(APEX).toMatch(/>\s*Enter\s*\n/);
  });

  it("brother + alumni portal logins render the temple seal + Cinzel title", () => {
    for (const src of [BRO, ALUM]) {
      expect(src).toMatch(/<GreekstackLogo[\s\S]*?variant="seal"/);
      expect(src).toContain("font-display");
      expect(src).toContain("font-serif");
    }
  });

  it("portal login fields use a gold focus ring (not the old plain border)", () => {
    for (const src of [BRO, ALUM]) {
      expect(src).toMatch(/focus:ring-2\s+focus:ring-brand-secondary\/30/);
    }
  });
});
