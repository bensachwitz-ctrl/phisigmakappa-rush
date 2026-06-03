import { prisma } from "@/lib/prisma";

/**
 * Default site config — used when the SiteConfig DB table is empty or a key is unset.
 * The admin /admin/settings page lets brothers override any of these values.
 */
export const DEFAULTS = {
  // ── CHAPTER IDENTITY (white-label) ───────────────────────────────────
  // These are the chapter's "who and where". Every page metadata, JSON-LD,
  // footer attribution, email signature, and PWA manifest reads from here
  // so a new chapter spinning up the platform only needs to fill these out
  // once on the /admin/setup wizard. NO source code changes required to
  // re-brand for Beta Sigma @ Maryland, Epsilon @ Drexel, etc.
  //
  // The Phi Sig + Gamma Triton + USC defaults are reference values only.
  // A net-new chapter run through /admin/setup overrides every line below.
  "chapter.fraternityName": "Phi Sigma Kappa",
  "chapter.fraternityShort": "Phi Sig",
  "chapter.greekLetters": "Gamma Triton",
  "chapter.greekLettersGlyphs": "ΓΤ",
  "chapter.schoolName": "University of South Carolina",
  "chapter.schoolShort": "USC",
  "chapter.schoolUrl": "https://sc.edu",
  "chapter.charterYear": "1975",
  "chapter.foundingYear": "1873",
  "chapter.foundingLocation": "Massachusetts Agricultural College",
  "chapter.nationalName": "Phi Sigma Kappa",
  "chapter.nationalHqUrl": "https://phisigmakappa.org",
  "chapter.cardinalPrinciples": "Brotherhood, Scholarship, Character",
  "chapter.tagline": "#DamnProud",
  // Max 12 chars — iOS home-screen launcher caption.
  "chapter.appShortTitle": "Phi Sig USC",
  "chapter.fraternityLetters": "ΦΣΚ",

  // Hero photo collage tiles. Slugs must point at IG posts whose og:image
  // resolves to the actual chapter photo, not Instagram's branding asset.
  // Verified working: DUyvfpokpy6 (Polar Plunge), DRxIVRXkYCn (Movember
  // fundraiser group photo), DXHwOJCkUbi (paintball at Trigger Tyme).
  "hero.tile1.slug": "DUyvfpokpy6",
  "hero.tile1.caption": "Polar Plunge for Special Olympics SC",
  "hero.tile1.icon": "HandHeart",

  "hero.tile2.slug": "DRxIVRXkYCn",
  "hero.tile2.caption": "No Shave November · Movember $1,600",
  "hero.tile2.icon": "HandHeart",

  "hero.tile3.slug": "DXHwOJCkUbi",
  "hero.tile3.caption": "Annual paintball at Trigger Tyme",
  "hero.tile3.icon": "Trophy",

  // Brother of the Month
  "spotlight.slug": "DXzzTaFjSyj",
  "spotlight.name": "Michael McCarthy",
  "spotlight.role": "Freshman · Philanthropy Chair",
  // Default empty so a stale "April" label never ships in production. The
  // page suppresses the month chip when this is blank — so until the rush
  // chair updates it, the spotlight shows the brother without a month
  // attribution. Better than ?WRONG MONTH? on May 1.
  "spotlight.month": "",
  "spotlight.bio":
    "Michael joined as a freshman and within a semester took over Philanthropy Chair, transforming the chapter's Special Olympics partnership.",

  // About section photo
  "about.slug": "DWmioxGCaBG",
  "about.objectPosition": "50% 80%",
  "about.caption": "Chapter formal · third-party vendor, sober transportation, FIPG-compliant",

  // ── Brand colors — admin-editable for white-label deployments ──
  // Primary brand color (default = Phi Sigma Kappa cardinal red #C8102E).
  // Each chapter can override with their school color: USC garnet #73000A,
  // Texas A&M maroon #500000, Penn State blue #001E44, etc. Renders via the
  // `--phisig-red` CSS custom property in app/globals.css — every component
  // that uses `bg-phisig-red`, `text-phisig-red`, etc. updates automatically.
  // Format: hex (#RRGGBB). Optional dark variant for gradient stops.
  "brand.primaryHex": "#C8102E",
  "brand.primaryDarkHex": "#A20D26",
  "brand.primarySoftHex": "#FCEFF1",

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
  // Default is a friendly placeholder until the admin sets the real name.
  // "Our Chapter Advisor" reads as a role rather than an unfilled template
  // field — even before the chapter sets the actual person.
  "contact.advisorName": "Our Chapter Advisor",
  "contact.advisorTitle": "Alumni Advisor · Gamma Triton",
  "contact.advisorEmail": "advisor@phisig-usc.com",
  "contact.rushPhone": "",
  "contact.address": "1525 College Street",
  "contact.cityState": "Columbia, SC 29208",
  "contact.instagramHandle": "@phisig_usc",
  "contact.instagramUrl": "https://www.instagram.com/phisig_usc/",
  "contact.mapsUrl": "https://maps.google.com/?q=1525+College+St+Columbia+SC+29208",

  // Philanthropy — beneficiary + concrete dollars raised. Used in highlights, testimonial, etc.
  "philanthropy.beneficiary": "Special Olympics South Carolina",
  "philanthropy.beneficiaryShort": "Special Olympics SC",
  "philanthropy.raisedYear": "2025",
  "philanthropy.raisedAmount": "$700",
  "philanthropy.raisedTotal": "$25k+",

  // Anti-hazing — chapter affirmation + national hotline (visible on About + Privacy).
  // The REAL National Anti-Hazing Hotline number is 1-888-NOT-HAZE (888-668-4293) —
  // older listings use 1-800 by mistake; that's wrong and embarrassing on a hazing
  // page. Source: hazingprevention.org/help.
  "antiHazing.hotline": "1-888-NOT-HAZE",
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
  // Chapter-agnostic defaults — the rush chair replaces these with their own
  // school/chapter specifics via /admin/settings. A fresh tenant must never see
  // another chapter's school name or national org here.
  "faq.json": JSON.stringify([
    { q: "Do I need to be a freshman?", a: "Nope. We rush freshmen, sophomores, juniors, and transfers. If you're on campus and looking for a brotherhood, we want to meet you." },
    { q: "Is there a GPA requirement?", a: "We expect a solid academic standing to receive a bid. Our chapter average is well above the minimum — scholarship is one of our core principles." },
    { q: "How much does it cost?", a: "Dues cover house fees, philanthropy, formals, and chapter operations. We'll walk you through every line item before you accept a bid — no surprises." },
    { q: "Is there hazing?", a: "Zero. Our national organization and our chapter take a hard line against hazing. New-member education is built around brotherhood, history, and leadership development. Concerns can be reported anonymously to our chapter advisor or to national HQ." },
    { q: "What's the time commitment?", a: "About 4–6 hours/week of required programming during the semester (chapter meeting, study hall, occasional service). The rest is optional — go as hard or as easy as you want." },
    { q: "Can I rush if I'm already in another organization?", a: "Yes — our brothers are on sports teams, in every college, in honors, and in ROTC. The chapter adds to your campus experience, it doesn't replace it." },
  ]),

  // Three Cardinal Principles cards: [{ icon, title, body }]
  "values.json": JSON.stringify([
    { icon: "Users", title: "Brotherhood", body: "Lifelong friendships built on mutual respect and showing up for each other." },
    { icon: "GraduationCap", title: "Scholarship", body: "Study halls, mentorship, and an alumni network across every field. Chapter GPA above the all-fraternity average." },
    { icon: "Heart", title: "Character", body: "We measure men by what they do — service, integrity, and courage in conviction." },
  ]),

  // Highlights ribbon: [{ icon, label }]
  // Chapter-agnostic defaults — replaced per chapter via /admin/settings.
  "highlights.json": JSON.stringify([
    { icon: "HandHeart", label: "Year-round philanthropy" },
    { icon: "Trophy", label: "Signature fundraisers" },
    { icon: "Building2", label: "On-campus chapter house" },
    { icon: "GraduationCap", label: "Above-average chapter GPA" },
    { icon: "Flame", label: "Brotherhood events year-round" },
    { icon: "Star", label: "Active alumni network" },
  ]),

  // Recent activity strip: [{ tag, title, icon }]
  // Chapter-agnostic defaults — replaced per chapter via /admin/settings.
  "recent.json": JSON.stringify([
    { tag: "Philanthropy", title: "Annual fundraiser for our chosen charity", icon: "HandHeart" },
    { tag: "Brotherhood", title: "Brotherhood events before finals", icon: "Trophy" },
    { tag: "Formals", title: "Chapter formal — third-party vendor, sober transportation", icon: "Award" },
    { tag: "Service", title: "Community service throughout the semester", icon: "Heart" },
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

  // ── DUES COLLECTION (Stripe Checkout — R43-A) ─────────────────────
  // Optional white-label payment acceptance. All four prereqs must be
  // present to enable the Pay button:
  //   1. dues.enabled === "true"
  //   2. dues.stripePublishableKey set (public half — fine in DB)
  //   3. process.env.STRIPE_SECRET_KEY set (private — env-var only,
  //      never lives in SiteConfig so it stays out of /admin/help)
  //   4. dues.stripeWebhookSecret set (whsec_... signing secret)
  // Missing ANY → manual-only mode (existing badge-toggle still works).
  "dues.enabled": "false",
  "dues.amountCents": "15000",            // $150.00 default
  "dues.currency": "usd",
  "dues.year": "2026-fall",               // academic period stamped on each payment row
  "dues.stripePublishableKey": "",        // pk_live_... — admin pastes here
  "dues.stripeWebhookSecret": "",         // whsec_... — DIFFERENT from STRIPE_SECRET_KEY env var
  "dues.passThroughFee": "false",         // if true, add 2.9% + 30¢ to brother's total
  "dues.label": "Chapter dues — Fall 2026",
  "calendar.calDiyUrl": "",

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
