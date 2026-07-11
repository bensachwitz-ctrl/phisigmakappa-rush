// icon-families.ts — DECLARATIVE, selectable icon-family registry (item 7).
//
// The site generator offers a choice of icon families, but a taste rule governs
// the OUTPUT: each generated chapter page renders exactly ONE family (mixing
// families in a single page looks incoherent). So this registry exposes all
// families as CHOICES while `resolveIconFamily` guarantees a single, valid
// family per output and every family carries a STANDARDIZED strokeWidth so a
// page's icons read as one set.
//
// Framework-free (no React import): each entry is metadata + the npm package the
// renderer imports lazily when that family is selected. The default family is
// the app's own bespoke brand set (always available, offline-safe); the four
// external families are the taste-approved libraries (never lucide, never a
// hand-rolled path).

export type IconFamilyId = "brand" | "phosphor" | "hugeicons" | "radix" | "tabler";

export interface IconFamily {
  id: IconFamilyId;
  /** Human label for the picker. */
  label: string;
  /** npm package the renderer imports when this family is selected (null = built-in). */
  pkg: string | null;
  /**
   * The ONE strokeWidth every icon on the page uses when this family is picked.
   * Radix icons are solid (no stroke) → null. Standardizing this is the taste
   * rule: a page never mixes stroke weights.
   */
  strokeWidth: number | null;
  /** One-line description for the picker card. */
  blurb: string;
  /** Whether the package is bundled/installed today (renderable now). */
  available: boolean;
}

/**
 * The selectable icon families. `brand` is the default (the app's bespoke
 * @/components/brand/icons set — always available). The four external families
 * are taste-approved choices; they render once their package is added.
 */
export const ICON_FAMILIES: IconFamily[] = [
  {
    id: "brand",
    label: "GreekStack (bespoke)",
    pkg: null,
    strokeWidth: 1.75,
    blurb: "The app's own hand-tuned icon set. Always available, offline-safe.",
    available: true,
  },
  {
    id: "phosphor",
    label: "Phosphor",
    pkg: "@phosphor-icons/react",
    strokeWidth: 1.5,
    blurb: "Flexible, friendly line icons with an even weight.",
    available: true,
  },
  {
    id: "hugeicons",
    label: "Hugeicons",
    pkg: "hugeicons-react",
    strokeWidth: 1.5,
    blurb: "A large, modern stroke set with a crisp geometric feel.",
    available: true,
  },
  {
    id: "radix",
    label: "Radix Icons",
    pkg: "@radix-ui/react-icons",
    strokeWidth: null, // solid, no stroke
    blurb: "Minimal 15px solid icons — precise and restrained.",
    available: true,
  },
  {
    id: "tabler",
    label: "Tabler",
    pkg: "@tabler/icons-react",
    strokeWidth: 2,
    blurb: "A big, consistent 2px-stroke set with wide coverage.",
    available: true,
  },
];

export const ICON_FAMILY_IDS = ICON_FAMILIES.map((f) => f.id) as readonly IconFamilyId[];

const BY_ID: Record<string, IconFamily> = Object.fromEntries(
  ICON_FAMILIES.map((f) => [f.id, f]),
);

export const DEFAULT_ICON_FAMILY: IconFamilyId = "brand";

/**
 * Coerce an arbitrary stored value to a valid IconFamilyId. Unknown/empty →
 * the bespoke default. Enforces the one-family-per-output contract: the return
 * is always exactly ONE family, never a mix.
 */
export function resolveIconFamily(raw: string | null | undefined): IconFamilyId {
  return raw && (ICON_FAMILY_IDS as readonly string[]).includes(raw)
    ? (raw as IconFamilyId)
    : DEFAULT_ICON_FAMILY;
}

/** Full metadata (incl. the standardized strokeWidth) for a family. */
export function getIconFamily(raw: string | null | undefined): IconFamily {
  return BY_ID[resolveIconFamily(raw)];
}

/** The standardized strokeWidth for a family (null for solid families). */
export function iconStrokeWidth(raw: string | null | undefined): number | null {
  return getIconFamily(raw).strokeWidth;
}
