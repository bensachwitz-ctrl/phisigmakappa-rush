// template-presets.ts — the DATA-DRIVEN template catalog (item 7).
//
// A "template" the chapter picks is a whole visual SYSTEM = a base layout (an
// existing renderer hero + section order) × a component set × an icon family ×
// an accent/motion treatment. Expressing templates as PRESETS over those axes
// means new templates add with ZERO code changes — just another entry here — and
// each one is a genuinely distinct look (per the taste rule: no two presets share
// the same layout family + component set). This is the extensible engine the
// picker, live preview, and renderer all read.
//
// Framework-free: `baseTemplate` is the existing renderer TemplateId (so the
// public renderer already knows how to draw it); the preset layers the component
// set + icon family + accent/motion on top via cfg keys the preview/renderer
// progressively apply. Pure-node importable (no tsx).

import type { TemplateId } from "@/components/site/templates/types";
import { resolveTemplateId } from "@/components/site/templates/template-orders";
import {
  type ComponentSetId,
  resolveComponentSet,
} from "@/lib/site-generator/component-sets";
import {
  type IconFamilyId,
  resolveIconFamily,
} from "@/lib/site-generator/icon-families";

/** Motion treatment a preset requests. All are reduced-motion + GPU-safe. */
export type MotionTreatment = "restrained" | "reveal" | "cinematic";

export interface TemplatePreset {
  /** Stable preset id (persisted to cfg["website.preset"]). */
  id: string;
  /** Picker label. */
  name: string;
  /** One-line description for the picker card. */
  blurb: string;
  /** Which distinct LAYOUT FAMILY this reads as (taste: keep these varied). */
  family:
    | "classic" | "modern" | "bold" | "editorial" | "minimal" | "photo"
    | "cinematic" | "gallery" | "zine" | "civic";
  /** The existing renderer template this preset draws with. */
  baseTemplate: TemplateId;
  /** The cohesive component set (buttons/cards/nav/badges/inputs). */
  componentSet: ComponentSetId;
  /** The ONE icon family the output uses. */
  iconFamily: IconFamilyId;
  /** Motion treatment (all honor prefers-reduced-motion + use GPU transforms). */
  motion: MotionTreatment;
  /** Static thumbnail in /public/templates/. */
  thumb: string;
}

/**
 * The template catalog — 10 distinct presets across 10 layout families. A preset
 * is a whole SYSTEM = base hero layout × component set × icon family × motion, so
 * each reads as a genuinely different template even though they compose the three
 * base heroes. INVARIANTS (proven by test): no family repeats, and no two presets
 * share both family AND component set — so every pick is a visibly different look.
 * Exactly one preset (`cinematic`) is the 2.5D depth treatment (item 6). Adding
 * an 11th is pure data: append an entry with a fresh family + component-set combo.
 */
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "classic-crest",
    name: "Classic Crest",
    blurb: "Animated aurora hero with your crest, photo collage, and the full section stack. Timeless and conversion-tested.",
    family: "classic",
    baseTemplate: "classic",
    componentSet: "refined",
    iconFamily: "brand",
    motion: "restrained",
    thumb: "/templates/classic.svg",
  },
  {
    id: "modern-split",
    name: "Modern Split",
    blurb: "Asymmetric split hero — copy left, photo collage right — with a gold accent rhythm. Form and Instagram lead.",
    family: "modern",
    baseTemplate: "modern",
    componentSet: "refined",
    iconFamily: "brand",
    motion: "reveal",
    thumb: "/templates/modern.svg",
  },
  {
    id: "bold-banner",
    name: "Bold Banner",
    blurb: "Full-bleed photo banner, poster-scale headline, big-type stats. Hard edges and offset shadows.",
    family: "bold",
    baseTemplate: "bold",
    componentSet: "brutal",
    iconFamily: "tabler",
    motion: "restrained",
    thumb: "/templates/bold.svg",
  },
  {
    id: "editorial",
    name: "Editorial",
    blurb: "Magazine layout — serif headlines, generous whitespace, thin rules, underlined links. Quietly confident.",
    family: "editorial",
    baseTemplate: "modern",
    componentSet: "editorial",
    iconFamily: "phosphor",
    motion: "reveal",
    thumb: "/templates/editorial.svg",
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "Text-first and near-borderless. Lets your photography carry the page with the lightest possible chrome.",
    family: "minimal",
    baseTemplate: "classic",
    componentSet: "minimal",
    iconFamily: "brand",
    motion: "restrained",
    thumb: "/templates/minimal.svg",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    blurb: "Full-bleed imagery with subtle 2.5D depth and scroll-reveals. Immersive, and vestibular-safe on reduced-motion.",
    family: "cinematic",
    baseTemplate: "bold",
    componentSet: "soft",
    iconFamily: "hugeicons",
    motion: "cinematic",
    thumb: "/templates/cinematic.svg",
  },
  {
    id: "photo-story",
    name: "Photo Story",
    blurb: "Photography leads every section with pill-soft chrome and airy spacing. Let your best chapter shots carry the page.",
    family: "photo",
    baseTemplate: "modern",
    componentSet: "soft",
    iconFamily: "radix",
    motion: "reveal",
    thumb: "/templates/photo-story.svg",
  },
  {
    id: "gallery-grid",
    name: "Gallery Grid",
    blurb: "A poster banner over a tidy card grid with hairline borders. Structured and gallery-like, calm and confident.",
    family: "gallery",
    baseTemplate: "bold",
    componentSet: "refined",
    iconFamily: "phosphor",
    motion: "reveal",
    thumb: "/templates/gallery-grid.svg",
  },
  {
    id: "zine",
    name: "Zine",
    blurb: "Poster-scale banner with serif headlines, thin rules, and hard edges. Reads like a printed recruitment zine.",
    family: "zine",
    baseTemplate: "bold",
    componentSet: "editorial",
    iconFamily: "phosphor",
    motion: "reveal",
    thumb: "/templates/zine.svg",
  },
  {
    id: "civic-crest",
    name: "Civic Crest",
    blurb: "The Classic crest hero with block-bold buttons and offset shadows. Institutional weight with a loud, unmistakable voice.",
    family: "civic",
    baseTemplate: "classic",
    componentSet: "brutal",
    iconFamily: "tabler",
    motion: "restrained",
    thumb: "/templates/civic-crest.svg",
  },
];

export const TEMPLATE_PRESET_IDS = TEMPLATE_PRESETS.map((p) => p.id);

const BY_ID: Record<string, TemplatePreset> = Object.fromEntries(
  TEMPLATE_PRESETS.map((p) => [p.id, p]),
);

export const DEFAULT_PRESET_ID = "classic-crest";

/** Coerce a stored preset id to a known preset (unknown/empty → Classic Crest). */
export function resolveTemplatePreset(raw: string | null | undefined): TemplatePreset {
  return (raw && BY_ID[raw]) || BY_ID[DEFAULT_PRESET_ID];
}

/**
 * Resolve the full render config for a chapter from its stored cfg. A chapter
 * may have picked a preset (new path) OR only a legacy base template + separate
 * component-set / icon-family overrides (progressive path) — this reconciles
 * both into one authoritative, always-valid shape the renderer/preview consume.
 */
export interface ResolvedSiteConfig {
  presetId: string;
  baseTemplate: TemplateId;
  componentSet: ComponentSetId;
  iconFamily: IconFamilyId;
  motion: MotionTreatment;
}

export function resolveSiteConfig(cfg: Record<string, string | undefined>): ResolvedSiteConfig {
  const preset = cfg["website.preset"] ? resolveTemplatePreset(cfg["website.preset"]) : null;
  // Explicit per-axis overrides win over the preset default (so a chapter can
  // start from a preset then tweak the component set or icons independently).
  const baseTemplate = resolveTemplateId(cfg["website.template"] ?? preset?.baseTemplate);
  const componentSet = resolveComponentSet(cfg["website.componentSet"] ?? preset?.componentSet);
  const iconFamily = resolveIconFamily(cfg["website.iconFamily"] ?? preset?.iconFamily);
  const motion = (preset?.motion ?? "restrained") as MotionTreatment;
  return {
    presetId: preset?.id ?? DEFAULT_PRESET_ID,
    baseTemplate,
    componentSet,
    iconFamily,
    motion,
  };
}
