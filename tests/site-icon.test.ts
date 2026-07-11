import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SiteIcon,
  glyphFor,
  SITE_ICON_NAMES,
  type SiteIconName,
} from "@/components/site/site-icon";
import { ICON_FAMILY_IDS, iconStrokeWidth } from "@/lib/site-generator/icon-families";

// ── Item-1: the data-driven glyph renderer for the selectable icon families ────
// Each family must cover the FULL semantic vocabulary so a chosen family never
// has a hole that would force a mid-page fallback to another family (which would
// break the "one family per rendered page" taste rule).

describe("SiteIcon glyph map — every family covers the whole semantic set", () => {
  it("exposes the 20 semantic names", () => {
    expect(SITE_ICON_NAMES).toHaveLength(20);
    expect(SITE_ICON_NAMES).toContain("calendar");
    expect(SITE_ICON_NAMES).toContain("instagram");
  });

  it("resolves a DEFINED glyph component for every (family x name) — no holes", () => {
    for (const family of ICON_FAMILY_IDS) {
      for (const name of SITE_ICON_NAMES) {
        const G = glyphFor(family, name);
        // A React component is a function or a forwardRef/memo object.
        expect(["function", "object"]).toContain(typeof G);
        expect(G).toBeTruthy();
      }
    }
  });

  it("coerces an unknown family to the bespoke brand default", () => {
    expect(glyphFor("lucide", "star")).toBe(glyphFor("brand", "star"));
    expect(glyphFor(null, "calendar")).toBe(glyphFor("brand", "calendar"));
  });
});

describe("SiteIcon renders real SVG markup with the family's standardized stroke", () => {
  const render = (family: string, name: SiteIconName) =>
    renderToStaticMarkup(createElement(SiteIcon, { family, name, className: "h-5 w-5" }));

  it("renders an <svg> for every family without throwing", () => {
    for (const family of ICON_FAMILY_IDS) {
      const html = render(family, "arrow-right");
      expect(html).toMatch(/<svg/);
    }
  });

  it("applies the standardized numeric stroke width for stroke families", () => {
    // tabler standardizes on 2px; the rendered SVG carries stroke-width="2".
    expect(iconStrokeWidth("tabler")).toBe(2);
    expect(render("tabler", "shield")).toMatch(/stroke-width="2"/);
  });

  it("emits NO stroke-width for the solid Radix family (strokeWidth is null)", () => {
    expect(iconStrokeWidth("radix")).toBeNull();
    expect(render("radix", "shield")).not.toMatch(/stroke-width=/);
  });

  it("is decorative (aria-hidden) unless a title is supplied", () => {
    const decorative = renderToStaticMarkup(
      createElement(SiteIcon, { family: "brand", name: "star" }),
    );
    expect(decorative).toMatch(/aria-hidden="true"/);
    const labeled = renderToStaticMarkup(
      createElement(SiteIcon, { family: "brand", name: "star", title: "Featured" }),
    );
    expect(labeled).toMatch(/aria-label="Featured"/);
    expect(labeled).toMatch(/role="img"/);
  });
});
