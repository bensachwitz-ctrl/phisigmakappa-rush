import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrastRatio } from "@/lib/brand-theme";

// ── Static-chrome AA contrast (council UX HIGH/MED + LOW "uncovered gate") ─────
// The demo-brand-contrast suite only validates the user-supplied ACTIVE brand
// color, so the HARDCODED slate chrome in the iOS App Store deliverable
// (MobileAppClient.tsx) — the inactive bottom-tab label, the "Turn off tips" /
// "Keep exploring" links, and the dismiss-tip buttons — was invisible to the
// gate meant to catch contrast misses. Council findings:
//   HIGH — inactive tab label #94A3B8 (slate-400) = 2.56:1, fails AA.
//   MED  — "Turn off tips" / "Keep exploring" text-slate-400 = 2.56:1, fails AA.
//   MED  — dismiss buttons were 24px (h-6 w-6), below the 44pt HIG touch target.
// This test reads the real source and pins the fixed values so any future
// reintroduction of slate-400 chrome (or a sub-44 dismiss button) fails CI.

const ROOT = resolve(__dirname, "..");
const src = readFileSync(resolve(ROOT, "app/app/MobileAppClient.tsx"), "utf8");

const WHITE = "#ffffff";
// Tailwind slate scale (the chrome backgrounds in the shell are white / white/95).
const SLATE_400 = "#94a3b8"; // the FAILING color we must not reintroduce
const SLATE_500 = "#64748b"; // the AA-passing replacement

describe("mobile shell static chrome clears WCAG AA on white", () => {
  it("slate-500 clears 4.5:1 on white and slate-400 does not (guard rail)", () => {
    expect(contrastRatio(SLATE_500, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SLATE_400, WHITE)).toBeLessThan(4.5);
  });

  it("inactive bottom-tab label is the AA slate-500 hex, never the failing slate-400", () => {
    // The inline style picks brandPrimary when active, else the inactive hex.
    expect(src).toMatch(/color:\s*active\s*\?\s*brandPrimary\s*:\s*["']#64748b["']/i);
    // The 2.56:1 slate-400 hex must be gone from the tab style.
    expect(src).not.toMatch(/active\s*\?\s*brandPrimary\s*:\s*["']#94A3B8["']/i);
  });

  it("tip dismiss-text links use slate-500 (resting), not slate-400", () => {
    expect(src).not.toContain("font-semibold text-slate-400 underline-offset-2");
    expect(src).toContain("font-semibold text-slate-500 underline-offset-2");
  });

  it("dismiss-tip icon buttons have a >=44pt (h-11 w-11) hit area, not h-6 w-6", () => {
    // The hand-rolled dismiss buttons must match the documented icon-button size.
    expect(src).not.toMatch(/aria-label="Dismiss tip"[\s\S]{0,120}?h-6 w-6/);
    expect(src).toMatch(/h-11 w-11[\s\S]{0,200}?aria-label="Dismiss tip"|aria-label="Dismiss tip"[\s\S]{0,160}?h-11 w-11/);
  });
});
