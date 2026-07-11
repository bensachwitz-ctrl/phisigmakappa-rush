// component-sets.ts — DECLARATIVE component-set registry (item 7).
//
// A template choice is a whole visual SYSTEM, not just a layout: each template
// ships a component set that restyles buttons, cards, nav, badges, and inputs
// so the page reads as one cohesive design (this folds in the component-restyle
// task). A component set is pure DATA — Tailwind class strings the renderer +
// live preview apply to each primitive — so new sets add with zero code changes.
//
// Framework-free (class strings only). Anti-slop guarantees baked in: no
// gradient/glow button styles, one accent (the chapter brand color, referenced
// via the existing brand-* utilities), real radii, WCAG-safe defaults, 44px tap
// targets on the button set.

export type ComponentSetId = "refined" | "editorial" | "brutal" | "soft" | "minimal";

export interface ComponentSet {
  id: ComponentSetId;
  label: string;
  blurb: string;
  /** Corner-radius language for the whole system. */
  radius: "sharp" | "soft" | "round";
  /** Class strings for each primitive. The renderer composes these with the
   *  chapter's brand accent (brand-* utilities) so one accent locks the page. */
  button: string;
  card: string;
  nav: string;
  badge: string;
  input: string;
}

/**
 * The component sets. Each is a distinct, cohesive treatment. `refined` is the
 * conservative default (matches the current site language). None use gradients
 * or glows on interactive elements; the accent is always the brand color applied
 * via brand-* utilities, never a second hue.
 */
export const COMPONENT_SETS: ComponentSet[] = [
  {
    id: "refined",
    label: "Refined",
    blurb: "Soft-rounded cards, solid brand buttons, hairline borders. Conversion-tested default.",
    radius: "soft",
    button: "inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl px-5 font-semibold text-white bg-brand hover:bg-brand-dark transition-colors",
    card: "rounded-2xl border border-black/10 bg-white shadow-sm",
    nav: "backdrop-saturate-150 bg-white/85 border-b border-black/5",
    badge: "inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand",
    input: "min-h-[44px] w-full rounded-xl border border-black/10 bg-white px-3.5 focus:border-brand outline-none",
  },
  {
    id: "editorial",
    label: "Editorial",
    blurb: "Serif-forward, generous whitespace, underlined links, thin rules. Magazine feel.",
    radius: "sharp",
    button: "inline-flex items-center justify-center gap-2 min-h-[44px] rounded-none px-6 font-semibold text-white bg-brand hover:bg-brand-dark transition-colors",
    card: "rounded-none border-t-2 border-brand bg-white",
    nav: "bg-white border-b border-black/10",
    badge: "inline-flex items-center rounded-none border border-brand px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand",
    input: "min-h-[44px] w-full rounded-none border-b-2 border-black/15 bg-transparent px-1 focus:border-brand outline-none",
  },
  {
    id: "brutal",
    label: "Bold Block",
    blurb: "Hard edges, thick borders, offset shadows, flat fills. Loud and unmistakable.",
    radius: "sharp",
    button: "inline-flex items-center justify-center gap-2 min-h-[44px] rounded-md px-5 font-black text-white bg-brand border-2 border-black shadow-[3px_3px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition",
    card: "rounded-md border-2 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,0.9)]",
    nav: "bg-white border-b-2 border-black",
    badge: "inline-flex items-center rounded-md border-2 border-black bg-brand px-2 py-0.5 text-xs font-black text-white",
    input: "min-h-[44px] w-full rounded-md border-2 border-black bg-white px-3 focus:ring-2 focus:ring-brand outline-none",
  },
  {
    id: "soft",
    label: "Soft & Warm",
    blurb: "Pill buttons, big radii, low-contrast surfaces. Approachable and friendly.",
    radius: "round",
    button: "inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full px-6 font-semibold text-white bg-brand hover:bg-brand-dark transition-colors",
    card: "rounded-3xl border border-black/5 bg-black/[0.02]",
    nav: "bg-white/90 border-b border-black/5",
    badge: "inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand",
    input: "min-h-[44px] w-full rounded-full border border-black/10 bg-white px-4 focus:border-brand outline-none",
  },
  {
    id: "minimal",
    label: "Minimal",
    blurb: "Text-first, near-borderless, tight type. Lets photography carry the page.",
    radius: "soft",
    button: "inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg px-4 font-medium text-white bg-brand hover:bg-brand-dark transition-colors",
    card: "rounded-lg bg-white",
    nav: "bg-white",
    badge: "inline-flex items-center rounded-md bg-black/[0.04] px-2 py-0.5 text-xs font-medium text-black/70",
    input: "min-h-[44px] w-full rounded-lg border border-black/10 bg-white px-3 focus:border-brand outline-none",
  },
];

export const COMPONENT_SET_IDS = COMPONENT_SETS.map((s) => s.id) as readonly ComponentSetId[];

const BY_ID: Record<string, ComponentSet> = Object.fromEntries(
  COMPONENT_SETS.map((s) => [s.id, s]),
);

export const DEFAULT_COMPONENT_SET: ComponentSetId = "refined";

/** Coerce a stored value to a valid ComponentSetId (unknown/empty → default). */
export function resolveComponentSet(raw: string | null | undefined): ComponentSetId {
  return raw && (COMPONENT_SET_IDS as readonly string[]).includes(raw)
    ? (raw as ComponentSetId)
    : DEFAULT_COMPONENT_SET;
}

/** Full class-token set for a selection (always valid). */
export function getComponentSet(raw: string | null | undefined): ComponentSet {
  return BY_ID[resolveComponentSet(raw)];
}
