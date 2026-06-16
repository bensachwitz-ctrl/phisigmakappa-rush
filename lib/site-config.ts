import * as React from "react";
import { prisma, getSubdomain } from "@/lib/prisma";

/**
 * Per-request memoizer. In the Next.js App Router server runtime, `React.cache`
 * exists and dedupes calls within a single request render. The stable `react`
 * 18.3.1 package used by unit tests (pure-node vitest) does NOT export `cache`,
 * so we fall back to an identity wrapper there — correct, just un-memoized.
 * Typed through so callers keep the original function signature.
 */
const requestCache: <A extends any[], R>(
  fn: (...args: A) => R
) => (...args: A) => R =
  typeof (React as any).cache === "function"
    ? (React as any).cache
    : (fn) => fn;

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
  // White-label DEFAULTS are intentionally BLANK so the apex + any unconfigured
  // tenant NEVER render a specific chapter (these were Phi Sig reference values
  // and leaked onto the marketing apex). Provisioning (/admin/setup) seeds the
  // real per-chapter identity; chapterIdentityFromCfg() neutral-fallbacks the rest.
  "chapter.fraternityName": "",
  "chapter.fraternityShort": "",
  "chapter.greekLetters": "",
  "chapter.greekLettersGlyphs": "",
  "chapter.schoolName": "",
  "chapter.schoolShort": "",
  "chapter.schoolUrl": "",
  "chapter.charterYear": "",
  "chapter.foundingYear": "",
  "chapter.foundingLocation": "",
  "chapter.nationalName": "",
  "chapter.nationalHqUrl": "",
  // BLANK so the renderer uses the TERM-AWARE default from chapter-identity.ts
  // (Brotherhood/Sisterhood/Membership + Scholarship + Character) keyed off the
  // chapter's orgType — never a fixed "Brotherhood" for a sorority.
  "chapter.cardinalPrinciples": "",
  "chapter.tagline": "",
  // Max 12 chars — iOS home-screen launcher caption.
  "chapter.appShortTitle": "",
  "chapter.fraternityLetters": "",
  // IANA timezone for this chapter — drives every server-rendered event
  // date/time (lib/utils formatDate/formatTime) and the broadcast SMS
  // quiet-hours gate. Defaults to US Eastern; a chapter in another timezone
  // sets e.g. "America/Chicago" / "America/Los_Angeles" in /admin/settings so
  // event times and the 8am–9pm TCPA quiet-hours window are correct locally.
  "chapter.timezone": "America/New_York",

  // Hero photo collage tiles. Slugs must point at IG posts whose og:image
  // resolves to the actual chapter photo, not Instagram's branding asset.
  // WHITE-LABEL: slugs default EMPTY so a fresh tenant never loads another
  // chapter's real Instagram photos — the PostTile component renders its
  // designed cardinal-red Crest fallback tile instead until the rush chair
  // sets each chapter's own post code (or uploaded image URL) in /admin.
  // Captions are generic, chapter-agnostic labels (no real people/events).
  "hero.tile1.slug": "",
  "hero.tile1.caption": "Philanthropy",
  "hero.tile1.icon": "HandHeart",

  "hero.tile2.slug": "",
  // BLANK so the renderer swaps in the term collective (Brotherhood/Sisterhood/
  // Membership) keyed off orgType — never a fixed "Brotherhood".
  "hero.tile2.caption": "",
  "hero.tile2.icon": "HandHeart",

  "hero.tile3.slug": "",
  "hero.tile3.caption": "Chapter events",
  "hero.tile3.icon": "Trophy",

  // Brother of the Month. WHITE-LABEL: all fields default EMPTY so a fresh
  // tenant never renders another chapter's real member, photo, or bio. The
  // rush chair fills these in per chapter via /admin/settings; the section
  // can also be hidden entirely via show.spotlight until then.
  "spotlight.slug": "",
  "spotlight.name": "",
  "spotlight.role": "",
  // Default empty so a stale month label never ships in production. The
  // page suppresses the month chip when this is blank.
  "spotlight.month": "",
  "spotlight.bio": "",

  // About section photo. WHITE-LABEL: slug defaults EMPTY (no foreign
  // chapter photo); caption stays a generic, chapter-agnostic label.
  "about.slug": "",
  "about.objectPosition": "50% 50%",
  "about.caption": "Chapter formal · third-party vendor, sober transportation",

  // ── Brand colors — admin-editable for white-label deployments ──
  // Primary brand color. Each chapter overrides with its school color: USC
  // garnet #73000A, Texas A&M maroon #500000, Penn State blue #001E44, etc.
  // Binds to the `--brand-primary` CSS custom property (NOT the old
  // `--phisig-red`, which was renamed) that app/layout.tsx injects, so every
  // component using the `phisig.red`/`brand-*` Tailwind tokens recolors with no
  // rebuild. New chapters are seeded the GS royal-blue platform identity by the
  // onboarding wizard (app/api/onboard/route.ts); this raw DEFAULT is the legacy
  // fallback for any pre-onboarding/unconfigured read. Format: hex (#RRGGBB).
  "brand.primaryHex": "#2563eb",
  "brand.primaryDarkHex": "#1e40af",
  "brand.primarySoftHex": "#eff6ff",

  // Chapter logo / crest image (white-label). OPTIONAL — defaults EMPTY so a
  // chapter that uploads nothing gets the auto-generated, brand-tinted shield
  // (components/brand/wordmark.tsx) rather than another chapter's mark. When the
  // admin uploads a logo in /admin/setup or /admin/settings → Brand, this holds
  // the Cloudinary/Blob URL (or data URI in dev) and the header, footer, and
  // login screens render the real image. Square or transparent-PNG works best.
  "brand.logoUrl": "",

  // ── Chapter-site template + accent (white-label site generator) ──────────────
  // Which homepage TEMPLATE the public chapter site renders with. One of
  // "classic" | "modern" (the hero variants live in components/site/templates/:
  // hero-classic.tsx + hero-split.tsx; the 15 shared section bodies are in
  // section-map.tsx). Default "classic" = the original Crest hero + original
  // section order, so an un-customized chapter (and the apex — "website." is NOT
  // an APEX_DROP_PREFIX, it's operational config) is byte-identical to the
  // pre-generator render.
  //
  // NOTE (generator status): these template modules are BUILT but not yet wired
  // into the renderer. components/site/chapter-landing.tsx still uses its own
  // inline sectionMap + Classic hero and never reads this key, so today every
  // chapter renders Classic regardless of this value — the live single-template
  // site is unchanged. Wiring the renderer to read cfg["website.template"] and
  // an /admin/website Template Gallery picker are the remaining steps.
  "website.template": "classic",

  // Secondary / accent brand color (the "gold" in the platform's royal-blue+gold
  // identity), per chapter. Read by the Modern (hero-split) template for accent
  // bands, dividers, and the underline; the Classic template never references it,
  // so Classic stays pixel-identical. Default = platform gold #f59e0b, so an
  // unset/apex chapter matches the platform accent exactly. Auto-validated to a
  // clean #RRGGBB by the settings route (scrubAdminValue: any key ending "hex").
  // TODO (wiring): hero-split currently uses bg-/text-brand-secondary utilities +
  // a --brand-secondary var that are NOT yet defined in tailwind.config.ts /
  // app/layout.tsx. Those must be added (and the renderer must select the Modern
  // hero) before this value affects any pixel — until then it is inert.
  "brand.secondaryHex": "#f59e0b",

  // OPTIONAL full-bleed hero photo for the Modern (hero-split) template. EMPTY by
  // default → the template falls back to the brand-tinted gradient + Crest
  // treatment (never another chapter's photo). Classic ignores it entirely.
  // Cloudinary/Blob URL (or data URI in dev). Inert until the Modern hero is wired.
  "brand.heroImageUrl": "",

  // OPTIONAL gallery of uploaded chapter photos beyond the Instagram feed, as a
  // JSON array of {url, caption}. EMPTY array by default. Reserved for a future
  // customizer gallery uploader; no template consumes it yet.
  "website.galleryJson": "[]",

  // Hero tagline. WHITE-LABEL: chapter-agnostic — no school/chapter name
  // baked in, so a fresh tenant never shows "USC · Gamma Triton". The rush
  // chair personalizes this per chapter via /admin/settings.
  // BLANK so the renderer falls back to the TERM-AWARE label (e.g. "Recruitment
  // Fall '26" for a sorority, "Rush Fall '26" for a fraternity), driven by the
  // rush.termLabel + orgType — never a fixed "Fall Rush 2026".
  "hero.eyebrow": "",
  "hero.subline":
    "Drop your number and we'll text you the date and location of every rush event the moment it's confirmed. No spam — about 6–8 messages across the whole rush cycle, then we're done.",

  // Stats — display-formatted strings (e.g. "60+"). The CountUp component parses
  // out the numeric prefix; everything else (e.g. "+", "k+") becomes the suffix.
  // Labels are also admin-editable so the chair can re-purpose a stat slot
  // (e.g. swap "Years strong" for a chapter-specific number).
  "stats.brothers": "60+",
  // BLANK so the renderer uses the TERM-AWARE "Active brothers/sisters/members"
  // label keyed off orgType (a sorority shows "Active sisters", not "brothers").
  "stats.brothers.label": "",
  "stats.brothers.sub": "",
  "stats.gpa": "3.45",
  "stats.gpa.label": "Chapter GPA",
  // Org-neutral ("all-Greek" covers fraternities AND sororities).
  "stats.gpa.sub": "Above the all-Greek average",
  // The "years" slot leads with chapter age. WHITE-LABEL: label + sub are
  // chapter-agnostic; sub defaults EMPTY so no other chapter inherits Phi
  // Sig's "Gamma Triton chartered 1975" line. Each chapter sets its own.
  "stats.years": "50+",
  "stats.years.label": "Years strong",
  "stats.years.sub": "",
  "stats.charity": "$25k+",
  "stats.charity.label": "Raised for charity",
  // WHITE-LABEL: empty so the spotlight/stat copy falls back to the generic
  // "our philanthropy partner" rather than naming Phi Sig's beneficiary.
  "stats.charity.sub": "",

  // Hero headline & CTA — punchier, single-beat reading.
  // Page renders as: "<lead> <tail> <highlight>." — final period added by
  // the JSX template, so don't end any of these three with a period or you
  // get a double-period bug at the seam.
  // WHITE-LABEL: chapter-agnostic. BLANK lead/tail so the renderer falls back to
  // the TERM-AWARE + season-aware headline ("Recruitment starts" / "Fall '26"),
  // never a fixed "Rush". A chapter that types its own headline keeps it verbatim.
  "hero.h1.lead": "",
  "hero.h1.tail": "",
  "hero.h1.highlight": "this fall",
  "hero.cta.label": "Drop my number",
  "hero.cta.href": "#register",

  // Executive board — 5 slots; leave any slot empty to hide it.
  // WHITE-LABEL: names default EMPTY so a fresh tenant never publishes
  // another chapter's real members. The landing page filters out any slot
  // missing a name (so the whole e-board section stays hidden until the
  // rush chair adds real officers in /admin/settings). Roles are kept as
  // generic placeholders for the repeater UI labels only.
  "eboard.1.name": "",
  "eboard.1.role": "President",
  "eboard.1.headshotUrl": "",
  "eboard.2.name": "",
  "eboard.2.role": "Vice President",
  "eboard.2.headshotUrl": "",
  "eboard.3.name": "",
  "eboard.3.role": "Secretary",
  "eboard.3.headshotUrl": "",
  "eboard.4.name": "",
  "eboard.4.role": "Treasurer",
  "eboard.4.headshotUrl": "",
  "eboard.5.name": "",
  "eboard.5.role": "Sentinel",
  "eboard.5.headshotUrl": "",

  // Contact — every public-facing email, address, and social link comes from here.
  // WHITE-LABEL: every chapter-specific value defaults EMPTY so a fresh tenant
  // never leaks Phi Sig's real email domain, Instagram, house address, or maps
  // pin. Provisioning (app/api/onboard) seeds the new chapter's own contact
  // values; the rush chair can fill any remaining blanks in /admin/settings.
  // The components tolerate "" (titleCaseAddress/cleanUrl/cleanMailto/cleanTel
  // all return "" on empty — no broken hrefs, no crash).
  "contact.rushEmail": "",
  // Default is a friendly placeholder until the admin sets the real name.
  // "Our Chapter Advisor" reads as a role rather than an unfilled template
  // field — even before the chapter sets the actual person. (Role-only, not PII.)
  "contact.advisorName": "Our Chapter Advisor",
  "contact.advisorTitle": "Alumni Advisor",
  "contact.advisorEmail": "",
  "contact.rushPhone": "",
  "contact.address": "",
  "contact.cityState": "",
  "contact.instagramHandle": "",
  "contact.instagramUrl": "",
  "contact.mapsUrl": "",

  // Philanthropy — beneficiary + concrete dollars raised. Used in highlights, testimonial, etc.
  // WHITE-LABEL: a generic partner name (never Phi Sig's real beneficiary) so
  // the spotlight/about copy reads cleanly for a fresh tenant; the rush chair
  // sets the real partner + amounts per chapter via /admin/settings.
  "philanthropy.beneficiary": "our philanthropy partner",
  "philanthropy.beneficiaryShort": "our philanthropy partner",
  "philanthropy.raisedYear": "",
  "philanthropy.raisedAmount": "",
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

  // Timeline / FAQ / Values / Highlights / Recent content arrays.
  // WHITE-LABEL: these default to EMPTY ("[]") so the per-chapter site renderer
  // (components/site/chapter-landing.tsx) falls through to its TERM-AWARE
  // defaults (timelineDefault/faqDefault/valuesDefault/… keyed off the chapter's
  // orgType). A fraternity (the default orgType) gets the exact original copy
  // verbatim; a sorority renders "sisterhood/sisters" and a pro/co-ed org
  // "membership/members" with zero manual edits — no gendered literal is ever
  // seeded into a tenant's DB. The rush chair can still override any array with
  // their own chapter-specific copy via /admin/settings. (Same pattern feed.json
  // already uses to avoid leaking another chapter's content.)
  "timeline.json": JSON.stringify([]),
  "faq.json": JSON.stringify([]),
  "values.json": JSON.stringify([]),
  "highlights.json": JSON.stringify([]),
  "recent.json": JSON.stringify([]),

  // Instagram feed grid: [{ slug, caption, tag, objectPosition }]
  // WHITE-LABEL: defaults to an EMPTY array so a fresh tenant NEVER ships
  // another chapter's real Instagram posts. With no entries the InstagramFeed
  // renders the branded cardinal-red Crest empty-state, and show.instagramFeed
  // defaults to "false" so net-new tenants don't surface an empty section at
  // all. The rush chair adds their own chapter's post codes (IG slugs) or image
  // URLs per chapter via /admin/settings, then flips show.instagramFeed on.
  "feed.json": JSON.stringify([]),

  // Testimonial. WHITE-LABEL: defaults EMPTY so a fresh tenant never publishes
  // Phi Sig's real alum quote/name. A chapter-agnostic quote is used as the
  // fallback copy (names no fraternity/chapter); author/year/attribution stay
  // blank until the rush chair adds a real alum via /admin/settings. The
  // section can also be hidden entirely via show.testimonial. (The avatar-
  // initials helper falls back to "A. Mitchell" only for the monogram glyph
  // when author is blank — no real name is rendered.)
  "testimonial.quote": "Joining this chapter wasn't a four-year decision — it was a lifelong one. The friends I met during recruitment are the same people standing next to me at every milestone.",
  "testimonial.author": "",
  "testimonial.classYear": "",
  "testimonial.attribution": "",

  // About-section history paragraph. WHITE-LABEL: chapter-agnostic + ORG-NEUTRAL
  // copy that names NO specific fraternity/sorority/chapter/school AND no gendered
  // term (those render from the cfg identity + term layer elsewhere on the page).
  // The rush chair replaces this with their own chapter's founding story.
  "about.history": "Our organization was founded on three cardinal principles: community, scholarship, and character. The chapter has built campus leaders around those same principles for generations — leaders in the classroom, in the community, and beyond.",

  // Anti-hazing block body (the long paragraph under the Zero-Tolerance heading).
  // WHITE-LABEL: chapter-agnostic + org-neutral — names no national org, chapter,
  // or gendered term.
  "antiHazing.body": "Our national organization and our chapter strictly prohibit hazing in any form. New-member education is built around community, leadership, and chapter history — never humiliation, intimidation, or harm.",

  // Recruitment-term label — drives every season/year string on the public site
  // (hero, schedule, CTA). Single source so a Spring-2027 chapter edits one field
  // instead of hunting hardcoded "Fall '26" literals. `Long` defaults to the
  // org-appropriate verb + the short label inside the renderer when left blank.
  "rush.termLabel": "Fall '26",
  "rush.termLabelLong": "",

  // About-section bullets that were geography/heritage claims. Left BLANK so the
  // renderer uses a region-neutral fallback; a chapter can assert its real
  // alumni footprint / heritage line here without shipping a false claim.
  "about.alumniLine": "",
  "about.heritageLine": "",

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

  // ── ANALYTICS (Plausible — privacy-friendly, cookieless) ──────────────
  // OPTIONAL + INERT by default. Set this to the domain registered in your
  // Plausible dashboard (e.g. "phisig.greekstack.app") and app/layout.tsx
  // injects the lightweight, cookieless Plausible script — no cookie banner
  // required. Left BLANK (the default) → no script, no tracking, byte-identical
  // output. The rush chair sets this per chapter in /admin/settings.
  "analytics.plausibleDomain": "",

  // Section visibility toggles ("true" or "false") — admin can hide any section from the homepage
  "show.statsStrip": "true",
  "show.highlightsBanner": "true",
  "show.values": "true",
  // WHITE-LABEL: default OFF for net-new tenants — the Instagram feed only
  // makes sense once a chapter has wired its own feed.json posts. A tenant
  // turns this on in /admin/settings after adding their posts. (The canonical
  // Phi Sig deployment sets this "true" in its DB.)
  "show.instagramFeed": "false",
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
// On the APEX (no subdomain) the public schema may still hold the seed/first
// chapter's content rows (e.g. the original Phi Sig identity), which must NEVER
// render on the generic Greekstack marketing site. These key prefixes are
// chapter-identity/content; on the apex they are dropped so they fall back to the
// neutral DEFAULTS. Operational config (brand.*, show.*, dues.*) still applies.
const APEX_DROP_PREFIX = /^(chapter\.|contact\.|hero\.|spotlight\.|eboard\.|testimonial\.|about\.|philanthropy\.|antiHazing\.|stats\.)/;

/**
 * Per-request memoized via React's `cache`. getSiteConfig is called many times
 * across layout + page + components during a single render (4x in app/layout.tsx,
 * 3x in components/site/chapter-landing.tsx, plus messaging-config helpers), and
 * each call was a real tenant-schema `siteConfig.findMany()` round-trip through
 * the Host-resolving Prisma proxy. `cache()` collapses those to ONE query per
 * request. Outside a React request (crons / SMS webhook / scripts) `cache` simply
 * executes the function each call with no memoization — behavior is unchanged.
 * Safe because within one request the resolved Host (and thus tenant schema) is
 * constant, so the cached value is correct for every caller in that request.
 */
export const getSiteConfig = requestCache(async function getSiteConfig(): Promise<
  Record<string, string>
> {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await prisma.siteConfig.findMany();
  } catch {
    rows = [];
  }

  // Detect the apex (request context only; headers() throws at build → not apex).
  let isApex = false;
  try {
    const { headers } = require("next/headers");
    const h = headers();
    isApex = getSubdomain(h.get("host") || h.get("x-forwarded-host")) === null;
  } catch {
    isApex = false;
  }

  const map: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) {
    if (isApex && APEX_DROP_PREFIX.test(r.key)) continue;
    map[r.key] = r.value;
  }
  return map;
});
