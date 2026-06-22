import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Two elevation fixes proven at the source level (the vitest suite runs pure-node
// — no DOM/JSX — so we assert on the source the same way the brand-default-blue
// and dashboard-icons suites do):
//
//   1. WHITE-LABEL: the `glow` and `pulse-ring` keyframes in app/globals.css used
//      to hardcode Phi Sig cardinal red (rgba(200,16,46,...)), so any element with
//      .animate-glow / .animate-pulse-ring glowed garnet on a navy/gold chapter,
//      breaking the single-tenant white-label contract. They now track the
//      per-chapter --primary HSL triple injected by buildBrandThemeStyle().
//
//   2. PORTAL FEEDBACK: three alumni-dashboard handlers (poll vote, save vouch,
//      revoke vouch) only acted on `if (res.ok)` and swallowed failures into
//      console.error — a failed action gave the alumnus ZERO feedback. They now
//      surface a destructive toast on both the !res.ok and the catch path.

const ROOT = resolve(__dirname, "..");

describe("white-label: glow/pulse-ring keyframes track the chapter brand", () => {
  const css = readFileSync(resolve(ROOT, "app/globals.css"), "utf8");

  // Isolate the two keyframe blocks so we only assert on the animation halos
  // (the literal "200, 16, 46" must not appear anywhere in these blocks).
  function keyframeBlock(name: string): string {
    const m = css.match(new RegExp(`@keyframes\\s+${name}\\s*\\{[\\s\\S]*?\\n\\}`));
    expect(m, `@keyframes ${name} should exist`).toBeTruthy();
    return m![0];
  }

  // Only the actual box-shadow declarations matter — strip /* … */ comments so
  // an explanatory comment mentioning the old color can't trip the negative check.
  function boxShadowLines(block: string): string {
    return block
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => l.includes("box-shadow"))
      .join("\n");
  }

  it("the `glow` keyframe uses hsl(var(--primary)) and not hardcoded Phi Sig red", () => {
    const shadows = boxShadowLines(keyframeBlock("glow"));
    expect(shadows).toContain("hsl(var(--primary)");
    expect(shadows).not.toMatch(/200,\s*16,\s*46/);
  });

  it("the `pulse-ring` keyframe uses hsl(var(--primary)) and not hardcoded Phi Sig red", () => {
    const shadows = boxShadowLines(keyframeBlock("pulse-ring"));
    expect(shadows).toContain("hsl(var(--primary)");
    expect(shadows).not.toMatch(/200,\s*16,\s*46/);
  });

  it("no keyframe box-shadow in globals.css hardcodes the Phi Sig cardinal rgba", () => {
    // Guards against the leak being reintroduced in a future animation. Comments
    // are stripped so only live declarations are checked.
    const keyframeRegion = css
      .slice(css.indexOf("@keyframes"))
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(keyframeRegion).not.toMatch(/rgba\(\s*200,\s*16,\s*46/);
  });
});

describe("portal: alumni-dashboard actions surface failure feedback", () => {
  const src = readFileSync(
    resolve(ROOT, "app/portal/alumni/dashboard/DashboardClient.tsx"),
    "utf8",
  );

  // Each handler should give the alumnus a destructive toast when the request
  // fails. We assert the user-facing failure copy exists in the source — the
  // copy is unique per handler so its presence proves the else/catch branch was
  // wired, not just that `push` is imported.
  const FAILURE_COPY = [
    "Couldn't record your vote", // poll vote
    "Couldn't save your vouch", // save vouch
    "Couldn't revoke your vouch", // revoke vouch
  ];

  for (const copy of FAILURE_COPY) {
    it(`shows a failure toast for: "${copy}"`, () => {
      expect(src).toContain(copy);
    });
  }

  it("each failure path pushes a destructive toast", () => {
    // There must be at least one destructive push per failing copy string. We
    // can't run the handlers in node, so we assert the destructive variant is
    // co-located with each failure message within a small window.
    for (const copy of FAILURE_COPY) {
      const idx = src.indexOf(copy);
      expect(idx, `failure copy "${copy}" present`).toBeGreaterThan(-1);
      const window = src.slice(idx, idx + 160);
      expect(window, `"${copy}" should be a destructive toast`).toContain(
        'variant: "destructive"',
      );
    }
  });

  it("the three failure handlers no longer leave their else-branch empty", () => {
    // Regression guard: the old code had a bare `if (res.ok) { ... }` with no
    // else. Each failure copy implies an else branch now exists.
    expect(src).toMatch(/Couldn't record your vote/);
    expect(src).toMatch(/Network error — please try again\./);
  });
});
