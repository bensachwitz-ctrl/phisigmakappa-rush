import type { TemplateId } from "./types";

/**
 * template-orders.ts — the PURE, tsx-free data half of the chapter-site template
 * config: the template id list, default section orders, gallery metadata, and the
 * id resolver. Kept separate from template-config.ts (which adds the hero-variant
 * component map) so this can be imported by pure-node vitest WITHOUT dragging the
 * heavy hero .tsx component tree (and its animation imports) into the test graph.
 * template-config.ts re-exports everything here.
 */

export const TEMPLATE_IDS = ["classic", "modern", "bold"] as const;

/**
 * Coerce an arbitrary cfg value to a known TemplateId. Unknown / empty / legacy
 * values fall back to "classic" so an un-customized or mis-typed chapter (and
 * the apex) always renders the original Classic layout — byte-identical to the
 * pre-generator build.
 */
export function resolveTemplateId(raw: string | undefined): TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(raw ?? "")
    ? (raw as TemplateId)
    : "classic";
}

/**
 * Per-template default section order.
 *
 * INVARIANT: TEMPLATE_ORDER.classic is the EXACT legacy defaultOrder that lived
 * inline in chapter-landing.tsx (so switching nothing keeps the original page).
 * Every order starts with "hero" (index 0) and includes the ungated, always-on
 * "register" form, so no template can ship a homepage without the sign-up CTA.
 */
export const TEMPLATE_ORDER: Record<TemplateId, string[]> = {
  // ── Classic Crest (default) — the original, unchanged order. ──────────────
  classic: [
    "hero", "stats", "highlights", "values", "register",
    "instagram", "timeline", "schedule", "testimonial",
    "spotlight", "eboard", "about", "faq", "where", "cta",
  ],
  // ── Modern Split — leads with the form + IG collage, gold accent rhythm. ──
  modern: [
    "hero", "register", "instagram", "stats", "values",
    "eboard", "schedule", "timeline", "testimonial",
    "spotlight", "about", "faq", "where", "cta",
  ],
  // ── Bold Banner — promotes the big-type stats + IG straight after the
  //    banner; high-contrast, poster-forward. ──────────────────────────────
  bold: [
    "hero", "stats", "instagram", "register", "values",
    "highlights", "eboard", "timeline", "schedule", "testimonial",
    "spotlight", "about", "faq", "where", "cta",
  ],
};

/**
 * The full set of section keys any template can render — the union of every
 * TEMPLATE_ORDER. Single source of truth for validating a section key coming
 * from the admin section-builder API (/api/admin/website/[section]) so an
 * unknown/typo key can never be persisted into the structured Section store.
 * Derived from TEMPLATE_ORDER so adding a section to a template's order
 * automatically widens the allow-list — they can never drift.
 */
export const KNOWN_SECTION_KEYS: readonly string[] = Array.from(
  new Set(Object.values(TEMPLATE_ORDER).flat()),
);

/** True when `key` is a section the renderer knows how to build. */
export function isKnownSectionKey(key: string): boolean {
  return KNOWN_SECTION_KEYS.includes(key);
}

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  blurb: string;
  /** Static mockup thumbnail in /public/templates/. */
  thumb: string;
  /**
   * Data-driven visual-system defaults (item 7). Each base template ships a
   * default component set + icon family so a template pick is a whole cohesive
   * system, not just a layout. Stored as plain ids (see lib/site-generator/*)
   * so the picker/preview/renderer resolve them without importing this .ts's
   * type — and new sets/families add without touching this file.
   */
  componentSet: string;
  iconFamily: string;
};

/** Gallery cards for the /admin/website Template Gallery. */
export const TEMPLATE_META: TemplateMeta[] = [
  {
    id: "classic",
    name: "Classic Crest",
    blurb:
      "The signature layout — an animated aurora hero with your crest, photo collage, and the full section stack. Timeless and conversion-tested.",
    thumb: "/templates/classic.svg",
    componentSet: "refined",
    iconFamily: "brand",
  },
  {
    id: "modern",
    name: "Modern Split",
    blurb:
      "An asymmetric split hero — copy on the left, photo collage on the right — with a gold accent rhythm. Form and Instagram lead the page.",
    thumb: "/templates/modern.svg",
    componentSet: "refined",
    iconFamily: "brand",
  },
  {
    id: "bold",
    name: "Bold Banner",
    blurb:
      "A full-bleed photo banner with a centered, poster-scale headline and big-type stats up top. High-contrast and unmistakable.",
    thumb: "/templates/bold.svg",
    componentSet: "brutal",
    iconFamily: "tabler",
  },
];
