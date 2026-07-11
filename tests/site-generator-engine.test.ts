import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  ICON_FAMILIES,
  ICON_FAMILY_IDS,
  resolveIconFamily,
  iconStrokeWidth,
  DEFAULT_ICON_FAMILY,
} from "@/lib/site-generator/icon-families";
import {
  COMPONENT_SETS,
  COMPONENT_SET_IDS,
  resolveComponentSet,
  getComponentSet,
  DEFAULT_COMPONENT_SET,
} from "@/lib/site-generator/component-sets";
import {
  TEMPLATE_PRESETS,
  resolveTemplatePreset,
  resolveSiteConfig,
  DEFAULT_PRESET_ID,
} from "@/lib/site-generator/template-presets";
import { TEMPLATE_META } from "@/components/site/templates/template-orders";

// ── Item-7: data-driven, extensible site-generator engine ─────────────────────

describe("icon families — selectable choices, ONE family per output", () => {
  it("offers the 4 taste-approved libraries + the bespoke default", () => {
    expect(ICON_FAMILY_IDS).toEqual(["brand", "phosphor", "hugeicons", "radix", "tabler"]);
    // never lucide
    expect(ICON_FAMILIES.some((f) => (f.pkg || "").includes("lucide"))).toBe(false);
  });
  it("standardizes a strokeWidth per family (solid families → null)", () => {
    for (const f of ICON_FAMILIES) {
      expect(f.strokeWidth === null || typeof f.strokeWidth === "number").toBe(true);
    }
    expect(iconStrokeWidth("radix")).toBeNull(); // solid
    expect(iconStrokeWidth("tabler")).toBe(2);
  });
  it("resolves any input to exactly one valid family (unknown → bespoke default)", () => {
    expect(resolveIconFamily("phosphor")).toBe("phosphor");
    expect(resolveIconFamily("lucide")).toBe(DEFAULT_ICON_FAMILY);
    expect(resolveIconFamily(null)).toBe("brand");
  });
});

describe("component sets — cohesive per-template systems, anti-slop", () => {
  it("every set styles all 5 primitives", () => {
    for (const s of COMPONENT_SETS) {
      for (const k of ["button", "card", "nav", "badge", "input"] as const) {
        expect(typeof s[k]).toBe("string");
        expect(s[k].length).toBeGreaterThan(0);
      }
    }
  });
  it("buttons meet the 44px tap target and never use gradients/glows", () => {
    for (const s of COMPONENT_SETS) {
      expect(s.button).toMatch(/min-h-\[44px\]/);
      expect(/gradient|drop-shadow-\[0_0|blur-/.test(s.button)).toBe(false);
    }
  });
  it("uses the single brand accent (brand-* utilities), never a second hue", () => {
    for (const s of COMPONENT_SETS) {
      expect(s.button).toMatch(/bg-brand/);
      // no purple/indigo/violet AI-tell accents
      expect(/purple|indigo|violet|fuchsia/.test(JSON.stringify(s))).toBe(false);
    }
  });
  it("resolves unknown → default set", () => {
    expect(resolveComponentSet("nope")).toBe(DEFAULT_COMPONENT_SET);
    expect(getComponentSet("brutal").id).toBe("brutal");
    expect(COMPONENT_SET_IDS).toContain("editorial");
  });
});

describe("template presets — extensible catalog, distinct systems", () => {
  it("ships >=10 presets, each a base template + component set + icon family", () => {
    expect(TEMPLATE_PRESETS.length).toBeGreaterThanOrEqual(10);
    for (const p of TEMPLATE_PRESETS) {
      expect(["classic", "modern", "bold"]).toContain(p.baseTemplate);
      expect(COMPONENT_SET_IDS).toContain(p.componentSet);
      expect(ICON_FAMILY_IDS).toContain(p.iconFamily);
    }
  });
  it("no layout family repeats (every preset reads as a distinct family)", () => {
    const families = TEMPLATE_PRESETS.map((p) => p.family);
    expect(new Set(families).size).toBe(families.length);
  });
  it("no two presets share BOTH layout family and component set (all visibly distinct)", () => {
    const combos = TEMPLATE_PRESETS.map((p) => `${p.family}:${p.componentSet}`);
    expect(new Set(combos).size).toBe(combos.length);
  });
  it("has exactly one CINEMATIC 2.5D depth preset (motion=cinematic)", () => {
    const cinematic = TEMPLATE_PRESETS.filter((p) => p.motion === "cinematic");
    expect(cinematic).toHaveLength(1);
    expect(cinematic[0].family).toBe("cinematic");
  });
  it("has unique ids and stable string ids", () => {
    const ids = TEMPLATE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  it("resolves an unknown preset id to the default", () => {
    expect(resolveTemplatePreset("nope").id).toBe(DEFAULT_PRESET_ID);
    expect(resolveTemplatePreset("editorial").componentSet).toBe("editorial");
  });
  it("every preset points at a thumbnail that actually exists on disk (no broken cards)", () => {
    for (const p of TEMPLATE_PRESETS) {
      const file = resolve(__dirname, "..", "public", p.thumb.replace(/^\//, ""));
      expect(existsSync(file), `${p.id} thumb missing: ${p.thumb}`).toBe(true);
    }
  });
});

describe("resolveSiteConfig — reconciles preset + per-axis overrides", () => {
  it("derives all axes from a chosen preset", () => {
    const r = resolveSiteConfig({ "website.preset": "cinematic" });
    expect(r.baseTemplate).toBe("bold");
    expect(r.componentSet).toBe("soft");
    expect(r.iconFamily).toBe("hugeicons");
    expect(r.motion).toBe("cinematic");
  });
  it("lets explicit per-axis cfg override the preset default", () => {
    const r = resolveSiteConfig({ "website.preset": "classic-crest", "website.iconFamily": "tabler" });
    expect(r.iconFamily).toBe("tabler"); // override wins
    expect(r.componentSet).toBe("refined"); // preset default kept
  });
  it("falls back cleanly for a legacy chapter with only website.template", () => {
    const r = resolveSiteConfig({ "website.template": "modern" });
    expect(r.baseTemplate).toBe("modern");
    expect(r.presetId).toBe(DEFAULT_PRESET_ID);
    expect(r.componentSet).toBe(DEFAULT_COMPONENT_SET);
  });
  it("empty cfg → the safe classic default", () => {
    const r = resolveSiteConfig({});
    expect(r.baseTemplate).toBe("classic");
    expect(r.iconFamily).toBe("brand");
  });
});

describe("preset-picker UI (item 4) stages the preset + per-axis overrides", () => {
  const src = require("node:fs").readFileSync(
    resolve(__dirname, "..", "app/admin/website/website-builder-client.tsx"),
    "utf8",
  ) as string;
  it("renders the full preset catalog and resolves the chosen preset", () => {
    expect(src).toMatch(/TEMPLATE_PRESETS\.map/);
    expect(src).toMatch(/resolveTemplatePreset\(/);
  });
  it("exposes per-axis overrides (component set + icon family) that fall back to the preset default", () => {
    expect(src).toMatch(/componentSetOverride/);
    expect(src).toMatch(/iconFamilyOverride/);
    expect(src).toMatch(/effectiveComponentSet.*componentSetOverride \?\? activePreset\.componentSet/s);
    expect(src).toMatch(/effectiveIconFamily.*iconFamilyOverride \?\? activePreset\.iconFamily/s);
  });
  it("persists the exact cfg keys the public renderer's resolveSiteConfig reads", () => {
    expect(src).toMatch(/"website\.preset": presetId/);
    expect(src).toMatch(/"website\.componentSet": effectiveComponentSet/);
    expect(src).toMatch(/"website\.iconFamily": effectiveIconFamily/);
  });
  it("previews real glyphs from each icon family (SiteIcon) so the choice is visible", () => {
    expect(src).toMatch(/<SiteIcon/);
  });
});

describe("TEMPLATE_META wired to the new declarative axes", () => {
  it("every base template declares a valid component set + icon family", () => {
    for (const m of TEMPLATE_META) {
      expect(COMPONENT_SET_IDS).toContain(m.componentSet as any);
      expect(ICON_FAMILY_IDS).toContain(m.iconFamily as any);
    }
  });
});
