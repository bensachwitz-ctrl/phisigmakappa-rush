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
  billingPlan: string;          // "dues_split" or "flat_subscription"

  // Derived (single source of truth for the four most-templated combos):
  chapterFullName: string;      // "Phi Sigma Kappa Gamma Triton"
  chapterAttribution: string;   // "Phi Sig USC"  (most-used in email/SMS sigs)
  pageTitle: string;            // "Phi Sigma Kappa Gamma Triton — Rush at USC"
  ogAlt: string;                // "Phi Sigma Kappa @ USC"
};

/**
 * Pull chapter identity from cfg. Always returns a complete ChapterIdentity —
 * any unset field falls back to the Phi Sig USC reference value, so this never
 * throws and never returns partial data. Safe to call from anywhere.
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
  const fraternityName = cfg["chapter.fraternityName"] || "Phi Sigma Kappa";
  const fraternityShort = cfg["chapter.fraternityShort"] || "Phi Sig";
  const greekLetters = cfg["chapter.greekLetters"] || "Gamma Triton";
  const greekLettersGlyphs = cfg["chapter.greekLettersGlyphs"] || "ΓΤ";
  const schoolName = cfg["chapter.schoolName"] || "University of South Carolina";
  const schoolShort = cfg["chapter.schoolShort"] || "USC";
  const schoolUrl = cfg["chapter.schoolUrl"] || "https://sc.edu";
  const charterYear = cfg["chapter.charterYear"] || "1975";
  const foundingYear = cfg["chapter.foundingYear"] || "1873";
  const foundingLocation = cfg["chapter.foundingLocation"] || "Massachusetts Agricultural College";
  const nationalName = cfg["chapter.nationalName"] || "Phi Sigma Kappa";
  const nationalHqUrl = cfg["chapter.nationalHqUrl"] || "https://phisigmakappa.org";
  const cardinalPrinciples = cfg["chapter.cardinalPrinciples"] || "Brotherhood, Scholarship, Character";
  const tagline = cfg["chapter.tagline"] || "#DamnProud";
  const appShortTitle = cfg["chapter.appShortTitle"] || "Phi Sig USC";
  const fraternityLetters = cfg["chapter.fraternityLetters"] || "ΦΣΚ";
  const billingPlan = cfg["chapter.billingPlan"] || "dues_split";

  return {
    fraternityName, fraternityShort, greekLetters, greekLettersGlyphs,
    schoolName, schoolShort, schoolUrl,
    charterYear, foundingYear, foundingLocation,
    nationalName, nationalHqUrl,
    cardinalPrinciples, tagline, appShortTitle,
    fraternityLetters,
    billingPlan,
    chapterFullName: `${fraternityName} ${greekLetters}`,
    chapterAttribution: `${fraternityShort} ${schoolShort}`,
    pageTitle: `${fraternityName} ${greekLetters} — Rush at ${schoolShort}`,
    ogAlt: `${fraternityName} @ ${schoolShort}`,
  };
}
