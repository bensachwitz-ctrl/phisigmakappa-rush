import { describe, it, expect } from "vitest";
// Import the PURE data module (no .tsx imports) so the test graph stays
// pure-node. The hero-variant wiring (TEMPLATE_HERO) is proven by tsc +
// chapter-landing's import; here we assert the orders, meta, and resolver.
import {
  TEMPLATE_ORDER,
  TEMPLATE_META,
  TEMPLATE_IDS,
  resolveTemplateId,
} from "@/components/site/templates/template-orders";

// The exact legacy default order that lived inline in chapter-landing.tsx before
// the chapter-site generator extracted it. TEMPLATE_ORDER.classic MUST equal this
// so switching nothing (Classic = default) is byte-identical to the pre-generator
// render.
const LEGACY_DEFAULT_ORDER = [
  "hero", "stats", "highlights", "values", "register",
  "instagram", "timeline", "schedule", "testimonial",
  "spotlight", "eboard", "about", "faq", "where", "cta",
];

describe("chapter-site template config", () => {
  it("TEMPLATE_ORDER.classic deep-equals the legacy default order (Classic unchanged)", () => {
    expect(TEMPLATE_ORDER.classic).toEqual(LEGACY_DEFAULT_ORDER);
  });

  it("every template order leads with the hero and includes the always-on register form", () => {
    for (const id of TEMPLATE_IDS) {
      const order = TEMPLATE_ORDER[id];
      expect(order[0]).toBe("hero");
      expect(order).toContain("register");
      // No accidental duplicate keys in an order.
      expect(new Set(order).size).toBe(order.length);
    }
  });

  it("every template order is a subset of the 15 known section keys (no unknown keys)", () => {
    // Classic is the canonical full set; Modern/Bold may intentionally omit a
    // minor section (e.g. Modern drops the highlights banner). What MUST hold is
    // that no order introduces a key that the renderer's sectionMap can't render.
    const known = new Set(TEMPLATE_ORDER.classic);
    for (const id of TEMPLATE_IDS) {
      for (const key of TEMPLATE_ORDER[id]) {
        expect(known.has(key)).toBe(true);
      }
    }
    // Classic must remain the complete set so nothing is lost on the default.
    expect(new Set(TEMPLATE_ORDER.classic).size).toBe(15);
  });

  it("resolveTemplateId maps known ids through and unknown/empty to classic", () => {
    expect(resolveTemplateId("classic")).toBe("classic");
    expect(resolveTemplateId("modern")).toBe("modern");
    expect(resolveTemplateId("bold")).toBe("bold");
    // Unknown / legacy / empty / undefined → Classic fallback.
    expect(resolveTemplateId("flashy")).toBe("classic");
    expect(resolveTemplateId("")).toBe("classic");
    expect(resolveTemplateId(undefined)).toBe("classic");
    expect(resolveTemplateId("CLASSIC")).toBe("classic"); // case-sensitive → fallback
  });

  it("exposes gallery meta (name + svg thumb) for each template id", () => {
    for (const id of TEMPLATE_IDS) {
      const meta = TEMPLATE_META.find((m) => m.id === id);
      expect(meta).toBeTruthy();
      expect(meta!.name.length).toBeGreaterThan(0);
      expect(meta!.thumb).toMatch(/^\/templates\/.+\.svg$/);
    }
    // Exactly the three templates are exposed in the gallery.
    expect(TEMPLATE_META.map((m) => m.id).sort()).toEqual(["bold", "classic", "modern"]);
  });
});
