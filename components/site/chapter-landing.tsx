import React from "react";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { MobileBottomNav } from "@/components/site/mobile-nav";
import { RushForm } from "@/components/site/rush-form";
import { type FeedPost } from "@/components/site/instagram-feed";
import { StickyCTA } from "@/components/site/sticky-cta";
import { ScrollProgressBar } from "@/components/site/anim";
// Bespoke chapter-brand duotone icons used as the `icon` value on the stat rows
// (imported direct from the file, NOT the barrel, so
// components/brand/icons/index.ts stays untouched). They default their accent to
// the live chapter primary, so the stat marks read in the CHAPTER color.
import {
  IconBond, IconScholarship, IconHandshake,
  IconShieldCheck as IconShieldCheckDuo,
} from "@/components/brand/icons/chapter";
import { getSiteConfig } from "@/lib/site-config";
import { parseRushFormConfig } from "@/lib/rush-form-config";
import { chapterIdentityFromCfg, type ChapterTerms } from "@/lib/chapter-identity";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import { cleanUrl, titleCaseAddress } from "@/lib/utils";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
// Chapter-site generator (white-label templates). The 15 SECTION BODIES are
// shared across all three templates (buildSectionMap); a template only swaps the
// hero variant + the default section order, both resolved from template-config.
// SectionEyebrow is imported for the booth branch below (the only place outside
// the extracted sectionMap that still uses it).
import { buildSectionMap } from "@/components/site/templates/section-map";
import { SectionEyebrow } from "@/components/site/templates/helpers";
import {
  TEMPLATE_HERO,
  TEMPLATE_ORDER,
} from "@/components/site/templates/template-config";
import { resolveSiteConfig } from "@/lib/site-generator/template-presets";
import type { SectionContext } from "@/components/site/templates/types";
import { getStructuredOrder, getSectionContentByKey } from "@/lib/section-builder";


export const dynamic = "force-dynamic";

/**
 * Homepage metadata reads CURRENT cfg so the description / OG / Twitter tags
 * stay in sync with admin-edited stats. Round-7 maintainability critic flagged
 * the layout-level static description as a regression: admin could edit stat
 * tiles to "45 brothers / 3.20 GPA" while meta still said "60+ / 3.45".
 */
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const identity = chapterIdentityFromCfg(cfg);
  const summary = `${cfg["stats.brothers"]} ${identity.terms.membersLower} · ${cfg["stats.gpa"]} GPA · ${cfg["philanthropy.raisedTotal"]} raised for ${cfg["philanthropy.beneficiaryShort"]}.`;
  // Google truncates SERP descriptions around 155–160 chars. Keeping the meta
  // description under that ceiling prevents the trailing "we'll text you when
  // the schedule drops" from showing as "...". The longer pitch lives in the
  // hero copy, which is what users see after they click.
  const desc = `${identity.ogAlt}. ${summary} Join the rush interest list - we'll text when the schedule drops.`;
  return {
    title: identity.pageTitle,
    description: desc,
    alternates: { canonical: "/" },
    openGraph: {
      title: identity.pageTitle,
      description: `${summary} Get on the rush interest list.`,
      type: "website",
      url: "/",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: identity.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: identity.pageTitle,
      description: summary,
      images: ["/twitter-image"],
    },
  };
}

// Safe JSON-array parser used to read admin-editable repeaters from cfg.
// On any error (empty value, malformed JSON, wrong shape), falls back to the
// supplied default so the page never breaks because of a typo in admin.
function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as T[];
    return fallback;
  } catch {
    return fallback;
  }
}

type ValueRow = { icon: string; title: string; body: string };
type TimelineRow = { week: string; title: string; body: string };
type FaqRow = { q: string; a: string };
type HighlightRow = { icon: string; label: string };
type RecentRow = { tag: string; title: string; icon: string };

// Built from the chapter's term set so a sorority shows "Sisterhood … we measure
// sisters by what they do" and a pro/co-ed org "Membership … we measure members
// by what they do". A fraternity (default terms) renders the exact original copy.
function valuesDefault(terms: ChapterTerms): ValueRow[] {
  return [
    { icon: "Users", title: terms.collective, body: "Lifelong friendships built on mutual respect and showing up for each other." },
    { icon: "GraduationCap", title: "Scholarship", body: "Study halls, mentorship, and an alumni network across every field. Chapter GPA above the all-Greek average." },
    { icon: "Heart", title: "Character", body: `We measure ${terms.membersLower} by what they do - service, integrity, and courage in conviction.` },
  ];
}

// Term-aware so a sorority shows "sisterhood events / individual sisters" and a
// pro/co-ed org shows "membership events / individual members". A fraternity
// (default terms) renders the exact original copy verbatim.
function timelineDefault(terms: ChapterTerms): TimelineRow[] {
  return [
    { week: "Week 1", title: "Open events", body: `Cookouts, ${terms.collective.toLowerCase()} events, low-pressure hangs at the house. Show up - no commitment, no application.` },
    { week: "Week 2", title: "Closed events", body: `Invite-only smaller events. Spend more time with individual ${terms.membersLower} and start to feel out the fit.` },
    { week: "Week 3", title: "Interviews & Bid Day", body: "One-on-ones with the e-board, then bids extended. Welcome ceremony for new members." },
  ];
}

// Generic, chapter-agnostic fallbacks. These render ONLY if a chapter hasn't
// supplied its own faq.json / highlights.json / recent.json — so a fresh tenant
// (e.g. Clemson) never sees another chapter's school, philanthropy, or tagline.
// The rush chair fills in the real, chapter-specific copy via /admin/settings.
// Term-aware: a fresh sorority renders "sisterhood/sisters" with zero edits.
function faqDefault(terms: ChapterTerms): FaqRow[] {
  return [
    { q: "Do I need to be a freshman?", a: `Nope. We recruit freshmen, sophomores, juniors, and transfers. If you're on campus and looking for a ${terms.collective.toLowerCase()}, we want to meet you.` },
    { q: "Is there a GPA requirement?", a: "We expect a solid academic standing to receive a bid. Our chapter average is well above the minimum - scholarship is one of our core principles." },
    { q: "How much does it cost?", a: "Dues cover house fees, philanthropy, formals, and chapter operations. We'll walk you through every line item before you accept a bid - no surprises." },
    { q: "Is there hazing?", a: `Zero. Our national organization and our chapter take a hard line against hazing. New-member education is built around ${terms.collective.toLowerCase()}, history, and leadership development. Concerns can be reported anonymously to our chapter advisor or to national HQ.` },
    { q: "What's the time commitment?", a: "About 4 - 6 hours/week of required programming during the semester (chapter meeting, study hall, occasional service). The rest is optional - go as hard or as easy as you want." },
    { q: "Can I join if I'm already in another organization?", a: `Yes - our ${terms.membersLower} are on sports teams, in every college, in honors, and in ROTC. The chapter adds to your campus experience, it doesn't replace it.` },
  ];
}

function highlightsDefault(terms: ChapterTerms): HighlightRow[] {
  return [
    { icon: "HandHeart", label: "Year-round philanthropy" },
    { icon: "Trophy", label: "Signature fundraisers" },
    { icon: "Building2", label: "On-campus chapter house" },
    { icon: "GraduationCap", label: "Above-average chapter GPA" },
    { icon: "Flame", label: `${terms.collective} events year-round` },
    { icon: "Star", label: "Active alumni network" },
  ];
}

function recentDefault(terms: ChapterTerms): RecentRow[] {
  return [
    { tag: "Philanthropy", title: "Annual fundraiser for our chosen charity", icon: "HandHeart" },
    { tag: terms.collective, title: `${terms.collective} events before finals`, icon: "Trophy" },
    { tag: "Formals", title: "Chapter formal - third-party vendor, sober transportation", icon: "Award" },
    { tag: "Service", title: "Community service throughout the semester", icon: "Heart" },
  ];
}

// Parse a stat value string like "3.45", "60+", "$25k+" into the bits CountUp needs.
function parseStat(raw: string): { num: number; prefix?: string; suffix?: string; decimals?: number } {
  if (!raw) return { num: 0 };
  const m = raw.match(/^(\$)?\s*([\d.]+)\s*([\w+]*)$/);
  if (!m) return { num: 0 };
  const numStr = m[2];
  const num = Number.parseFloat(numStr);
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return { num: Number.isFinite(num) ? num : 0, prefix: m[1] || undefined, suffix: m[3] || undefined, decimals: decimals || undefined };
}

/* ── Chapter-brand motion tokens ──────────────────────────────────────────
   Every decorative animation layer on this page is tinted to the CHAPTER's
   brand, never the platform indigo. These read the same runtime CSS vars the
   rest of the build themes through (set per-tenant in app/layout.tsx), so a
   navy/gold or maroon chapter recolors its orbs, glows, and tilts for free.

 - BRAND_ORB_COLORS: the three drifting hero orbs (FloatingOrbs `colors`).
     --brand-primary* are hex; a solid hex still fades cleanly to transparent
     inside the orb's radial gradient.
 - BRAND_TILT_GLOW: the cursor-following 3D-tilt spotlight. Uses the --primary
     HSL triple so we can dial the alpha down to a tasteful glow (a full-opacity
     hex would read as a harsh wash). */
const BRAND_ORB_COLORS = [
  "var(--brand-primary)",
  "var(--brand-primary-dark)",
  "var(--brand-primary-soft)",
];
const BRAND_TILT_GLOW = "hsl(var(--primary) / 0.28)";

export default async function ChapterLandingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const cfg = await getSiteConfig();
  if (cfg["chapter.onboarded"] !== "true") {
    redirect("/onboard");
  }
  
  // Merge structured SectionContent overrides into the config before rendering the landing page
  const sectionOverrides = await getSectionContentByKey();
  if (sectionOverrides) {
    for (const [sectionKey, contentMap] of Object.entries(sectionOverrides)) {
      for (const [field, value] of Object.entries(contentMap)) {
        const fullKey = sectionKey === "hero" && field.startsWith("h1.") 
          ? `hero.${field}` 
          : `${sectionKey}.${field}`;
        cfg[fullKey] = value;
      }
    }
  }
  // Chapter identity from cfg — single source of truth for every body-copy
  // mention of the fraternity / chapter / school so a re-skinned tenant (e.g.
  // Clemson) never shows literal "Phi Sigma Kappa / Gamma Triton / USC" strings.
  const identity = chapterIdentityFromCfg(cfg);
  // Member-noun vocabulary (Brother/Sister/Member, Brotherhood/Sisterhood/…)
  // derived from chapter.orgType. A fraternity (default) yields the original
  // words verbatim; a sorority/pro org re-genders the highest-visibility copy.
  const { terms } = identity;
  // Mirror the brand wordmark's org check (components/brand/wordmark.tsx) so the
  // Phi-Sig-specific heritage artwork (engraved coat of arms, shield JPG) only
  // renders for an actual Phi Sigma Kappa chapter; every other tenant gets the
  // generic auto-tinted Crest instead of another fraternity's coat of arms.
  const isPhiSig = identity.fraternityName.toLowerCase().includes("phi sigma kappa");
  // webcal:// subscribe URL must point at THIS tenant's host, not a hardcoded
  // Phi Sig reference domain. Derive from the request host (same source the
  // Prisma proxy uses to resolve the tenant); fall back to a relative-less
  // origin only when headers are unavailable (build-time static eval).
  const hostHeader =
    headers().get("host") || headers().get("x-forwarded-host") || "";
  const webcalUrl = hostHeader
    ? `webcal://${hostHeader}/api/events.ics`
    : "/api/events.ics";
  const boothParam = searchParams?.booth;
  const booth = (Array.isArray(boothParam) ? boothParam[0] : boothParam) === "1";

  // Rush-term label — the season/year strings (e.g. "Fall '26") were hardcoded
  // across the hero, booth, schedule, and CTA, so a Spring-2027 chapter showed a
  // stale "Fall '26". Drive every season mention from a single cfg key (set in
  // the setup wizard). `termLabelShort` is the compact form ("Fall '26");
  // `termLabelLong` defaults to the org-appropriate verb + the short label.
  const termLabelShort = cfg["rush.termLabel"] || "Fall '26";
  const termLabelLong = cfg["rush.termLabelLong"] || `${terms.recruit} ${termLabelShort}`;
  // Per-tenant custom rush questions — parsed + normalized (typed, ordered,
  // legacy-shape tolerant) via the shared pure helper. [] when un-configured, so
  // the form renders exactly the built-in fields. See lib/rush-form-config.ts.
  const customQuestions = parseRushFormConfig(cfg["rush.customQuestions"]);

  // Booth mode = single-purpose tablet kiosk. Render only the rush form.
  // No hero, no marketing sections, no Instagram feed, no footer chrome — every
  // pixel below the form is a distraction at a 30-second walk-up on bumpy 4G.
  if (booth) {
    return (
      <div className="min-h-screen bg-phisig-mist">        <PublicNav booth />
        <section className="container py-6 sm:py-10">
          <div className="max-w-2xl mx-auto text-center mb-6 animate-slide-up">
            <div className="mb-4 flex justify-center">
              <SectionEyebrow>{identity.fraternityName} at {identity.schoolShort} · Booth</SectionEyebrow>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
              Add yourself to the {termLabelShort} {terms.recruit.toLowerCase()} list.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Three quick fields. We&apos;ll text you when the schedule drops.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <RushForm booth socialHandle={cfg["contact.instagramHandle"] || undefined} socialUrl={cleanUrl(cfg["contact.instagramUrl"]) || undefined} customQuestions={customQuestions} />
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Tablet auto-clears between rushees · {cfg["contact.instagramHandle"]}
          </p>
        </section>
      </div>
    );
  }

  type StatRow = {
    num: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    label: string;
    icon: React.ElementType;
    sub?: string;
  };
  const stats: StatRow[] = [
    // Stats fronted by the bespoke CHAPTER-brand duotone marks (not generic
    // lucide) so the hero stat band reads in the chapter's own color and stays
    // cohesive with the pillars/values above it.
    { ...parseStat(cfg["stats.brothers"]), label: cfg["stats.brothers.label"] || `Active ${terms.membersLower}`, icon: IconBond, sub: cfg["stats.brothers.sub"] || undefined },
    { ...parseStat(cfg["stats.gpa"]), label: cfg["stats.gpa.label"] || "Chapter GPA", icon: IconScholarship, sub: cfg["stats.gpa.sub"] || "Above the all-Greek average" },
    { ...parseStat(cfg["stats.years"]), label: cfg["stats.years.label"] || "Years strong", icon: IconShieldCheckDuo, sub: cfg["stats.years.sub"] || `Founded ${identity.foundingYear}` },
    { ...parseStat(cfg["stats.charity"]), label: cfg["stats.charity.label"] || "Raised for charity", icon: IconHandshake, sub: cfg["stats.charity.sub"] || cfg["philanthropy.beneficiaryShort"] },
  ];
  const eboard = [1, 2, 3, 4, 5]
    .map((n) => ({
      name: cfg[`eboard.${n}.name`] || "",
      role: cfg[`eboard.${n}.role`] || "",
      headshotUrl: cfg[`eboard.${n}.headshotUrl`] || "",
    }))
    .filter((m) => m.name && m.role);

  // Admin-editable repeater arrays — parsed JSON with safe fallbacks
  const VALUES = parseJsonArray<ValueRow>(cfg["values.json"], valuesDefault(identity.terms));
  const TIMELINE = parseJsonArray<TimelineRow>(cfg["timeline.json"], timelineDefault(identity.terms));
  const FAQ = parseJsonArray<FaqRow>(cfg["faq.json"], faqDefault(identity.terms));
  const HIGHLIGHTS = parseJsonArray<HighlightRow>(cfg["highlights.json"], highlightsDefault(identity.terms));
  const RECENT = parseJsonArray<RecentRow>(cfg["recent.json"], recentDefault(identity.terms));
  // White-label Instagram feed — driven entirely by the chapter's own
  // `feed.json` repeater. Default is EMPTY, so a fresh tenant renders the
  // branded Crest empty-state, never another chapter's real posts.
  const FEED = parseJsonArray<FeedPost>(cfg["feed.json"], []);

  // Next public rush event for the live countdown chip in the hero.
  // Best-effort — if the DB read fails or the schedule is empty, the
  // countdown component gracefully shows the "schedule drops in August"
  // placeholder instead of a broken state.
  let nextEvent: { startsAt: Date; endsAt: Date | null; name: string; location: string | null } | null = null;
  try {
    nextEvent = await prisma.event.findFirst({
      where: {
        isPrivate: false,
        // Include events that are happening now (started but not ended yet).
        OR: [
          { startsAt: { gte: new Date() } },
          { endsAt: { gte: new Date() } },
        ],
      },
      orderBy: { startsAt: "asc" },
      select: { startsAt: true, endsAt: true, name: true, location: true },
    });
  } catch {
    nextEvent = null;
  }

  // Hero headline kinetics. The real H1 (lead + tail + highlight) renders
  // statically for LCP; a TypewriterCycle is layered over JUST the highlighted
  // word so it types through a few rush value-props (built from this chapter's
  // term set so a sorority/co-ed org stays correct) and then SETTLES back on
  // the real highlight word. ssrText = the real highlight, so server render and
  // first paint already show the true headline (no CLS, no empty LCP node).
  const heroHighlight = cfg["hero.h1.highlight"] || terms.collective;
  const heroHighlightPhrases = [
    `Meet the ${terms.membersLower}`,
    "Find your people",
    `${terms.recruit} starts soon`,
    heroHighlight,
  ];
  // Hero eyebrow + headline lead/tail fall back to TERM-AWARE strings so a fresh
  // tenant's hero re-genders/re-seasons (a sorority shows "Recruitment Fall '26"
  // and "Recruitment starts", not "Fall Rush 2026" / "Rush starts"). A chapter
  // that set its own hero copy in /admin/settings keeps it verbatim.
  const heroEyebrow = cfg["hero.eyebrow"] || termLabelLong;
  const heroLead = cfg["hero.h1.lead"] || `${terms.recruit} starts`;
  const heroTail = cfg["hero.h1.tail"] || termLabelShort;

  // Chapter glyph set for the page-wide drifting letter field is now resolved
  // globally in app/layout.tsx from cfg["chapter.fraternityLetters"] and
  // cfg["chapter.greekLettersGlyphs"]. No per-page glyph resolution needed.

  // ── Chapter-site generator: pack the SectionContext + pick the template ────
  // The 15 section BODIES are shared across all templates (buildSectionMap); the
  // closure vars the old inline sectionMap captured are threaded through this one
  // explicit ctx object (tsc proves the plumbing is complete). The active
  // template only swaps the hero variant + the default section order.
  // Resolve the full visual-system config (preset -> base template x component
  // set x icon family x motion, with per-axis cfg overrides). The base template
  // still drives the hero + default order; the component set + icon family now
  // flow into the section bodies so a preset actually restyles rendered chrome.
  const siteConfig = resolveSiteConfig(cfg);
  const template = siteConfig.baseTemplate;
  const ctx: SectionContext = {
    template,
    componentSet: siteConfig.componentSet,
    iconFamily: siteConfig.iconFamily,
    cfg, identity, terms, isPhiSig, booth,
    stats, eboard, VALUES, TIMELINE, FAQ, HIGHLIGHTS, RECENT, FEED,
    nextEvent, webcalUrl, termLabelShort, termLabelLong, customQuestions,
    heroEyebrow, heroLead, heroTail, heroHighlight, heroHighlightPhrases,
  };
  const hero = TEMPLATE_HERO[template](ctx);
  const sectionMap = buildSectionMap(ctx, hero);

  // The template's default order is used ONLY when the chapter has no explicit
  // website.sections override. An existing override still wins (a chapter that
  // reordered keeps its layout across template switches; the customizer offers a
  // "reset order to template default" action to clear it). TEMPLATE_ORDER.classic
  // is byte-identical to the legacy inline defaultOrder, so Classic is unchanged.
  const defaultOrder = TEMPLATE_ORDER[template];
  // Structured section-builder order (Section table) takes precedence WHEN a
  // tenant has adopted it. getStructuredOrder() returns null when the tenant has
  // no Section rows OR the table doesn't exist yet (pre-migration / un-customized),
  // in which case we fall back to the EXACT legacy SiteConfig render below — so an
  // un-adopted chapter is byte-for-byte identical to before this feature shipped.
  const structuredOrder = await getStructuredOrder();
  const order = structuredOrder ?? parseJsonArray<string>(cfg["website.sections"], defaultOrder);
  const validOrder = order.filter((key) => key in sectionMap);
  if (structuredOrder) {
    // STRUCTURED MODE: an omitted section is an INTENTIONALLY hidden section, so
    // we must NOT re-append the rest of the template default (that would un-hide
    // what the admin turned off). We only defensively guarantee the two sections
    // the builder never lets you remove — the hero and the sign-up form — so the
    // public site can never render without a header or a way to register.
    ["hero", "register"].forEach((key) => {
      if (key in sectionMap && !validOrder.includes(key)) validOrder.unshift(key);
    });
  } else {
    // LEGACY MODE (byte-identical): re-append any default section missing from the
    // saved order so a partial website.sections override still renders everything.
    defaultOrder.forEach((key) => {
      if (!validOrder.includes(key)) {
        validOrder.push(key);
      }
    });
  }
  return (
    <div
      className="relative min-h-screen overflow-x-clip"
      data-preset={siteConfig.presetId}
      data-component-set={siteConfig.componentSet}
      data-icon-family={siteConfig.iconFamily}
      data-motion={siteConfig.motion}
    >
      <div aria-hidden="true" className="fixed inset-0 z-[-10] bg-background" />
      {/* Drifting Greek letters rendered globally by app/layout.tsx — chapter-
          specific glyphs + brand color resolved there from cfg. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[-4] select-none overflow-hidden">
        {(identity.schoolName || identity.schoolShort) && (
          <div className="absolute inset-x-0 top-[26%] flex justify-center px-4">
            <p
              className="gs-school-drift whitespace-nowrap font-serif text-[clamp(1.5rem,4vw,3rem)] font-black uppercase leading-none tracking-tight text-[hsl(var(--primary))]"
              style={{ ["--gso" as string]: 0.12 }}
            >
              {identity.schoolName || identity.schoolShort}
            </p>
          </div>
        )}
        {(identity.schoolShort || identity.schoolName) && (
          <p className="absolute -bottom-[1vh] right-[-0.25vw] whitespace-nowrap text-right font-serif text-[clamp(3.5rem,16vh,9.5rem)] font-black uppercase leading-[0.82] tracking-tight text-[hsl(var(--primary))] opacity-[0.07]">
            {identity.schoolShort || identity.schoolName}
          </p>
        )}
      </div>
      <div className="relative z-[2]">
        <ScrollProgressBar className="bg-gradient-to-r from-phisig-red via-phisig-red to-phisig-red-dark" />
        <PublicNav activeSections={validOrder} />
        {validOrder.map((sectionKey) => (
          <React.Fragment key={sectionKey}>
            {sectionMap[sectionKey]}
          </React.Fragment>
        ))}
        <PublicFooter />
        <StickyCTA />
        <MobileBottomNav
          rushPhone={cfg["contact.rushPhone"]}
          rushEmail={cfg["contact.rushEmail"]}
          memberLabel={terms.members}
        />
        <div className="md:hidden h-20" aria-hidden />
      </div>
    </div>
  );
}
