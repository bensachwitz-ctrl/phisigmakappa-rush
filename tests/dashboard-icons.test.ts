import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Glyph-coverage for the bespoke member/alumni DASHBOARD icon family added to
// de-lucide the portal tab navigation. The vitest suite runs in a pure-`node`
// env (no DOM, no React JSX transform — see vitest.config.ts), so instead of
// rendering the components we statically assert the source is a complete,
// on-language icon set: every glyph is exported, built on the shared IconBase
// (24×24 grid + currentColor + themeable accent), carries real SVG geometry,
// and the whole set is wired into the public barrel. A missing/empty/renamed
// glyph fails here before it can ship a broken nav icon.

const ROOT = resolve(__dirname, "..");
const src = readFileSync(
  resolve(ROOT, "components/brand/icons/dashboard-tabs.tsx"),
  "utf8",
);
const barrel = readFileSync(
  resolve(ROOT, "components/brand/icons/index.ts"),
  "utf8",
);

const EXPECTED = [
  "IconActivity",
  "IconServiceHours",
  "IconPolls",
  "IconProfile",
  "IconElections",
  "IconMap",
  "IconGraduation",
  "IconGiving",
  "IconSettings",
  "IconAddMember",
] as const;

describe("bespoke dashboard-tabs icon family", () => {
  it("builds on the shared IconBase foundation (themeable, on-grid)", () => {
    expect(src).toContain('from "./icon-base"');
    expect(src).toContain("IconBase");
    expect(src).toContain("GS_ACCENT");
  });

  it.each(EXPECTED)("exports %s", (name) => {
    expect(src).toMatch(new RegExp(`export function ${name}\\b`));
  });

  it.each(EXPECTED)("re-exports %s through the public barrel", (name) => {
    expect(barrel).toContain(name);
  });

  it("draws every glyph with real SVG geometry (no empty shells)", () => {
    // Split the file into per-component blocks and assert each has a drawing
    // primitive between its `export function IconX` and the next one.
    for (const name of EXPECTED) {
      const start = src.indexOf(`export function ${name}`);
      expect(start, `${name} missing`).toBeGreaterThanOrEqual(0);
      // find the next export (or EOF) to bound this glyph's body
      const after = src.slice(start + name.length);
      const nextIdx = after.indexOf("export function ");
      const body = nextIdx === -1 ? after : after.slice(0, nextIdx);
      expect(body, `${name} has no path/circle/rect geometry`).toMatch(
        /<(path|circle|rect)\b/,
      );
      // each glyph passes its accent down so the set retints from one place
      expect(body, `${name} not duotone (no accent layer)`).toMatch(/accent/);
    }
  });

  it("has no leftover lucide import in the dashboard glyph module", () => {
    // The set must be fully bespoke — no `from "lucide-react"` import statement.
    // (The word may appear in a doc comment explaining what it replaced; we only
    // forbid an actual import.)
    expect(src).not.toMatch(/from\s+["']lucide-react["']/);
  });
});
