import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Item-5: booking page must not be a dead-end — a "Back to website" link ────
describe("schedule page 'Back to website' affordance (item 5)", () => {
  const src = readFileSync(
    resolve(__dirname, "..", "app/schedule/page.tsx"),
    "utf8",
  );

  it("renders a Back to website link to '/'", () => {
    expect(src).toMatch(/Back to website/);
    expect(src).toMatch(/href="\/"/);
  });

  it("uses the bespoke brand icon (not lucide) with a 44px target", () => {
    expect(src).toMatch(/IconArrowLeft/);
    expect(src).toMatch(/min-h-\[44px\]/);
  });
});
