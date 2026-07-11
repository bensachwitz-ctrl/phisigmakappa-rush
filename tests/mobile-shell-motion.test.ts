import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Item-8: iOS motion polish — the bundled shell must scroll fluidly/native ──
// The jank was a per-frame backdrop-filter blur on the sticky header (repaints
// the viewport every scroll frame). These pin the fix across mobile-shell and
// both Capacitor-synced copies so a future edit can't reintroduce it.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);
const SHELLS = [
  "mobile-shell/index.html",
  "ios/App/App/public/index.html",
  "android/app/src/main/assets/public/index.html",
];

describe.each(SHELLS)("mobile shell motion: %s", (rel) => {
  const src = readFileSync(root(rel), "utf8");

  it("does NOT blur the sticky header (no per-frame backdrop-filter repaint on scroll)", () => {
    expect(src).not.toMatch(/backdrop-filter:saturate\(140%\) blur\(8px\);z-index:5\}/);
    // …replaced by an opaque, composited nav bar
    expect(src).toMatch(/border-bottom:1px solid var\(--line\);z-index:5;will-change:transform/);
  });

  it("has a vestibular-safe global reduced-motion branch", () => {
    expect(src).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*animation-duration:\.001ms!important/);
    expect(src).toMatch(/\.row:active\{transform:none\}/);
  });

  it("uses momentum scrolling + GPU-only tap feedback (transform, not layout)", () => {
    expect(src).toMatch(/-webkit-overflow-scrolling:touch/);
    expect(src).toMatch(/\.row:active\{transform:scale\(\.985\)\}/);
  });
});
