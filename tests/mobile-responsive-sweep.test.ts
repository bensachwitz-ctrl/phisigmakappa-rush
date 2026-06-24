import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Mobile-friendly sweep (owner build-out) ───────────────────────────────────
// Two real responsiveness defects fixed in the sweep, pinned so they don't
// regress:
//  1. Admin Risk Desk filters: three SelectTriggers were fixed at w-[120px] in a
//     grid-cols-3 (= 360px + gaps), overflowing 375px. Now w-full sm:w-[120px].
//  2. Portal Brothers RSVP toggle buttons were p-2.5 + text-xs (~36px tall),
//     under the 44pt touch minimum. Now min-h-[44px].

const ROOT = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("admin risk filters are mobile-safe (no 375px overflow)", () => {
  const src = read("app/admin/risk/risk-client.tsx");

  it("filter SelectTriggers shrink to full width on mobile (w-full sm:w-[120px])", () => {
    const matches = src.match(/SelectTrigger className="w-full sm:w-\[120px\]"/g) || [];
    expect(matches.length).toBe(3);
    // The old fixed-width form must be gone.
    expect(src).not.toMatch(/SelectTrigger className="w-\[120px\]"/);
  });
});

describe("portal brothers RSVP buttons meet the 44pt touch target", () => {
  const src = read("app/portal/brothers/dashboard/BrothersDashboardClient.tsx");

  it("the Going/Maybe/Declined RSVP toggle buttons are >=44px tall", () => {
    // The RSVP status toggle button className now carries min-h-[44px].
    expect(src).toMatch(/min-h-\[44px\][^`]*rounded-xl border text-xs font-bold/);
  });
});
