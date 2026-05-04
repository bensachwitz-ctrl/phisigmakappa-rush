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
  "hero.eyebrow": "USC · Fall Rush 2026 · Gamma Triton chapter",
  "hero.subline":
    "Drop your number and we'll text you the date and location of every rush event the moment it's confirmed. No spam — about 6–8 messages across the whole rush cycle, then we're done.",

  // Stats — display-formatted strings (e.g. "60+"). The CountUp component parses
  // out the numeric prefix; everything else (e.g. "+", "k+") becomes the suffix.
  // Labels are also admin-editable so the chair can re-purpose a stat slot
  // (e.g. swap "Years strong" for a chapter-specific number).
  "stats.brothers": "60+",
  "stats.brothers.label": "Active brothers",
  "stats.brothers.sub": "",
  "stats.gpa": "3.45",
  "stats.gpa.label": "Chapter GPA",
  "stats.gpa.sub": "Above the all-fraternity average",
  // The "years" slot was previously "150+ / Years strong / Founded 1873" —
  // round-1 through round-7 Rushee critic flagged that as a museum-plaque stat
  // an 18yo has no reason to care about. Defaults now lead with USC-relevant
  // chapter age (Gamma Triton at USC since 1975 ≈ 50 years).
  "stats.years": "50+",
  "stats.years.label": "Years at USC",
  "stats.years.sub": "Gamma Triton chartered 1975",
  "stats.charity": "$25k+",
  "stats.charity.label": "Raised for charity",
  "stats.charity.sub": "Special Olympics SC",

  // Hero headline & CTA — punchier, single-beat reading. Round-7 Rushee critic
  // called the previous "Rush Phi Sigma Kappa. Fall '26 at USC." two-fragment
  // construction "two stiff facts mashed together." Now reads as one line.
  // Page renders as: "<lead> <tail> <highlight>." — final period added by
  // the JSX template, so don't end any of these three with a period or you
  // get a double-period bug at the seam.
  "hero.h1.lead": "Rush Phi Sig at USC",
  "hero.h1.tail": "— Fall '26",
  "hero.h1.highlight": "starts soon",
  "hero.cta.label": "Drop my number",
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

  // ── ADMIN-EDITABLE CONTENT ARRAYS (stored as JSON strings) ──
  // Each is parsed at render time; if parse fails or value is empty, the page
  // falls back to a built-in default. Lets the rush chair add/edit/remove items
  // without a code deploy. Edited via /admin/settings repeater UIs.

  // Timeline cards: [{ week, title, body }]
  "timeline.json": JSON.stringify([
    { week: "Week 1", title: "Open events", body: "Cookouts, brotherhood events, low-pressure hangs at the house. Show up — no commitment, no application." },
    { week: "Week 2", title: "Closed events", body: "Invite-only smaller events. Spend more time with individual brothers and start to feel out the fit." },
    { week: "Week 3", title: "Interviews & Bid Day", body: "One-on-ones with the e-board, then bids extended. Welcome ceremony for new members." },
  ]),

  // FAQ accordion items: [{ q, a }]
  "faq.json": JSON.stringify([
    { q: "Do I need to be a freshman?", a: "Nope. We rush freshmen, sophomores, juniors, and transfers. If you're at USC and looking for a brotherhood, we want to meet you." },
    { q: "Is there a GPA requirement?", a: "We expect a minimum 2.5 to receive a bid. Our chapter average is well above that — scholarship is one of our three cardinal principles." },
    { q: "How much does it cost?", a: "Dues cover house fees, philanthropy, formals, and chapter operations. We'll walk you through every line item before you accept a bid — no surprises." },
    { q: "Is there hazing?", a: "Zero. Phi Sigma Kappa nationally and our chapter take a hard line against hazing. New-member education is built around brotherhood, history, and leadership development. Concerns can be reported anonymously to our chapter advisor or to Phi Sigma Kappa national HQ." },
    { q: "What's the time commitment?", a: "About 4–6 hours/week of required programming during the semester (chapter meeting, study hall, occasional service). The rest is optional — go as hard or as easy as you want." },
    { q: "Can I rush if I'm already in another organization?", a: "Yes — we have brothers on the rugby team, in the business school, in honors college, in ROTC. Phi Sig adds to your USC experience, it doesn't replace it." },
  ]),

  // Three Cardinal Principles cards: [{ icon, title, body }]
  "values.json": JSON.stringify([
    { icon: "Users", title: "Brotherhood", body: "Lifelong friendships built on mutual respect and showing up for each other." },
    { icon: "GraduationCap", title: "Scholarship", body: "Study halls, mentorship, and an alumni network across every field. Chapter GPA above the all-fraternity average." },
    { icon: "Heart", title: "Character", body: "We measure men by what they do — service, integrity, and courage in conviction." },
  ]),

  // Highlights ribbon: [{ icon, label }]
  "highlights.json": JSON.stringify([
    { icon: "HandHeart", label: "Special Olympics SC partners" },
    { icon: "Trophy", label: "Polar Plunge fundraisers" },
    { icon: "Building2", label: "On-campus chapter house" },
    { icon: "GraduationCap", label: "Above-average chapter GPA" },
    { icon: "Flame", label: "Brotherhood events year-round" },
    { icon: "Star", label: "#DamnProud" },
  ]),

  // Recent activity strip: [{ tag, title, icon }]
  "recent.json": JSON.stringify([
    { tag: "Philanthropy", title: "Polar Plunge raised $700 for Special Olympics SC", icon: "HandHeart" },
    { tag: "Brotherhood", title: "Annual paintball at Trigger Tyme before finals", icon: "Trophy" },
    { tag: "Formals", title: "Chapter formal — third-party vendor, sober transportation", icon: "Award" },
    { tag: "Service", title: "Dry fundraiser dinner for Leukemia & Lymphoma Society", icon: "Heart" },
  ]),

  // Testimonial
  "testimonial.quote": "Phi Sig isn't a four-year decision — it's a forty-year one. The brothers I met during rush are the same guys standing next to me at every wedding, every promotion, every milestone.",
  "testimonial.author": "A. Mitchell",
  "testimonial.classYear": "'22",
  "testimonial.attribution": "Gamma Triton alumnus, finance",

  // About-section history paragraph (Founded 1873 / Gamma Triton 1975)
  "about.history": "Phi Sigma Kappa was founded at Massachusetts Agricultural College in 1873 on three cardinal principles: Brotherhood, Scholarship, and Character. The Gamma Triton chapter chartered at the University of South Carolina in 1975 and has built USC men around those same principles for fifty years — leaders in the classroom, in the community, and beyond.",

  // Anti-hazing block body (the long paragraph under the Zero-Tolerance heading)
  "antiHazing.body": "Phi Sigma Kappa national and the Gamma Triton chapter strictly prohibit hazing in any form. Our new-member education is built around brotherhood, leadership, and chapter history — never humiliation, intimidation, or harm.",

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
