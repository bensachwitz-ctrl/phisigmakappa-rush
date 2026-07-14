/**
 * lib/app-picker.ts — pure logic for the iOS /app cold-start School → Chapter picker.
 * ─────────────────────────────────────────────────────────────────────────────
 * The native shell (capacitor.config.ts server.url = greekstack.vercel.app/app)
 * loads /app. On a COLD start (no `?demo`, no saved session) the very first
 * screen must be a clean, SCHOOL-grouped chapter picker built from the central
 * `Tenant` registry — not the brand-grouped demo showcase. This module holds the
 * pure, isomorphic logic that picker surface AND the vitest suite both consume:
 *
 *   • normalize a registry row + a demo tenant into one `PickerChapter` shape,
 *   • merge real DB chapters with the inert DEMO_TENANTS (deduped by subdomain,
 *     real wins) so the picker is never empty even on a fresh DB,
 *   • derive each chapter's brand (preset FraternityBrand by org name, else a
 *     brand synthesized from the school's colors via lib/schools.ts), and
 *   • group the merged set BY SCHOOL — only schools that actually HAVE ≥1 active
 *     chapter — reusing groupChaptersBySchool from lib/login-routing.
 *
 * PURE + side-effect-free at import time: no `next/headers`, no DB, no DOM. Safe
 * to import from a server page, a client surface, and a node test runner alike.
 */

import {
  FRATERNITY_BRANDS,
  DEMO_TENANTS,
  makeCustomBrand,
  brandSecondary,
  type FraternityBrand,
  type Tenant,
} from "@/app/app/_demo/mock-data";
import { SCHOOLS } from "@/lib/schools";
import {
  groupChaptersBySchool,
  type ChapterRouteTarget,
} from "@/lib/login-routing";

/**
 * The minimal real-chapter row the picker needs from the central Tenant
 * registry. `app/app/page.tsx` widens its `listActiveTenants()` select to pass
 * exactly this (subdomain/name/school always; domain/isActive when available).
 */
export interface RealChapterInput {
  id?: string;
  subdomain: string;
  name?: string | null;
  school?: string | null;
  domain?: string | null;
  isActive?: boolean;
}

/**
 * A picker-ready chapter: routing identity (subdomain/domain) + display
 * (name/school) + the resolved brand + an explicit `source` so the UI can badge
 * "Demo" vs "Live" and the orchestrator can route demo→mock, live→real auth.
 */
export interface PickerChapter extends ChapterRouteTarget {
  /** Stable id (registry cuid for real rows, "demo-*" for demo). */
  id: string;
  subdomain: string;
  domain: string | null;
  name: string | null;
  school: string | null;
  /** Resolved brand for theming the per-chapter login + dashboard. */
  brand: FraternityBrand;
  /** `real` → POST /api/mobile/auth; `demo` → instant mock auto-login. */
  source: "real" | "demo";
}

/** Lowercased, trimmed string for tolerant matching. */
function lc(s: string | null | undefined): string {
  return (s || "").toLowerCase().trim();
}

/**
 * Map a chapter NAME (or subdomain) to one of the preset FraternityBrands. This
 * mirrors the ad-hoc inference that lived inline in MobileAppClient's
 * `allChapters` memo, centralized + reused. Returns the matched brand id or null
 * when nothing recognizable matches (caller then synthesizes from school colors).
 */
export function presetBrandIdForChapter(name: string | null | undefined, subdomain: string): string | null {
  const hay = `${lc(name)} ${lc(subdomain)}`;
  if (/\bsigma chi\b|\bsigchi\b/.test(hay)) return "sig-chi";
  if (/\bkappa sigma\b|\bkapsig\b/.test(hay)) return "kap-sig";
  if (/\balpha tau\b|\bato\b/.test(hay)) return "ato";
  if (/\bsigma alpha epsilon\b|\bsae\b/.test(hay)) return "sae";
  if (/\bbeta theta\b|\bbeta\b/.test(hay)) return "beta";
  if (/\bphi sig\b|\bphi sigma kappa\b|\bpsk\b/.test(hay)) return "phi-sig";
  return null;
}

/** Find a curated School row by (fuzzy) name match, for color derivation. */
export function findSchoolColors(school: string | null | undefined): [string, string] | null {
  const q = lc(school);
  if (!q) return null;
  // Exact, then "contains either way" so "USC"/"University of South Carolina"
  // and "Univ. of Georgia"/"University of Georgia" still resolve.
  let hit = SCHOOLS.find((s) => lc(s.name) === q || lc(s.short) === q);
  if (!hit) hit = SCHOOLS.find((s) => lc(s.name).includes(q) || q.includes(lc(s.name)));
  if (!hit) hit = SCHOOLS.find((s) => lc(s.short) && (q.includes(lc(s.short)) || lc(s.short).includes(q)));
  return hit ? hit.colors : null;
}

/**
 * Resolve the FraternityBrand to theme a chapter's login + dashboard.
 *   1. An explicit preset (org-name match) — the richest, hand-tuned brands.
 *   2. Else synthesize a brand from the chapter's SCHOOL colors (lib/schools.ts),
 *      so a real chapter with no recognizable org still themes to its campus.
 *   3. Else fall back to the generic Greek Stack brand preset — never undefined.
 */
export function resolveChapterBrand(input: { name?: string | null; subdomain: string; school?: string | null; brandId?: string | null }): FraternityBrand {
  const presetId = input.brandId || presetBrandIdForChapter(input.name, input.subdomain);
  if (presetId) {
    const preset = FRATERNITY_BRANDS.find((b) => b.id === presetId);
    if (preset) return preset;
  }
  const colors = findSchoolColors(input.school);
  if (colors) {
    const [primary, secondary] = colors;
    return makeCustomBrand({
      name: input.name || "Chapter",
      // The picker has no per-chapter Greek letters from the registry; derive a
      // monogram from the chapter name's capital initials, falling back to GS.
      letters: lettersFromName(input.name) || "GS",
      primaryColor: primary,
      secondaryColor: secondary && /^#([0-9a-fA-F]{6})$/.test(secondary) ? secondary : undefined,
    });
  }
  return FRATERNITY_BRANDS[0];
}

/**
 * Cheap Greek-letter monogram from a chapter name: if the name already contains
 * Greek glyphs, keep them; else map leading capitals of recognizable words. Used
 * only as a soft visual when no preset brand + no explicit letters exist.
 */
export function lettersFromName(name: string | null | undefined): string {
  const raw = (name || "").trim();
  if (!raw) return "";
  const greek = raw.match(/[Ͱ-Ͽἀ-῿]/g);
  if (greek && greek.length) return greek.join("");
  return "";
}

/** Normalize one real registry row into a PickerChapter. */
export function normalizeRealChapter(row: RealChapterInput): PickerChapter {
  const brand = resolveChapterBrand({ name: row.name, subdomain: row.subdomain, school: row.school });
  return {
    id: row.id || `real-${row.subdomain}`,
    subdomain: row.subdomain,
    domain: row.domain ?? null,
    name: row.name ?? null,
    school: row.school ?? null,
    brand,
    source: "real",
  };
}

/** Normalize one inert demo tenant into a PickerChapter (source = "demo"). */
export function normalizeDemoChapter(t: Tenant): PickerChapter {
  const brand = resolveChapterBrand({ name: t.name, subdomain: t.subdomain, school: t.school, brandId: t.brandId });
  return {
    id: t.id,
    subdomain: t.subdomain,
    domain: null,
    name: t.name,
    school: t.school,
    brand,
    source: "demo",
  };
}

export interface BuildPickerOptions {
  /**
   * When true, always merge the inert DEMO_TENANTS in (badged "Demo") so the
   * picker is never empty. When false, demo chapters are only used as a fallback
   * IF there are zero real chapters. Default: true (matches the live behavior
   * where the showcase orgs are always explorable).
   */
  includeDemos?: boolean;
}

/**
 * Build the full picker chapter list: real chapters first, then demo chapters
 * (deduped by subdomain — a real row ALWAYS wins over a same-subdomain demo so
 * the canonical live Phi-Sig chapter is "Live", never shadowed by the demo).
 */
export function buildPickerChapters(
  real: RealChapterInput[],
  opts: BuildPickerOptions = {},
): PickerChapter[] {
  const includeDemos = opts.includeDemos !== false;
  const realRows = (real || [])
    .filter((r) => r && !!r.subdomain && r.isActive !== false)
    .map(normalizeRealChapter);

  const realSubs = new Set(realRows.map((r) => r.subdomain.toLowerCase()));

  let demoRows: PickerChapter[] = [];
  if (includeDemos || realRows.length === 0) {
    demoRows = DEMO_TENANTS
      .filter((t) => !realSubs.has(t.subdomain.toLowerCase()))
      .map(normalizeDemoChapter);
  }

  return [...realRows, ...demoRows];
}

/**
 * The set of SCHOOLS that actually have ≥1 chapter in the picker, grouped (real
 * + demo merged). Reuses groupChaptersBySchool so the /app picker and the /login
 * web entry sort + bucket schools identically.
 */
export function groupPickerBySchool(chapters: PickerChapter[]) {
  return groupChaptersBySchool(chapters as ChapterRouteTarget[]) as Array<{
    school: string;
    chapters: PickerChapter[];
  }>;
}

/**
 * Single-tenant preselect (Step 6 — never regress the live Phi-Sig flow):
 * returns the lone chapter to auto-select when the picker has exactly one REAL
 * chapter (the common single-tenant deploy), else null. Demo-only lists do NOT
 * auto-select — a visitor exploring demos should still see the school list.
 *
 * `currentSubdomain` (the subdomain the deploy is already serving, from the
 * request Host) takes precedence: if the app is live on a chapter host, that
 * chapter is preselected even when the registry happens to list more.
 */
export function singleTenantPreselect(
  chapters: PickerChapter[],
  currentSubdomain?: string | null,
): PickerChapter | null {
  if (!chapters.length) return null;
  if (currentSubdomain) {
    const hosted = chapters.find(
      (c) => c.subdomain.toLowerCase() === currentSubdomain.toLowerCase(),
    );
    if (hosted) return hosted;
  }
  const realOnly = chapters.filter((c) => c.source === "real");
  if (realOnly.length === 1) return realOnly[0];
  return null;
}

/** Does a picker chapter match a free-text school/name/subdomain query? */
export function pickerChapterMatches(c: PickerChapter, query: string): boolean {
  const q = lc(query);
  if (!q) return true;
  return (
    lc(c.name).includes(q) ||
    lc(c.school).includes(q) ||
    lc(c.subdomain).includes(q)
  );
}

/** Re-export for surfaces that want the secondary color of a resolved brand. */
export { brandSecondary };
