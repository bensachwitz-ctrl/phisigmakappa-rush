import { describe, it, expect } from "vitest";
import {
  chapterIdentityFromCfg,
  termsForOrgType,
  APEX_IDENTITY,
} from "@/lib/chapter-identity";

// ---------------------------------------------------------------------------
// lib/chapter-identity.ts — white-label identity derivation.
//
// THE multi-tenant brand-safety invariant: an empty/unconfigured cfg must NEVER
// resolve to the reference chapter ("Phi Sigma Kappa" / USC). Everything falls
// back to NEUTRAL placeholders, and the apex identity is brand-less Greekstack.
// A regression here re-leaks one chapter's brand onto another tenant or the apex.
// ---------------------------------------------------------------------------

describe("chapterIdentityFromCfg({}) — neutral fallbacks, never the reference chapter", () => {
  const id = chapterIdentityFromCfg({});

  it("never falls back to the Phi Sig reference brand", () => {
    expect(id.fraternityName).not.toMatch(/Phi Sig/i);
    expect(id.nationalName).not.toMatch(/Phi Sig/i);
    expect(id.chapterFullName).not.toMatch(/Phi Sig/i);
    expect(id.pageTitle).not.toMatch(/Phi Sig/i);
    expect(id.schoolName).not.toMatch(/South Carolina/i);
    expect(id.schoolShort).not.toMatch(/USC/i);
  });

  it("uses a generic neutral chapter-name placeholder", () => {
    expect(id.fraternityName).toBe("Your Chapter");
    expect(id.fraternityShort).toBe("Your Chapter"); // falls back to fraternityName
    expect(id.nationalName).toBe("Your Chapter"); // falls back to fraternityName
  });

  it("defaults orgType to fraternity (renders identically to original copy)", () => {
    expect(id.orgType).toBe("fraternity");
    expect(id.terms.member).toBe("Brother");
  });

  it("leaves school / year / glyph fields blank rather than inventing values", () => {
    expect(id.greekLetters).toBe("");
    expect(id.greekLettersGlyphs).toBe("");
    expect(id.schoolName).toBe("");
    expect(id.schoolShort).toBe("");
    expect(id.schoolUrl).toBe("");
    expect(id.charterYear).toBe("");
    expect(id.foundingYear).toBe("");
    expect(id.fraternityLetters).toBe("");
  });

  it("derives chapterFullName / pageTitle / ogAlt gracefully when fields are empty", () => {
    // No greekLetters → chapterFullName is just the (neutral) fraternity name.
    expect(id.chapterFullName).toBe("Your Chapter");
    // No schoolShort → pageTitle has no " — Rush at X" suffix, no dangling dash.
    expect(id.pageTitle).toBe("Your Chapter");
    expect(id.pageTitle).not.toContain("—");
    // No schoolShort → ogAlt is just the name, no "@ X".
    expect(id.ogAlt).toBe("Your Chapter");
    expect(id.ogAlt).not.toContain("@");
    // chapterAttribution joins [short, schoolShort] — schoolShort blank → just short.
    expect(id.chapterAttribution).toBe("Your Chapter");
  });
});

describe("chapterIdentityFromCfg — derived fields with real values", () => {
  it("joins fraternityName + greekLetters into chapterFullName", () => {
    const id = chapterIdentityFromCfg({
      "chapter.fraternityName": "Beta Sigma",
      "chapter.greekLetters": "Alpha Theta",
      "chapter.schoolShort": "UMD",
    });
    expect(id.chapterFullName).toBe("Beta Sigma Alpha Theta");
    expect(id.pageTitle).toBe("Beta Sigma Alpha Theta — Rush at UMD");
    expect(id.ogAlt).toBe("Beta Sigma @ UMD");
  });

  it("re-genders the recruit term via orgType (sorority → Recruitment)", () => {
    const id = chapterIdentityFromCfg({
      "chapter.fraternityName": "Delta Delta Delta",
      "chapter.orgType": "sorority",
    });
    expect(id.terms.recruit).toBe("Recruitment");
    expect(id.terms.member).toBe("Sister");
    expect(id.terms.collective).toBe("Sisterhood");
  });
});

describe("termsForOrgType — member vocabulary per org type", () => {
  it("fraternity → Brother / Brotherhood / son / Rush", () => {
    const t = termsForOrgType("fraternity");
    expect(t).toMatchObject({
      member: "Brother", members: "Brothers", collective: "Brotherhood",
      relative: "son", recruit: "Rush",
    });
  });

  it("sorority → Sister / Sisterhood / daughter / Recruitment", () => {
    const t = termsForOrgType("sorority");
    expect(t).toMatchObject({
      member: "Sister", members: "Sisters", collective: "Sisterhood",
      relative: "daughter", recruit: "Recruitment",
    });
  });

  it("professional → neutral Member / Membership / student / Recruitment", () => {
    const t = termsForOrgType("professional");
    expect(t).toMatchObject({
      member: "Member", members: "Members", collective: "Membership",
      relative: "student", recruit: "Recruitment",
    });
  });

  it("other → neutral Member set", () => {
    expect(termsForOrgType("other").member).toBe("Member");
  });

  it("an unrecognized org type falls back to the neutral Member set", () => {
    const t = termsForOrgType("co-ed-honor-society");
    expect(t.member).toBe("Member");
    expect(t.collective).toBe("Membership");
    expect(t.recruit).toBe("Recruitment");
  });

  it("lowercase variants are present and consistent", () => {
    const f = termsForOrgType("fraternity");
    expect(f.memberLower).toBe("brother");
    expect(f.membersLower).toBe("brothers");
  });
});

describe("APEX_IDENTITY — brand-less marketing apex", () => {
  it('is "Greekstack", never a specific chapter', () => {
    expect(APEX_IDENTITY.fraternityName).toBe("Greekstack");
    expect(APEX_IDENTITY.nationalName).toBe("Greekstack");
    expect(APEX_IDENTITY.appShortTitle).toBe("Greekstack");
    expect(APEX_IDENTITY.fraternityName).not.toMatch(/Phi Sig/i);
  });

  it('uses the neutral "other" org type so stray member-nouns read inclusively', () => {
    expect(APEX_IDENTITY.orgType).toBe("other");
    expect(APEX_IDENTITY.terms.member).toBe("Member");
    expect(APEX_IDENTITY.terms.member).not.toBe("Brother");
  });

  it("carries no chapter-specific school or greek-letter identity", () => {
    expect(APEX_IDENTITY.schoolName).toBe("");
    expect(APEX_IDENTITY.schoolShort).toBe("");
    expect(APEX_IDENTITY.greekLetters).toBe("");
    expect(APEX_IDENTITY.chapterFullName).toBe("Greekstack");
  });
});
