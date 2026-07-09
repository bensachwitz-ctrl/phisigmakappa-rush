import { getSiteConfig } from "@/lib/site-config";

/**
 * Single source of truth for chapter identity derived from SiteConfig.
 * Every server-side surface that needs "who is this chapter" — page metadata,
 * SMS replies, ICS feed, email From headers, JSON-LD, opengraph image alt —
 * imports from here so a re-brand for another chapter (Beta Sigma @ Maryland,
 * Epsilon @ Drexel, etc.) propagates without scattered string edits.
 *
 * Fallbacks are NEUTRAL platform placeholders (fraternityName "Your Chapter",
 * fraternityShort/national "Greekstack", empty greekLetters/foundingYear/school
 * — see APEX_IDENTITY and the `|| "Your Chapter"` fallbacks in
 * chapterIdentityFromCfg), NOT any specific reference chapter. A deploy without
 * cfg overrides renders the generic placeholders; a net-new chapter runs
 * /admin/setup once and every surface re-brands from its own SiteConfig.
 *
 * Use the typed `ChapterIdentity` shape so consumers can destructure exactly
 * the fields they need rather than passing the whole cfg around.
 */
/**
 * Org-type-aware member terminology. The apex marketing site claims Greekstack
 * works for "any fraternity OR sorority", but the product copy was hardcoded
 * male/frat ("Brothers", "Brotherhood", "son", "Rush"). This term set is derived
 * from `chapter.orgType` so a sorority renders "Sisters / Sisterhood / daughter /
 * Recruitment" and a professional/co-ed org renders neutral "Members / Membership
 * / student / Recruitment", all without per-string cfg keys. A FRATERNITY (the
 * default) keeps the exact original words, so a frat renders identically.
 */
export type ChapterTerms = {
  member: string;        // "Brother" | "Sister" | "Member"
  members: string;       // "Brothers" | "Sisters" | "Members"
  collective: string;    // "Brotherhood" | "Sisterhood" | "Membership"
  memberLower: string;   // "brother" | "sister" | "member"
  membersLower: string;  // "brothers" | "sisters" | "members"
  relative: string;      // "son" | "daughter" | "student"
  recruit: string;       // "Rush" | "Recruitment"
};

/** Recognized organization types for the terminology layer. */
export type ChapterOrgType = "fraternity" | "sorority" | "professional" | "other";

/**
 * Build the member-noun term set for an org type. Anything that isn't a known
 * fraternity/sorority (professional, co-ed, or unset/"other") gets the neutral
 * "Member / Membership / student / Recruitment" set. Pure + side-effect-free so
 * it's safe to call from server and (via the identity object) client surfaces.
 */
export function termsForOrgType(orgType: string): ChapterTerms {
  switch (orgType) {
    case "sorority":
      return {
        member: "Sister", members: "Sisters", collective: "Sisterhood",
        memberLower: "sister", membersLower: "sisters",
        relative: "daughter", recruit: "Recruitment",
      };
    case "fraternity":
      return {
        member: "Brother", members: "Brothers", collective: "Brotherhood",
        memberLower: "brother", membersLower: "brothers",
        relative: "son", recruit: "Rush",
      };
    // "professional" | "other" | anything unrecognized → neutral, inclusive set.
    default:
      return {
        member: "Member", members: "Members", collective: "Membership",
        memberLower: "member", membersLower: "members",
        relative: "student", recruit: "Recruitment",
      };
  }
}

export type ChapterIdentity = {
  fraternityName: string;       // "Phi Sigma Kappa"
  fraternityShort: string;      // "Phi Sig"
  orgType: string;              // "fraternity" | "sorority" | "professional" | "other"
  terms: ChapterTerms;          // member-noun vocabulary derived from orgType
  greekLetters: string;         // "Gamma Triton"
  greekLettersGlyphs: string;   // "ΓΤ"
  schoolName: string;           // "University of South Carolina"
  schoolShort: string;          // "USC"
  schoolUrl: string;            // "https://sc.edu"
  charterYear: string;          // "1975"
  foundingYear: string;         // "1873"
  foundingLocation: string;     // "Massachusetts Agricultural College"
  nationalName: string;         // "Phi Sigma Kappa"
  nationalHqUrl: string;        // "https://phisigmakappa.org"
  cardinalPrinciples: string;   // "Brotherhood, Scholarship, Character"
  tagline: string;              // "#DamnProud"
  appShortTitle: string;        // "Phi Sig USC"
  fraternityLetters: string;    // "ΦΣΚ"
  timeZone: string;             // "America/New_York"
  logoUrl: string;              // chapter-uploaded logo/crest image URL ("" = auto shield)

  // Derived (single source of truth for the four most-templated combos):
  chapterFullName: string;      // "Phi Sigma Kappa Gamma Triton"
  chapterAttribution: string;   // "Phi Sig USC"  (most-used in email/SMS sigs)
  pageTitle: string;            // "Phi Sigma Kappa Gamma Triton — Rush at USC"
  ogAlt: string;                // "Phi Sigma Kappa @ USC"
};

/**
 * Neutral, brand-less identity for the APEX / marketing site (no chapter). The
 * apex must never carry a specific chapter's identity (it leaked into the
 * hydration payload before). Passed to ChapterIdentityProvider when there is no
 * subdomain.
 */
export const APEX_IDENTITY: ChapterIdentity = {
  fraternityName: "Greekstack",
  fraternityShort: "Greekstack",
  // Apex is org-type-agnostic — use the neutral "other" term set so any stray
  // member-noun on the marketing site reads inclusively ("Members" not
  // "Brothers"), never a single chapter's gendered vocabulary.
  orgType: "other",
  terms: termsForOrgType("other"),
  greekLetters: "",
  greekLettersGlyphs: "",
  schoolName: "",
  schoolShort: "",
  schoolUrl: "",
  charterYear: "",
  foundingYear: "",
  foundingLocation: "",
  nationalName: "Greekstack",
  nationalHqUrl: "",
  cardinalPrinciples: "",
  tagline: "",
  appShortTitle: "Greekstack",
  fraternityLetters: "GS",
  timeZone: "America/New_York",
  logoUrl: "",
  chapterFullName: "Greekstack",
  chapterAttribution: "Greekstack",
  pageTitle: "Greekstack",
  ogAlt: "Greekstack",
};

/**
 * Pull chapter identity from cfg. Always returns a complete ChapterIdentity —
 * any unset field falls back to a NEUTRAL, brand-less placeholder (never a
 * specific chapter), so this never throws and never leaks one chapter's brand
 * onto another. Safe to call from anywhere.
 */
export async function getChapterIdentity(): Promise<ChapterIdentity> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  return fromCfg(cfg);
}

/**
 * Sync variant — for code paths that already have cfg loaded (e.g.
 * layout.tsx's generateMetadata which loads cfg once and uses it for
 * theme colors too). Avoids a second DB round-trip per request.
 */
export function chapterIdentityFromCfg(cfg: Record<string, string>): ChapterIdentity {
  return fromCfg(cfg);
}

function fromCfg(cfg: Record<string, string>): ChapterIdentity {
  // NEUTRAL fallbacks only — never a specific chapter. Provisioning seeds the
  // chapter's real identity; any field left blank shows a generic placeholder
  // instead of leaking the reference chapter onto another tenant or the apex.
  const fraternityName = cfg["chapter.fraternityName"] || "Your Chapter";
  const fraternityShort = cfg["chapter.fraternityShort"] || fraternityName;
  // Org type drives the member-noun vocabulary (terms). Defaults to "fraternity"
  // so an existing/unconfigured tenant renders IDENTICALLY to the original
  // hardcoded copy (Brother/Brotherhood/son/Rush). A sorority or pro/co-ed org
  // sets chapter.orgType once at signup and every terms.* mention re-genders.
  const orgType = cfg["chapter.orgType"] || "fraternity";
  const terms = termsForOrgType(orgType);
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const greekLettersGlyphs = cfg["chapter.greekLettersGlyphs"] || "";
  const schoolName = cfg["chapter.schoolName"] || "";
  const schoolShort = cfg["chapter.schoolShort"] || "";
  const schoolUrl = cfg["chapter.schoolUrl"] || "";
  const charterYear = cfg["chapter.charterYear"] || "";
  const foundingYear = cfg["chapter.foundingYear"] || "";
  const foundingLocation = cfg["chapter.foundingLocation"] || "";
  const nationalName = cfg["chapter.nationalName"] || fraternityName;
  const nationalHqUrl = cfg["chapter.nationalHqUrl"] || "";
  // Default motto is TERM-AWARE so a sorority reads "Sisterhood, Scholarship,
  // Character" and a pro/co-ed org "Membership, Scholarship, Character" with no
  // manual edit; a fraternity (default terms) keeps the exact original wording.
  const cardinalPrinciples =
    cfg["chapter.cardinalPrinciples"] || `${terms.collective}, Scholarship, Character`;
  const tagline = cfg["chapter.tagline"] || "";
  const appShortTitle = cfg["chapter.appShortTitle"] || fraternityShort;
  const fraternityLetters = cfg["chapter.fraternityLetters"] || "";
  const timeZone = cfg["chapter.timezone"] || "America/New_York";
  // Chapter-uploaded logo image (Cloudinary/Blob URL or data URI). Empty = the
  // auto-generated brand-tinted shield in components/brand/wordmark.tsx.
  const logoUrl = cfg["brand.logoUrl"] || "";

  const chapterFullName = [fraternityName, greekLetters].filter(Boolean).join(" ");
  return {
    fraternityName, fraternityShort, orgType, terms,
    greekLetters, greekLettersGlyphs,
    schoolName, schoolShort, schoolUrl,
    charterYear, foundingYear, foundingLocation,
    nationalName, nationalHqUrl,
    cardinalPrinciples, tagline, appShortTitle,
    fraternityLetters,
    timeZone,
    logoUrl,
    chapterFullName,
    chapterAttribution: [fraternityShort, schoolShort].filter(Boolean).join(" "),
    pageTitle: [chapterFullName, schoolShort ? `${terms.recruit} at ${schoolShort}` : ""].filter(Boolean).join(" — "),
    ogAlt: schoolShort ? `${fraternityName} @ ${schoolShort}` : fraternityName,
  };
}
