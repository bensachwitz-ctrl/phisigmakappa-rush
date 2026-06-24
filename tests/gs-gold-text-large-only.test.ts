import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// ── .gs-gold-text is LARGE-TEXT-ONLY (a11y pin) ──────────────────────────────
// The gold wordmark gradient (#f59e0b -> #fbbf24 in app/globals.css) only clears
// WCAG AA 1.4.3 at LARGE text sizes (>=24px / >=18.66px bold, the 3:1 large-text
// threshold). Against the near-white page its lightest stop (#fbbf24) is ~1.7:1
// — well under the 4.5:1 body-text floor. It is therefore reserved for the
// decorative "stack"/"chapter" wordmark + hero/stat numerals, never body copy.
// This pin (a) anchors the CSS LARGE-TEXT-ONLY note so it can't be silently
// dropped, and (b) greps every source surface so a future edit can't pair
// gs-gold-text with a small-text utility (text-xs / text-sm) and ship sub-AA
// gold body text. Mirrors the existing .gs-gradient-text AA documentation.

const ROOT = resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components", "mobile-shell"];

function walk(relDir: string): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(resolve(ROOT, relDir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const rel = `${relDir}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(rel));
    else if (
      (e.name.endsWith(".tsx") ||
        e.name.endsWith(".ts") ||
        e.name.endsWith(".jsx") ||
        e.name.endsWith(".html")) &&
      !e.name.endsWith(".d.ts") &&
      !e.name.includes(".test.")
    ) {
      out.push(rel);
    }
  }
  return out;
}

describe(".gs-gold-text — large-text-only a11y guard", () => {
  it("globals.css documents the gradient as LARGE TEXT ONLY", () => {
    const css = readFileSync(resolve(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/LARGE TEXT ONLY[^\n]*gs-gold-text|gs-gold-text/);
    // The note itself (one line above the rule) names the WCAG clause + the ban.
    expect(css).toMatch(/LARGE TEXT ONLY[\s\S]{0,200}?do not pair with text-xs\/text-sm/);
  });

  // Match any className/string literal that contains gs-gold-text AND a small-
  // text utility (text-xs or text-sm) in the SAME quoted attribute value — that
  // is the sub-AA pairing the CSS note forbids. We scan className="…", class="…",
  // and template-literal class strings.
  const PAIRED = /gs-gold-text[^"'`]*\btext-(?:xs|sm)\b|\btext-(?:xs|sm)\b[^"'`]*gs-gold-text/;

  const files = SCAN_DIRS.flatMap(walk).filter((rel) =>
    readFileSync(resolve(ROOT, rel), "utf8").includes("gs-gold-text"),
  );

  it("scans at least the known gs-gold-text surfaces (guard is not vacuous)", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  for (const rel of files) {
    it(`${rel} never pairs gs-gold-text with text-xs/text-sm`, () => {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      expect(
        PAIRED.test(src),
        `Found gs-gold-text paired with a small-text utility in ${rel}; the gold gradient only clears WCAG AA at large sizes — keep it on the wordmark/stat, never text-xs/text-sm.`,
      ).toBe(false);
    });
  }
});
