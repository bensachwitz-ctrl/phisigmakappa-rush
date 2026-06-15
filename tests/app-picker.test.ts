import { describe, it, expect } from "vitest";
import {
  buildPickerChapters,
  groupPickerBySchool,
  singleTenantPreselect,
  resolveChapterBrand,
  presetBrandIdForChapter,
  findSchoolColors,
  normalizeRealChapter,
  normalizeDemoChapter,
  pickerChapterMatches,
  type RealChapterInput,
} from "@/lib/app-picker";
import { DEMO_TENANTS, FRATERNITY_BRANDS } from "@/app/app/_demo/mock-data";

/**
 * Unit coverage for the iOS /app cold-start School → Chapter picker logic.
 * Pure functions only — merge/dedupe, school grouping, brand derivation, and the
 * single-tenant preselect that must never regress the live Phi-Sig flow.
 */

const REAL_PHISIG: RealChapterInput = {
  id: "cuid-phisig",
  subdomain: "phisig",
  name: "Phi Sigma Kappa",
  school: "University of South Carolina",
  domain: null,
  isActive: true,
};

describe("buildPickerChapters — merge real + demo", () => {
  it("returns demo chapters when there are no real chapters (never empty)", () => {
    const out = buildPickerChapters([]);
    expect(out.length).toBe(DEMO_TENANTS.length);
    expect(out.every((c) => c.source === "demo")).toBe(true);
  });

  it("puts real chapters first, then demo chapters", () => {
    const out = buildPickerChapters([REAL_PHISIG]);
    expect(out[0].source).toBe("real");
    expect(out[0].subdomain).toBe("phisig");
    // demo chapters still merged in (default includeDemos = true)
    expect(out.some((c) => c.source === "demo")).toBe(true);
    expect(out.length).toBe(1 + DEMO_TENANTS.length);
  });

  it("dedupes by subdomain — a real row WINS over a same-subdomain demo", () => {
    // DEMO_TENANTS includes subdomain "psk"; a real "psk" must shadow the demo.
    const real: RealChapterInput = { subdomain: "psk", name: "Phi Sigma Kappa", school: "University of South Carolina", isActive: true };
    const out = buildPickerChapters([real]);
    const psk = out.filter((c) => c.subdomain === "psk");
    expect(psk.length).toBe(1);
    expect(psk[0].source).toBe("real");
  });

  it("drops inactive real rows", () => {
    const out = buildPickerChapters([{ ...REAL_PHISIG, isActive: false }]);
    expect(out.some((c) => c.subdomain === "phisig")).toBe(false);
  });

  it("drops rows with no subdomain", () => {
    const out = buildPickerChapters([{ subdomain: "" } as RealChapterInput]);
    expect(out.every((c) => !!c.subdomain)).toBe(true);
  });

  it("includeDemos:false omits demos when there ARE real chapters", () => {
    const out = buildPickerChapters([REAL_PHISIG], { includeDemos: false });
    expect(out.length).toBe(1);
    expect(out[0].source).toBe("real");
  });

  it("includeDemos:false STILL falls back to demos when there are zero real", () => {
    const out = buildPickerChapters([], { includeDemos: false });
    expect(out.length).toBe(DEMO_TENANTS.length);
  });
});

describe("groupPickerBySchool — only schools with chapters", () => {
  it("buckets chapters under their school and the set is non-empty", () => {
    const chapters = buildPickerChapters([REAL_PHISIG]);
    const groups = groupPickerBySchool(chapters);
    expect(groups.length).toBeGreaterThan(0);
    const usc = groups.find((g) => g.school === "University of South Carolina");
    expect(usc).toBeTruthy();
    // both the real phisig AND the demo psk live at USC
    expect(usc!.chapters.some((c) => c.subdomain === "phisig")).toBe(true);
  });

  it("every grouped school has at least one chapter", () => {
    const groups = groupPickerBySchool(buildPickerChapters([]));
    expect(groups.every((g) => g.chapters.length >= 1)).toBe(true);
  });
});

describe("singleTenantPreselect — never regress single-tenant Phi-Sig", () => {
  it("preselects the lone REAL chapter", () => {
    const out = buildPickerChapters([REAL_PHISIG], { includeDemos: false });
    const sole = singleTenantPreselect(out);
    expect(sole).toBeTruthy();
    expect(sole!.subdomain).toBe("phisig");
  });

  it("does NOT preselect when only demo chapters exist", () => {
    const out = buildPickerChapters([]);
    expect(singleTenantPreselect(out)).toBeNull();
  });

  it("does NOT preselect when multiple real chapters exist", () => {
    const out = buildPickerChapters(
      [REAL_PHISIG, { subdomain: "sigchi-real", name: "Sigma Chi", school: "Clemson University", isActive: true }],
      { includeDemos: false },
    );
    expect(singleTenantPreselect(out)).toBeNull();
  });

  it("currentSubdomain (deploy already on a chapter host) takes precedence", () => {
    const out = buildPickerChapters([REAL_PHISIG]); // many chapters (incl demos)
    const sole = singleTenantPreselect(out, "phisig");
    expect(sole).toBeTruthy();
    expect(sole!.subdomain).toBe("phisig");
  });

  it("returns null on an empty list", () => {
    expect(singleTenantPreselect([])).toBeNull();
  });
});

describe("brand derivation", () => {
  it("matches preset org brands by name", () => {
    expect(presetBrandIdForChapter("Phi Sigma Kappa", "phisig")).toBe("phi-sig");
    expect(presetBrandIdForChapter("Sigma Chi", "sigchi")).toBe("sig-chi");
    expect(presetBrandIdForChapter("Kappa Sigma", "kapsig")).toBe("kap-sig");
    expect(presetBrandIdForChapter("Alpha Tau Omega", "ato")).toBe("ato");
    expect(presetBrandIdForChapter("Sigma Alpha Epsilon", "sae")).toBe("sae");
    expect(presetBrandIdForChapter("Beta Theta Pi", "beta")).toBe("beta");
  });

  it("returns null for an unrecognized org", () => {
    expect(presetBrandIdForChapter("Delta Gamma Whatever", "dgw")).toBeNull();
  });

  it("resolveChapterBrand returns a preset for a known org", () => {
    const b = resolveChapterBrand({ name: "Phi Sigma Kappa", subdomain: "phisig", school: "University of South Carolina" });
    expect(b.id).toBe("phi-sig");
    expect(FRATERNITY_BRANDS.some((x) => x.id === b.id)).toBe(true);
  });

  it("resolveChapterBrand synthesizes a brand from school colors for an unknown org", () => {
    const b = resolveChapterBrand({ name: "Some Local Society", subdomain: "sls", school: "Clemson University" });
    // Clemson colors → a valid #rrggbb primary, not the default phi-sig red.
    expect(b.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("resolveChapterBrand falls back to the first preset when nothing matches", () => {
    const b = resolveChapterBrand({ name: "Unknown", subdomain: "x", school: "Not A Real School 99999" });
    expect(b.id).toBe(FRATERNITY_BRANDS[0].id);
  });

  it("findSchoolColors resolves real schools (USC) and tolerates short names", () => {
    expect(findSchoolColors("University of South Carolina")).not.toBeNull();
    expect(findSchoolColors("Clemson University")).not.toBeNull();
    expect(findSchoolColors("Definitely Not A School")).toBeNull();
  });
});

describe("normalization + matching", () => {
  it("normalizeRealChapter tags source=real and carries domain", () => {
    const c = normalizeRealChapter({ subdomain: "phisig", name: "Phi Sigma Kappa", school: "University of South Carolina", domain: "phisig.org" });
    expect(c.source).toBe("real");
    expect(c.domain).toBe("phisig.org");
    expect(c.brand.id).toBe("phi-sig");
  });

  it("normalizeDemoChapter tags source=demo with null domain", () => {
    const c = normalizeDemoChapter(DEMO_TENANTS[0]);
    expect(c.source).toBe("demo");
    expect(c.domain).toBeNull();
  });

  it("pickerChapterMatches matches name, school, and subdomain; empty query matches all", () => {
    const c = normalizeRealChapter(REAL_PHISIG);
    expect(pickerChapterMatches(c, "")).toBe(true);
    expect(pickerChapterMatches(c, "phi")).toBe(true);
    expect(pickerChapterMatches(c, "south carolina")).toBe(true);
    expect(pickerChapterMatches(c, "phisig")).toBe(true);
    expect(pickerChapterMatches(c, "zzz-nope")).toBe(false);
  });
});
