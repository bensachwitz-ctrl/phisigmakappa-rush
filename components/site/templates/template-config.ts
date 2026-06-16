import type React from "react";
import type { SectionContext, TemplateId } from "./types";
import { HeroClassic } from "./hero-classic";
import { HeroSplit } from "./hero-split";
import { HeroBanner } from "./hero-banner";

/**
 * template-config.ts — the renderer-facing template config. It re-exports the
 * PURE data (orders / meta / ids / resolver) from template-orders.ts and adds the
 * only piece that pulls in React components: TEMPLATE_HERO, the per-template hero
 * variant map. Keeping the data in template-orders.ts lets pure-node tests and
 * the customizer import orders/meta WITHOUT dragging the hero .tsx tree in.
 *
 * The 15 section BODIES are identical across templates (buildSectionMap); a
 * template only changes the hero (TEMPLATE_HERO) + the default order
 * (TEMPLATE_ORDER) + a few thin per-section layout-variant CLASS hints.
 */

export {
  TEMPLATE_IDS,
  TEMPLATE_ORDER,
  TEMPLATE_META,
  resolveTemplateId,
  type TemplateMeta,
} from "./template-orders";

/** The hero variant each template renders. The ONLY structural swap. */
export const TEMPLATE_HERO: Record<
  TemplateId,
  (ctx: SectionContext) => React.ReactNode
> = {
  classic: HeroClassic,
  modern: HeroSplit,
  bold: HeroBanner,
};
