import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ── Item-8: iOS motion polish — the bundled shell must scroll fluidly/native ──
// The jank was a per-frame backdrop-filter blur on the sticky header (repaints
// the viewport every scroll frame). These pin the fix across the Capacitor
// source-of-truth shell and its synced copies so a future edit can't reintroduce
// it, while keeping the byte-parity guarantee (cap-sync copies the source
// verbatim) intact.
//
// CI-durability: only mobile-shell/index.html and ios/App/App/public/index.html
// are committed, so they exist on a fresh checkout and are always asserted. The
// android copy (android/app/src/main/assets/public/index.html) is a GITIGNORED
// `npx cap sync` build artifact — absent on a fresh CI checkout — so reading it
// unconditionally (as this test used to) crashed CI. We now assert it only when
// present, and when present require it to be byte-identical to the source (so
// cap-sync parity is still verified). The artifact is never committed.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);

/** Capacitor source-of-truth shell (committed). */
const SOURCE = "mobile-shell/index.html";
/** Committed shells — present on a fresh CI checkout, always asserted. */
const TRACKED_SHELLS = [SOURCE, "ios/App/App/public/index.html"];
/** Gitignored cap-sync artifact — asserted only when present. */
const ANDROID_SHELL = "android/app/src/main/assets/public/index.html";
const androidPresent = existsSync(root(ANDROID_SHELL));

/** Every motion-safety invariant the bundled shell must uphold. */
function expectMotionSafe(src: string) {
  // does NOT blur the sticky header (no per-frame backdrop-filter repaint)…
  expect(src).not.toMatch(/backdrop-filter:saturate\(140%\) blur\(8px\);z-index:5\}/);
  // …replaced by an opaque, composited nav bar
  expect(src).toMatch(/border-bottom:1px solid var\(--line\);z-index:5;will-change:transform/);
  // vestibular-safe global reduced-motion branch
  expect(src).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*animation-duration:\.001ms!important/);
  expect(src).toMatch(/\.row:active\{transform:none\}/);
  // momentum scrolling + GPU-only tap feedback (transform, not layout)
  expect(src).toMatch(/-webkit-overflow-scrolling:touch/);
  expect(src).toMatch(/\.row:active\{transform:scale\(\.985\)\}/);
}

describe.each(TRACKED_SHELLS)("mobile shell motion: %s", (rel) => {
  it("is motion-safe (opaque composited nav, reduced-motion branch, momentum + GPU tap)", () => {
    expectMotionSafe(readFileSync(root(rel), "utf8"));
  });
});

// Byte-parity: cap-sync must copy the source shell verbatim into each platform.
// This is the real cross-copy guarantee, expressed only over tracked files (plus
// the android artifact when it happens to be present locally).
describe("mobile shell byte-parity (cap-sync copies the source verbatim)", () => {
  const source = readFileSync(root(SOURCE), "utf8");

  it("tracked iOS copy is byte-identical to the source shell", () => {
    expect(readFileSync(root("ios/App/App/public/index.html"), "utf8")).toBe(source);
  });

  // Skipped on a fresh CI checkout (artifact absent); verified locally after a
  // `npx cap sync`, which also re-proves the android shell is motion-safe by
  // transitivity with the asserted source.
  it.skipIf(!androidPresent)(
    "android copy is byte-identical to the source shell (when the cap-sync artifact is present)",
    () => {
      expect(readFileSync(root(ANDROID_SHELL), "utf8")).toBe(source);
    },
  );
});
