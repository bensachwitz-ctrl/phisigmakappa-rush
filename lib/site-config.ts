import { prisma } from "@/lib/prisma";

/**
 * Default site config — used when the SiteConfig DB table is empty or a key is unset.
 * The admin /admin/settings page lets brothers override any of these values.
 */
export const DEFAULTS = {
  // Hero photo collage tiles
  "hero.tile1.slug": "DUyvfpokpy6",
  "hero.tile1.caption": "Polar Plunge for Special Olympics SC",
  "hero.tile1.icon": "HandHeart",

  "hero.tile2.slug": "DRxIVRXkYCn",
  "hero.tile2.caption": "Williams-Brice gameday",
  "hero.tile2.icon": "Trophy",

  "hero.tile3.slug": "DRzyoVciZCh",
  "hero.tile3.caption": "Chapter leadership",
  "hero.tile3.icon": "Crown",

  // Brother of the Month
  "spotlight.slug": "DXzzTaFjSyj",
  "spotlight.name": "Michael McCarthy",
  "spotlight.role": "Freshman · Philanthropy Chair",
  "spotlight.month": "April",
  "spotlight.bio":
    "Michael joined as a freshman and within a semester took over Philanthropy Chair, transforming the chapter's Special Olympics partnership.",

  // About section photo
  "about.slug": "DWmioxGCaBG",
  "about.objectPosition": "50% 80%",
  "about.caption": "Chapter formal · third-party vendor, sober transportation, FIPG-compliant",

  // Hero tagline
  "hero.eyebrow": "Phi Sigma Kappa · Gamma Triton · USC · Fall Rush 2026",
  "hero.subline":
    "Phi Sigma Kappa at the University of South Carolina. 60+ brothers, 3.45 chapter GPA, $25k+ raised for Special Olympics SC. Drop your number — we'll text you the moment the Fall '26 schedule goes live.",

  // Stats — display-formatted strings (e.g. "60+"). The CountUp component parses
  // out the numeric prefix; everything else (e.g. "+", "k+") becomes the suffix.
  "stats.brothers": "60+",
  "stats.gpa": "3.45",
  "stats.years": "150+",
  "stats.charity": "$25k+",

  // Hero headline & CTA
  "hero.h1.lead": "Rush Phi Sigma Kappa.",
  "hero.h1.tail": "Fall '26 at",
  "hero.h1.highlight": "USC",
  "hero.cta.label": "Text me when rush drops",
  "hero.cta.href": "#register",

  // Executive board — 5 slots; leave any slot empty to hide it.
  "eboard.1.name": "Mark Laughery",
  "eboard.1.role": "President",
  "eboard.1.headshotUrl": "",
  "eboard.2.name": "Jake Benoudiz",
  "eboard.2.role": "Vice President",
  "eboard.2.headshotUrl": "",
  "eboard.3.name": "Mitchell West",
  "eboard.3.role": "Secretary",
  "eboard.3.headshotUrl": "",
  "eboard.4.name": "Charlie Moore",
  "eboard.4.role": "Treasurer",
  "eboard.4.headshotUrl": "",
  "eboard.5.name": "Joshua Barteet",
  "eboard.5.role": "Sentinel",
  "eboard.5.headshotUrl": "",

  // Contact — every public-facing email, address, and social link comes from here.
  "contact.rushEmail": "rush@phisig-usc.com",
  // Default is generic role so the live site doesn't 404-feel; admin should
  // overwrite with the real human's name from /admin/settings → Contact &amp; social.
  "contact.advisorName": "Chapter Advisor",
  "contact.advisorTitle": "Alumni Chapter Advisor · Gamma Triton",
  "contact.advisorEmail": "advisor@phisig-usc.com",
  "contact.rushPhone": "",
  "contact.address": "800 Lincoln St",
  "contact.cityState": "Columbia, SC 29201",
  "contact.instagramHandle": "@phisig_usc",
  "contact.instagramUrl": "https://www.instagram.com/phisig_usc/",
  "contact.mapsUrl": "https://maps.google.com/?q=800+Lincoln+St+Columbia+SC",

  // Philanthropy — beneficiary + concrete dollars raised. Used in highlights, testimonial, etc.
  "philanthropy.beneficiary": "Special Olympics South Carolina",
  "philanthropy.beneficiaryShort": "Special Olympics SC",
  "philanthropy.raisedYear": "2025",
  "philanthropy.raisedAmount": "$700",
  "philanthropy.raisedTotal": "$25k+",

  // Anti-hazing — chapter affirmation + national hotline (visible on About + Privacy)
  "antiHazing.hotline": "1-800-NOT-HAZE",
  "antiHazing.hotlineUrl": "https://hazingprevention.org/help/",

  // Privacy
  "privacy.lastUpdated": "May 2026",

  // Section visibility toggles ("true" or "false") — admin can hide any section from the homepage
  "show.statsStrip": "true",
  "show.highlightsBanner": "true",
  "show.values": "true",
  "show.instagramFeed": "true",
  "show.timeline": "true",
  "show.testimonial": "true",
  "show.spotlight": "true",
  "show.eboard": "true",
  "show.faq": "true",
  "show.whereWeLive": "true",
} as const;

export type ConfigKey = keyof typeof DEFAULTS;

/**
 * Fetch all site config from DB, merged with defaults so missing keys still resolve.
 * Returns a plain map of key → value strings.
 */
export async function getSiteConfig(): Promise<Record<string, string>> {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await prisma.siteConfig.findMany();
  } catch {
    rows = [];
  }
  const map: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}
