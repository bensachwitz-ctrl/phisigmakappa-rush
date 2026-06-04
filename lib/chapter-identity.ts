import { getSiteConfig } from "@/lib/site-config";

/**
 * Single source of truth for chapter identity derived from SiteConfig.
 * Every server-side surface that needs "who is this chapter" — page metadata,
 * SMS replies, ICS feed, email From headers, JSON-LD, opengraph image alt —
 * imports from here so a re-brand for another chapter (Beta Sigma @ Maryland,
 * Epsilon @ Drexel, etc.) propagates without scattered string edits.
 *
 * Reference defaults match the Phi Sig Gamma Triton USC build, so an existing
 * deploy without cfg overrides renders unchanged. A net-new chapter runs
 * /admin/setup once and every surface re-brands.
 *
 * Use the typed `ChapterIdentity` shape so consumers can destructure exactly
 * the fields they need rather than passing the whole cfg around.
 */
export type ChapterIdentity = {
  fraternityName: string;       // "Phi Sigma Kappa"
  fraternityShort: string;      // "Phi Sig"
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
  const cardinalPrinciples = cfg["chapter.cardinalPrinciples"] || "Brotherhood, Scholarship, Character";
  const tagline = cfg["chapter.tagline"] || "";
  const appShortTitle = cfg["chapter.appShortTitle"] || fraternityShort;
  const fraternityLetters = cfg["chapter.fraternityLetters"] || "";

  const chapterFullName = [fraternityName, greekLetters].filter(Boolean).join(" ");
  return {
    fraternityName, fraternityShort, greekLetters, greekLettersGlyphs,
    schoolName, schoolShort, schoolUrl,
    charterYear, foundingYear, foundingLocation,
    nationalName, nationalHqUrl,
    cardinalPrinciples, tagline, appShortTitle,
    fraternityLetters,
    chapterFullName,
    chapterAttribution: [fraternityShort, schoolShort].filter(Boolean).join(" "),
    pageTitle: [chapterFullName, schoolShort ? `Rush at ${schoolShort}` : ""].filter(Boolean).join(" — "),
    ogAlt: schoolShort ? `${fraternityName} @ ${schoolShort}` : fraternityName,
  };
}
