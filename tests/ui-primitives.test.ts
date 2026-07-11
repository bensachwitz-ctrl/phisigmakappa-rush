import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The test env is node-only (no DOM), so these assert the design-system
// primitives' structural contracts at the source level — ARIA wiring, keyboard
// nav, brand-token usage, and backward-compatible defaults — the same style as
// the other component-source tests in this suite.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);

describe("Tabs primitive: accessible + brand-cohesive", () => {
  const src = readFileSync(root("components/ui/tabs.tsx"), "utf8");
  it("wires the full WAI-ARIA tab pattern", () => {
    expect(src).toMatch(/role="tablist"/);
    expect(src).toMatch(/role="tab"/);
    expect(src).toMatch(/role="tabpanel"/);
    expect(src).toMatch(/aria-selected=\{active\}/);
    expect(src).toMatch(/aria-controls=/);
    expect(src).toMatch(/aria-labelledby=/);
  });
  it("is keyboard-navigable (roving tabindex + arrow/home/end)", () => {
    expect(src).toMatch(/ArrowLeft/);
    expect(src).toMatch(/ArrowRight/);
    expect(src).toMatch(/Home/);
    expect(src).toMatch(/End/);
    expect(src).toMatch(/tabIndex=\{active \? 0 : -1\}/);
  });
  it("supports controlled + uncontrolled use", () => {
    expect(src).toMatch(/value\?: string/);
    expect(src).toMatch(/defaultValue\?: string/);
    expect(src).toMatch(/onValueChange\?/);
  });
  it("active state tracks the per-chapter --primary token", () => {
    expect(src).toMatch(/hsl\(var\(--primary\)\)/);
  });
});

describe("List primitive: cohesive divided rows", () => {
  const src = readFileSync(root("components/ui/list.tsx"), "utf8");
  it("matches the Card radius + divider tokens", () => {
    expect(src).toMatch(/divide-y divide-border/);
    expect(src).toMatch(/rounded-2xl border border-border/);
  });
  it("exposes leading/title/description/trailing slots", () => {
    expect(src).toMatch(/leading\?/);
    expect(src).toMatch(/description\?/);
    expect(src).toMatch(/trailing\?/);
  });
  it("interactive rows use a brand hover wash", () => {
    expect(src).toMatch(/hsl\(var\(--primary\)\/0\.06\)/);
  });
  it("supports asChild for link/button rows", () => {
    expect(src).toMatch(/asChild/);
    expect(src).toMatch(/Slot/);
  });
});

describe("Badge variants: cohesive + backward-compatible", () => {
  const src = readFileSync(root("components/ui/badge.tsx"), "utf8");
  it("keeps `default` shape-only so existing className call-sites don't change", () => {
    expect(src).toMatch(/default:\s*""/);
  });
  it("adds the brand + semantic variants", () => {
    for (const v of ["primary", "success", "warning", "danger", "info", "outline"]) {
      expect(src).toMatch(new RegExp(`${v}:`));
    }
  });
  it("primary variant tracks the per-chapter --primary token", () => {
    expect(src).toMatch(/hsl\(var\(--primary\)/);
  });
});
