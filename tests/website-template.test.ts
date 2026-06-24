import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

// ── Picker drift-guard (source-pin) ───────────────────────────────────────────
// AOTY council blocking finding (anti-fabrication #1): the admin website builder
// AND the onboarding wizard previously staged template ids ("neon"/"floating"/
// "minimal") that the public renderer does NOT support — resolveTemplateId() then
// silently coerced them to "classic", so a founder could pick "Neon Glow", see a
// neon preview, get a success toast, and publish plain Classic. The `as any`
// casts on setTemplate(...) are exactly what hid the dead ids from tsc.
//
// This sweep reads the picker SOURCE files and asserts every selectable template
// id is a real TemplateId — so a future edit that reintroduces a fake id (even
// through `as any`) fails CI loudly instead of shipping a dead, selectable-but-
// silently-coerced control. We pin two literal forms in those files:
//   • setTemplate("X")          — the Quick Style Presets matcher + wizard buttons
//   • <option value="X">        — the manual Template dropdown
// We deliberately do NOT match dynamic forms (setTemplate(tpl.id),
// setTemplate(resolveTemplateId(...))) — those are drift-proof by construction
// because they source from TEMPLATE_META / coerce through resolveTemplateId.
const ROOT = resolve(__dirname, "..");
const PICKER_FILES = [
  "app/admin/website/website-builder-client.tsx",
  "app/onboard/onboard-wizard.tsx",
];

describe("template picker drift-guard (preview == published)", () => {
  it("every hardcoded setTemplate(\"…\") literal across the pickers is a real TemplateId", () => {
    const real = new Set<string>(TEMPLATE_IDS);
    const offenders: string[] = [];
    for (const rel of PICKER_FILES) {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      // setTemplate("literal")  — captures the staged string-literal id only.
      const re = /setTemplate\(\s*["'`]([^"'`]+)["'`]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        if (!real.has(m[1])) offenders.push(`${rel}: setTemplate("${m[1]}")`);
      }
    }
    expect(
      offenders,
      `These pickers stage a template id the renderer does NOT support (it would ` +
        `be silently coerced to "classic" — a dead, selectable control). Use a ` +
        `real id from TEMPLATE_IDS [${[...real].join(", ")}] or source from ` +
        `TEMPLATE_META:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every <option value=\"…\"> in the template <select> is a real TemplateId", () => {
    const real = new Set<string>(TEMPLATE_IDS);
    const builder = readFileSync(
      resolve(ROOT, "app/admin/website/website-builder-client.tsx"),
      "utf8",
    );
    // The template <select> is rendered from TEMPLATE_META.map(...), so there
    // should be ZERO hardcoded <option value="..."> for templates. If any are
    // reintroduced as literals, every one must be a real id. (The orientation
    // <select> uses centered/split-* values which are NOT template ids — we scope
    // to options whose value is template-shaped by excluding the known
    // orientation/layout literals.)
    const orientationLiterals = new Set(["centered", "split-left", "split-right"]);
    const re = /<option\s+value=["']([a-z-]+)["']/g;
    let m: RegExpExecArray | null;
    const offenders: string[] = [];
    while ((m = re.exec(builder)) !== null) {
      const val = m[1];
      if (orientationLiterals.has(val)) continue; // orientation select, not template
      if (!real.has(val)) offenders.push(`<option value="${val}">`);
    }
    expect(
      offenders,
      `Hardcoded template <option> value(s) that are not real TemplateIds ` +
        `(would publish as Classic). Source the template <select> from ` +
        `TEMPLATE_META instead:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the picker files no longer cast setTemplate through `as any` (the escape hatch that hid the drift)", () => {
    const offenders: string[] = [];
    for (const rel of PICKER_FILES) {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      // Match setTemplate("x" as any) / setTemplate(e.target.value as any) etc.
      if (/setTemplate\([^)]*\bas any\b/.test(src)) offenders.push(rel);
    }
    expect(
      offenders,
      `These files cast a setTemplate(...) argument through \`as any\`, which is ` +
        `the exact escape hatch that let a fake template id compile and ship as a ` +
        `dead control:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});

// ── Onboarding persists the chosen template (source-pin) ──────────────────────
// AOTY council blocking finding (anti-fabrication #2): the wizard's "Template &
// Colors" step advertised + live-previewed a template choice that the POST body
// dropped entirely, so every tenant provisioned on the default. This pins the
// full wiring: the wizard sends `template: mockupTemplate`, mockupTemplate is a
// real TemplateId (defaults to "classic"), and the onboard route persists it to
// cfg["website.template"] coerced through resolveTemplateId (so a forged value
// can never poison the config).
describe("onboarding provisions the chosen template", () => {
  const wizard = readFileSync(resolve(ROOT, "app/onboard/onboard-wizard.tsx"), "utf8");
  const route = readFileSync(resolve(ROOT, "app/api/onboard/route.ts"), "utf8");

  it("wizard state mockupTemplate is a TemplateId defaulting to classic", () => {
    expect(wizard).toMatch(/useState<TemplateId>\("classic"\)/);
  });

  it("wizard POSTs the chosen template in the /api/onboard body", () => {
    expect(wizard).toMatch(/template:\s*mockupTemplate/);
  });

  it("onboard route persists website.template coerced through resolveTemplateId", () => {
    expect(route).toContain('"website.template": resolveTemplateId(');
    expect(route).toMatch(/template:\s*rawTemplate/);
    expect(route).toContain(
      'import { resolveTemplateId } from "@/components/site/templates/template-orders"',
    );
  });
});
