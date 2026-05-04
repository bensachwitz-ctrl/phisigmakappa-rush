import { prisma } from "@/lib/prisma";

/**
 * Default site config — used when the SiteConfig DB table is empty or a key is unset.
 * The admin /admin/settings page lets brothers override any of these values.
 */
export const DEFAULTS = {
  // Hero photo collage tiles
  "hero.tile1.slug": "DRzyoVciZCh",
  "hero.tile1.caption": "2026 Executive Board",
  "hero.tile1.icon": "Crown",

  "hero.tile2.slug": "DRxIVRXkYCn",
  "hero.tile2.caption": "Game Day",
  "hero.tile2.icon": "Trophy",

  "hero.tile3.slug": "DUyvfpokpy6",
  "hero.tile3.caption": "Polar Plunge",
  "hero.tile3.icon": "HandHeart",

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
  "about.caption": "Spring formal · NOLA",

  // Hero tagline
  "hero.eyebrow": "Fall Rush 2026 — Interest list now open",
  "hero.subline":
    "Gamma Triton at the University of South Carolina. 60+ brothers, 3.45 chapter GPA, $25k+ raised for Special Olympics. Get on the Fall '26 list — we'll text you the second the schedule drops in August.",

  // Stats
  "stats.brothers": "60+",
  "stats.gpa": "3.45",
  "stats.years": "150+",
  "stats.charity": "$25k+",

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
