import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { MobileBottomNav } from "@/components/site/mobile-nav";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal, Crest } from "@/components/brand/wordmark";
import { Scene } from "@/components/brand/scene";
import { InstagramFeed, type FeedPost } from "@/components/site/instagram-feed";
import { SmartImage, AvatarImage } from "@/components/site/smart-image";
import { StickyCTA } from "@/components/site/sticky-cta";
import { Reveal } from "@/components/site/reveal";
import {
  TypewriterCycle,
  Tilt3DCard,
  Magnetic,
  Parallax,
  ScrollProgressBar,
  Reveal3D,
  Reveal3DItem,
  FloatingOrbs,
  AnimatedCounter,
  Spotlight,
  Grain,
} from "@/components/site/anim";
// Bespoke chapter-brand duotone icons (imported direct from the file, NOT the
// barrel, so components/brand/icons/index.ts stays untouched). These default
// their accent to the live chapter primary, so every decorative mark on the
// rush site reads in the CHAPTER color — never platform blue/gold.
import {
  IconBond, IconScholarship, IconCharacter, IconHandshake,
  IconPin, IconMail as IconMailDuo, IconInstagram as IconInstagramDuo,
  IconHouse, IconSparkle, IconShieldCheck as IconShieldCheckDuo, IconBolt,
  IconCheckCircle as IconCheckCircleDuo,
} from "@/components/brand/icons/chapter";
import { RushCountdown } from "@/components/site/rush-countdown";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg, type ChapterTerms } from "@/lib/chapter-identity";
import { imageSrc, avatarSrc, isCloudinaryUrl } from "@/lib/image-url";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight, ShieldCheck, Users, Trophy, Heart,
  GraduationCap, Quote, Star, Calendar,
  MapPin, Award, Music, BookOpen, HandHeart,
  Instagram, Mail, Phone, Building2, Flame, Crown,
  CheckCircle2, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { cleanUrl, cleanMailto, cleanTel, titleCaseAddress, cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { FloatingSymbols } from "@/components/site/floating-symbols";
import { GreekLetterField } from "@/components/site/greek-letter-field";

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
  const desc = `${identity.ogAlt}. ${summary} Join the rush interest list — we'll text when the schedule drops.`;
  return {
    title: identity.pageTitle,
    description: desc,
    alternates: { canonical: "/" },
    openGraph: {
      title: identity.pageTitle,
      description: `${summary} Get on the rush interest list.`,
      type: "website",
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: identity.pageTitle,
      description: summary,
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
    { icon: "Heart", title: "Character", body: `We measure ${terms.membersLower} by what they do — service, integrity, and courage in conviction.` },
  ];
}

// Term-aware so a sorority shows "sisterhood events / individual sisters" and a
// pro/co-ed org shows "membership events / individual members". A fraternity
// (default terms) renders the exact original copy verbatim.
function timelineDefault(terms: ChapterTerms): TimelineRow[] {
  return [
    { week: "Week 1", title: "Open events", body: `Cookouts, ${terms.collective.toLowerCase()} events, low-pressure hangs at the house. Show up — no commitment, no application.` },
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
    { q: "Is there a GPA requirement?", a: "We expect a solid academic standing to receive a bid. Our chapter average is well above the minimum — scholarship is one of our core principles." },
    { q: "How much does it cost?", a: "Dues cover house fees, philanthropy, formals, and chapter operations. We'll walk you through every line item before you accept a bid — no surprises." },
    { q: "Is there hazing?", a: `Zero. Our national organization and our chapter take a hard line against hazing. New-member education is built around ${terms.collective.toLowerCase()}, history, and leadership development. Concerns can be reported anonymously to our chapter advisor or to national HQ.` },
    { q: "What's the time commitment?", a: "About 4–6 hours/week of required programming during the semester (chapter meeting, study hall, occasional service). The rest is optional — go as hard or as easy as you want." },
    { q: "Can I join if I'm already in another organization?", a: `Yes — our ${terms.membersLower} are on sports teams, in every college, in honors, and in ROTC. The chapter adds to your campus experience, it doesn't replace it.` },
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
    { tag: "Formals", title: "Chapter formal — third-party vendor, sober transportation", icon: "Award" },
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

  // Booth mode = single-purpose tablet kiosk. Render only the rush form.
  // No hero, no marketing sections, no Instagram feed, no footer chrome — every
  // pixel below the form is a distraction at a 30-second walk-up on bumpy 4G.
  if (booth) {
    return (
      <main id="main-content" className="min-h-screen bg-phisig-mist">        <PublicNav booth />
        <section className="container py-6 sm:py-10">
          <div className="max-w-2xl mx-auto text-center mb-6 animate-slide-up">
            <div className="mb-4 flex justify-center">
              <SectionEyebrow>{identity.fraternityName} at {identity.schoolShort} · Booth</SectionEyebrow>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
              Add yourself to the {termLabelShort} {terms.recruit.toLowerCase()} list.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Three quick fields. We&apos;ll text you when the schedule drops.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <RushForm booth socialHandle={cfg["contact.instagramHandle"] || undefined} socialUrl={cleanUrl(cfg["contact.instagramUrl"]) || undefined} />
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Tablet auto-clears between rushees · {cfg["contact.instagramHandle"]}
          </p>
        </section>
      </main>
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
    { ...parseStat(cfg["stats.brothers"]), label: cfg["stats.brothers.label"] || `Active ${terms.membersLower}`, icon: Users, sub: cfg["stats.brothers.sub"] || undefined },
    { ...parseStat(cfg["stats.gpa"]), label: cfg["stats.gpa.label"] || "Chapter GPA", icon: GraduationCap, sub: cfg["stats.gpa.sub"] || "Above the all-Greek average" },
    { ...parseStat(cfg["stats.years"]), label: cfg["stats.years.label"] || "Years strong", icon: ShieldCheck, sub: cfg["stats.years.sub"] || `Founded ${identity.foundingYear}` },
    { ...parseStat(cfg["stats.charity"]), label: cfg["stats.charity.label"] || "Raised for charity", icon: HandHeart, sub: cfg["stats.charity.sub"] || cfg["philanthropy.beneficiaryShort"] },
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

  // Chapter glyph set for the page-wide drifting letter field — THIS chapter's
  // own single letters PLUS their joined monograms (owner round-8: letters and
  // Greek letters drift TOGETHER per frat — "Φ", "Σ", "Κ" and "ΦΣΚ"/"ΓΤ" all
  // cross the screen). Falls back to a tasteful Greek sampler if a tenant
  // hasn't set any, so the field always reads as "their letters" drifting
  // behind the whole site (tinted to their brand --primary).
  const singleGlyphs = Array.from(
    new Set(
      `${identity.fraternityLetters || ""}${identity.greekLettersGlyphs || ""}`
        .split("")
        .filter((c) => c.trim()),
    ),
  );
  const monogramGlyphs = Array.from(
    new Set(
      [identity.fraternityLetters, identity.greekLettersGlyphs]
        .map((s) => (s || "").trim())
        .filter((s) => s.length > 1),
    ),
  );
  const chapterGlyphs = [...singleGlyphs, ...monogramGlyphs];
  const fieldGlyphs = chapterGlyphs.length ? chapterGlyphs : undefined;

  return (
    <main id="main-content" className="relative min-h-screen overflow-x-clip">
      {/* Page-background layer (z-0): the opaque page wash. Owner round-8
          z-stack — bg z-0 → letters z-1 → content z-2+. Letters were
          previously parked at NEGATIVE z, where in-flow section backgrounds
          painted straight over them. */}
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-background" />
      {/* Page-wide drifting Greek-letter field — THIS chapter's own letters,
          tinted to their brand --primary, at z-1: plainly IN FRONT of the page
          wash and BEHIND every card/section (content wrapper is z-2). Calm
          drift so it reads as a serene brand texture, never distracting. */}
      <GreekLetterField
        glyphs={fieldGlyphs}
        color="hsl(var(--primary))"
        calm
        count={30}
        seed={0x3a7c91d5}
      />
      {/* Ambient chapter-identity layer — the SCHOOL wordmark drifting across
          the top and the school name rendered big in the bottom-right corner,
          on the same z-1 plane as the letter field (above the z-0 base, below
          the z-2 content). The hero's own opaque layers cover it up top, so it
          reads through the open mid-page sections. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] select-none overflow-hidden">
        {/* School wordmark — smaller + drifting across the page (owner
            round-8), so the school identity is plainly visible in the open
            bands between sections instead of one huge blocked watermark. */}
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
        {/* School name BIG — bottom-right corner (owner round-9: the old
            murky corner-crest watermark was unreadable; the school's own
            name, huge and brand-tinted like a stadium wall, is the identity
            moment). Right-anchored so a long name crops cleanly off the left
            edge; swaps per-tenant on reskin like everything else here. */}
        {(identity.schoolShort || identity.schoolName) && (
          <p className="absolute -bottom-[1vh] right-[-0.25vw] whitespace-nowrap text-right font-serif text-[clamp(3.5rem,16vh,9.5rem)] font-black uppercase leading-[0.82] tracking-tight text-[hsl(var(--primary))] opacity-[0.07]">
            {identity.schoolShort || identity.schoolName}
          </p>
        )}
      </div>
      {/* CONTENT layer (z-2) — everything below paints ABOVE the z-1 letter
          field + identity watermarks, so letters drift over the page color but
          never over text/cards (owner round-8 z-stack). */}
      <div className="relative z-[2]">
      {/* Brand-tinted scroll-progress bar pinned at the very top of the page.
          Tracks whole-document scroll; aria-hidden, transform-only. */}
      <ScrollProgressBar className="bg-gradient-to-r from-phisig-red via-phisig-red to-phisig-red-dark" />
      <PublicNav />

      {/* ─── HERO ─── */}
      {/* AnimatedBackground (tone="brand") paints drifting aurora blobs in the
          chapter color behind the hero; it renders a relative, isolated,
          overflow-hidden box, so it stands in for the old hero <section>. The
          gradient + dot-grid + floating glyphs layer underneath via negative z. */}
      <AnimatedBackground variant="aurora" tone="brand" className="overflow-hidden">
        <div className="absolute inset-0 -z-30 bg-gradient-to-br from-phisig-red-soft via-white to-phisig-red-soft/40" aria-hidden />
        <div className="absolute inset-0 -z-20 bg-dot-grid opacity-30" aria-hidden />
        {/* Soft top vignette so the nav reads cleanly over the aurora wash */}
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-white/70 to-transparent" aria-hidden />
        <FloatingSymbols
          greekLettersGlyphs={identity.greekLettersGlyphs}
          fraternityLetters={identity.fraternityLetters}
        />
        {/* Drifting brand-colored orbs for an "alive" depth layer behind the
            hero copy. Tinted to THIS chapter's brand (never platform indigo);
            decorative (aria-hidden + pointer-events-none) and reduced-motion
            safe inside the primitive. */}
        <FloatingOrbs colors={BRAND_ORB_COLORS} blur={100} className="-z-10 opacity-70" />
        {/* Tactile film-grain over the aurora wash for a premium, printed-poster
            depth. Static (no motion), self-contained data-URI, decorative. */}
        <Grain className="-z-10" opacity={0.05} />
        {/* Cursor-tracked brand spotlight — a soft radial glow in the CHAPTER
            color that follows the pointer across the hero for interactive depth.
            Fine-pointer-only + reduced-motion-safe (renders nothing on touch),
            so it never costs a phone user anything. Brand-tinted, never blue. */}
        <Spotlight
          size={520}
          color="hsl(var(--primary) / 0.16)"
          edgeColor="hsl(var(--primary) / 0.07)"
          className="-z-10"
        />
        {/* Faint brand-tinted grid that parallaxes on scroll for real depth.
            Masked to fade at the edges so it never competes with the headline. */}
        <Parallax
          aria-hidden="true"
          translateY={64}
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_at_50%_30%,black_20%,transparent_70%)]"
        >
          <span />
        </Parallax>
        {/* Floating hero shield — the chapter's OWN brand-tinted Crest (SVG,
            recolors per-tenant via --brand-primary), not a static Phi-Sig-red
            PNG. Given a glassmorphic 3D treatment: a frosted brand-glow disc
            behind it, a soft orbit drift, and a deep brand drop-shadow so it
            reads as a premium 3D mark hovering in the hero for ANY chapter. */}
        <div className="absolute right-[7%] top-[9%] -z-10 hidden md:block animate-float [animation-delay:1s] select-none pointer-events-none">
          <div className="relative h-[360px] w-[360px] animate-orbit-slow" style={{ animationDuration: "45s" }}>
            {/* Frosted brand-glow halo behind the shield */}
            <div
              aria-hidden="true"
              className="absolute inset-[8%] rounded-[42%] bg-[radial-gradient(circle_at_35%_30%,hsl(var(--primary)/0.32),hsl(var(--primary)/0.10)_55%,transparent_72%)] blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute inset-[14%] rounded-[40%] border border-white/40 bg-white/30 backdrop-blur-md shadow-[0_30px_70px_-20px_hsl(var(--primary)/0.45)]"
            />
            <Crest className="absolute inset-[18%] h-[64%] w-[64%] drop-shadow-[0_18px_40px_hsl(var(--primary)/0.40)]" />
          </div>
        </div>

        <div className="container section-y">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
            <div className="max-w-2xl animate-slide-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-white/95 backdrop-blur px-3 py-1 text-xs font-medium text-phisig-red shadow-sm animate-heartbeat">
                <span className="h-1.5 w-1.5 rounded-full bg-phisig-red animate-pulse" />
                {heroEyebrow}
              </span>
              <RushCountdown
                startsAt={nextEvent ? nextEvent.startsAt.toISOString() : null}
                endsAt={nextEvent?.endsAt ? nextEvent.endsAt.toISOString() : null}
                eventName={nextEvent ? nextEvent.name : null}
                eventLocation={nextEvent ? nextEvent.location : null}
              />
            </div>
            <h1 className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] [text-wrap:balance]">
              {heroLead}{" "}<br className="hidden sm:block" />
              {heroTail}{" "}
              <span className="relative inline-block text-phisig-red">
                {/* Kinetic highlight: types through rush value-props then settles
                    on the real highlight word. SSR/first-paint = the real word
                    (LCP-safe), brand-colored caret. */}
                <TypewriterCycle
                  phrases={heroHighlightPhrases}
                  settleText={heroHighlight}
                  ssrText={heroHighlight}
                  caretClassName="bg-phisig-red"
                />
                {/* Hand-drawn brand underline that scales with the word */}
                <span
                  className="absolute -bottom-1 left-0 h-[0.18em] w-full rounded-full bg-gradient-to-r from-phisig-red to-phisig-red-dark opacity-70"
                  aria-hidden="true"
                />
              </span>.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              {cfg["hero.subline"]}
            </p>
            {/* Equal-width CTA pair (owner round-5): stacked (<md) both fill
                the same max-w-[22rem] column; in a row (md+) the w-fit grid +
                auto-cols-fr sizes BOTH columns to the wider button. */}
            <div className="mt-7 grid w-full max-w-[22rem] grid-cols-1 items-center gap-3 md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
              {/* Primary rush CTA — magnetic pull toward the cursor, now ringed
                  by a slow CHAPTER-brand shimmer (BrandShimmer) that blooms on
                  hover so the conversion action glows. The real <Link> stays
                  focusable/navigable inside; both magnetism and the shimmer spin
                  are inert for keyboard + reduced-motion users. */}
              <Magnetic strength={16} innerStrength={5} className="w-full">
                <BrandShimmer className="w-full rounded-full">
                  <Button asChild variant="gradient" size="xl" className="group cta-shine press w-full">
                    <Link href={cfg["hero.cta.href"] || "#register"}>
                      {cfg["hero.cta.label"] || "Get on the interest list"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Button>
                </BrandShimmer>
              </Magnetic>
              <Magnetic strength={10} innerStrength={3} className="w-full">
                <Button asChild variant="outline" size="xl" className="press w-full bg-white/70 backdrop-blur">
                  <Link href="#about">About the chapter</Link>
                </Button>
              </Magnetic>
            </div>

            {/* Credibility row — upgraded from flat translucent pills to frosted
                glass chips (.gs-glass) with custom brand duotone icons. Each
                lifts a hair on hover for a tactile, premium micro-interaction.
                The icons inherit the chapter color via text-phisig-red. */}
            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-phisig-red/90 transition-transform duration-300 hover:-translate-y-0.5">
                <IconPin className="h-3.5 w-3.5 text-phisig-red" /> <span className="text-foreground/80">{titleCaseAddress(cfg["contact.address"])}, {titleCaseAddress(cfg["contact.cityState"])}</span>
              </span>
              <span className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-phisig-red/90 transition-transform duration-300 hover:-translate-y-0.5">
                <IconBolt className="h-3.5 w-3.5 text-phisig-red" /> <span className="text-foreground/80">Reply within 24 hours</span>
              </span>
              <span className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-phisig-red/90 transition-transform duration-300 hover:-translate-y-0.5">
                <IconShieldCheckDuo className="h-3.5 w-3.5 text-phisig-red" /> <span className="text-foreground/80">{identity.greekLetters} chapter</span>
              </span>
              <Link
                href={cleanUrl(cfg["contact.instagramUrl"])}
                target="_blank"
                rel="noreferrer noopener"
                className="group/ig inline-flex items-center gap-1.5 rounded-full border border-phisig-red/25 bg-phisig-red-soft/60 px-3 py-1.5 font-medium text-phisig-red backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-phisig-red-soft hover:shadow-md hover:shadow-phisig-red/15"
              >
                <IconInstagramDuo className="h-3.5 w-3.5 text-phisig-red transition-transform duration-300 group-hover/ig:scale-110" /> {cfg["contact.instagramHandle"]}
              </Link>
            </div>
            </div>

            {/* Hero photo collage — real chapter posts via Instagram embed.
                The grid tilts in 3D toward the cursor with a brand-colored
                glow; the "Since {year}" badge stays pinned outside the tilt. */}
            <div className="relative animate-slide-up [animation-delay:200ms]">
              <Tilt3DCard max={7} glareColor={BRAND_TILT_GLOW} className="rounded-2xl gs-float-shadow">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
                  <PostTile
                    slug={cfg["hero.tile1.slug"]}
                    caption={cfg["hero.tile1.caption"]}
                    icon={iconFor(cfg["hero.tile1.icon"])}
                    className="col-span-2 aspect-[4/5] sm:aspect-[4/4]"
                    priority
                  />
                  <PostTile
                    slug={cfg["hero.tile2.slug"]}
                    caption={cfg["hero.tile2.caption"] || terms.collective}
                    icon={iconFor(cfg["hero.tile2.icon"])}
                    className="aspect-square"
                  />
                  <PostTile
                    slug={cfg["hero.tile3.slug"]}
                    caption={cfg["hero.tile3.caption"]}
                    icon={iconFor(cfg["hero.tile3.icon"])}
                    className="aspect-square"
                  />
                </div>
              </Tilt3DCard>
              <div className="absolute -right-4 -top-4 hidden lg:flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-xl shadow-phisig-red/40 ring-4 ring-white/80 z-10 pointer-events-none animate-float">
                <span className="text-center leading-tight">
                  <span className="block text-[9px] uppercase tracking-[0.16em] opacity-80">Since</span>
                  <span className="block text-base font-semibold">{identity.foundingYear}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bouncing scroll cue — invites the rushee down into the page.
              Decorative chevron is aria-hidden; the link itself is a real
              in-page anchor for keyboard users. */}
          <div className="mt-12 flex justify-center animate-slide-up [animation-delay:480ms]">
            <Link
              href="#register"
              aria-label="Scroll to the rush sign-up form"
              className="group inline-flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-phisig-red"
            >
              <span className="uppercase tracking-[0.18em]">Scroll</span>
              <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </AnimatedBackground>

      {/* ─── STATS STRIP ─── */}
      {cfg["show.statsStrip"] !== "false" && (
      <section className="relative bg-gradient-to-br from-phisig-red via-phisig-red to-phisig-red-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
        {/* Soft top sheen for depth against the hero above */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden />
        <div className="absolute -right-20 -top-20 opacity-10">
          <Seal className="w-[300px] h-[300px] text-white" aria-hidden="true" />
        </div>
        <Reveal3D
          stagger={0.1}
          className="relative container section-y-tight grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 sm:gap-8"
        >
          {stats.map((s) => (
            <Reveal3DItem key={s.label} className="group flex items-center gap-4">
              <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0 shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-105 group-hover:bg-white/20">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight leading-none">
                  <AnimatedCounter value={s.num} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </div>
                <div className="mt-1 text-xs opacity-85">{s.label}</div>
                {s.sub && <div className="text-[10px] opacity-65 mt-0.5">{s.sub}</div>}
              </div>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </section>
      )}

      {/* ─── HIGHLIGHTS BANNER ─── */}
      {cfg["show.highlightsBanner"] !== "false" && (
      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-secondary/10 overflow-hidden">
        <div className="container py-5 flex flex-wrap items-center gap-2 sm:gap-2.5 justify-center">
          {HIGHLIGHTS.map((h) => {
            const Icon = iconFor(h.icon);
            return (
              <span
                key={h.label}
                className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs sm:text-sm text-muted-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-phisig-red/30 hover:text-foreground hover:shadow-md hover:shadow-phisig-red/10"
              >
                <Icon className="h-3.5 w-3.5 text-phisig-red transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                <span>{h.label}</span>
              </span>
            );
          })}
        </div>
      </section>
      )}

      {/* ─── VALUES ─── */}
      {cfg["show.values"] !== "false" && (
      <section className="container section-y">
        <Reveal3D className="max-w-2xl mb-10">
          <span className="inline-flex items-center rounded-full border border-phisig-red/20 bg-phisig-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">
            Three principles
          </span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
            {identity.cardinalPrinciples.split(/,\s*/).join(". ")}.
          </h2>
        </Reveal3D>
        {/* Staggered 3D reveal as the grid scrolls in; each card is a
            cursor-tracked 3D tilt with a brand-colored glow. */}
        <Reveal3D stagger={0.09} className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {VALUES.map((v) => (
            <Reveal3DItem key={v.title} className="h-full">
              <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className="h-full rounded-2xl">
                <div className="h-full rounded-2xl border border-border bg-card p-6 sm:p-7 relative overflow-hidden group transition-colors hover:border-phisig-red/30">
                  <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-gradient-to-br from-phisig-red-soft/60 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />
                  <IconChip icon={chipIconFor(v.icon)} tone="brand" size="lg" className="relative transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
                  <h3 className="relative mt-5 text-xl font-semibold tracking-tight">{v.title}</h3>
                  <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
                  <Crest className="absolute -bottom-4 -right-4 h-20 w-20 text-phisig-red opacity-[0.08]" aria-hidden="true" />
                </div>
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </section>
      )}

      {/* ─── REGISTER ─── */}
      <section id="register" className="relative bg-phisig-mist border-y border-border scroll-mt-20 overflow-hidden">
        {/* Themed aurora + grid wash behind the form — brand-toned, reduced-motion
            safe via the foundation component. Sits at the section's base layer;
            the form card renders above it untouched. */}
        <AnimatedBackground
          variant="aurora-grid"
          tone="brand"
          className="absolute inset-0 -z-0 opacity-60"
        />
        <div className="relative container section-y">
          <Reveal3D className="max-w-xl mx-auto text-center mb-8">
            <IconChip icon={IconSparkle} tone="brand" size="md" className="mx-auto mb-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-phisig-red">
              Get on the list
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
              Drop your number.
            </h2>
            <p className="mt-3 text-muted-foreground text-base sm:text-lg">
              No spam, no ceremony — about 60 seconds. We'll text the second the
              {" "}{termLabelShort} schedule drops.
            </p>
            {/* Trust signals — frosted glass chips (the section's aurora frosts
                through them) with custom brand check icons. They lift on hover
                so the conversion section feels considered + premium. */}
            <ul className="mt-5 inline-flex flex-wrap justify-center items-center gap-2 text-xs text-muted-foreground">
              <li className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                <IconCheckCircleDuo className="h-3.5 w-3.5 text-phisig-red" />
                Goes straight to the rush chair
              </li>
              <li className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                <IconCheckCircleDuo className="h-3.5 w-3.5 text-phisig-red" />
                Up to 8 texts per cycle, opt out anytime
              </li>
              <li className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                <IconCheckCircleDuo className="h-3.5 w-3.5 text-phisig-red" />
                Never sold or shared
              </li>
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">
              18+, or 17 with a parent's permission.{" "}
              <Link href="/privacy" className="text-phisig-red hover:underline">Privacy</Link>{" "}·{" "}
              <Link href="/parents" className="text-phisig-red hover:underline">For parents</Link>.
            </p>
          </Reveal3D>
          {/* The conversion form itself is left exactly as shipped — no motion
              wrapper around it, so submit / validation / focus are untouched. */}
          <div className="max-w-3xl mx-auto">
            <RushForm socialHandle={cfg["contact.instagramHandle"] || undefined} socialUrl={cleanUrl(cfg["contact.instagramUrl"]) || undefined} />
          </div>
        </div>
      </section>

      {/* ─── INSTAGRAM FEED — real chapter photos ─── */}
      {cfg["show.instagramFeed"] !== "false" && (
      <section className="container section-y">
        <Reveal3D className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <SectionEyebrow>{cfg["contact.instagramHandle"]}</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">A year in the life.</h2>
          </div>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            Philanthropy events, {terms.collective.toLowerCase()} before finals, the chapter formal
            (FIPG-compliant, third-party vendor, sober transportation), and dry
            tailgates on game day. The {identity.greekLetters} chapter shows up — all year.{" "}
            <span className="text-phisig-red font-medium">{identity.tagline}</span>
          </p>
        </Reveal3D>
        <InstagramFeed
          count={9}
          posts={FEED}
          handle={cfg["contact.instagramHandle"] || undefined}
          handleUrl={cleanUrl(cfg["contact.instagramUrl"]) || undefined}
        />

        {/* Recent activity strip — staggered 3D reveal + cursor-tracked tilt. */}
        <Reveal3D stagger={0.08} className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {RECENT.map((r) => (
            <Reveal3DItem key={r.title} className="h-full">
              <Tilt3DCard max={7} glareColor={BRAND_TILT_GLOW} className="h-full rounded-2xl">
                <div className="h-full rounded-2xl border border-border bg-card p-5 transition-colors hover:border-phisig-red/30">
                  <div className="flex items-center gap-2.5">
                    <IconChip icon={chipIconFor(r.icon)} tone="brand" size="sm" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">{r.tag}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-snug">{r.title}</p>
                </div>
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>

        <div className="mt-8 text-center">
          <Link
            href={cleanUrl(cfg["contact.instagramUrl"])}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" /> Follow {cfg["contact.instagramHandle"]} for the latest
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </section>
      )}

      {/* ─── HOW RUSH WORKS ─── */}
      {cfg["show.timeline"] !== "false" && (
      <section className="border-y border-border bg-secondary/40">
        <div className="container section-y">
          <Reveal3D className="max-w-2xl mb-10">
            <SectionEyebrow>How rush works</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
              Three weeks. Zero pressure.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
              We're not interested in hazing or hoops. We're interested in finding the right {terms.membersLower}.
            </p>
          </Reveal3D>
          <ol className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {TIMELINE.map((t, i) => (
              // The <li> stays the grid cell (holds the connector that points at
              // the next step). Inside, a staggered 3D reveal + cursor-tracked
              // brand-glow tilt on the card surface itself.
              <li key={t.week} className="relative">
                <Reveal3D delay={i * 0.09} className="h-full">
                  <Tilt3DCard max={7} glareColor={BRAND_TILT_GLOW} className="h-full rounded-2xl">
                    <div className="relative h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-phisig-red/30">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-[11px] font-bold text-white shadow-sm shadow-phisig-red/30">
                          {i + 1}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                          {t.week}
                        </span>
                      </span>
                      <h3 className="mt-3 text-base font-semibold">{t.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
                      <span className="absolute top-5 right-5 text-2xl font-semibold text-phisig-red opacity-15">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </Tilt3DCard>
                </Reveal3D>
                {i < TIMELINE.length - 1 && (
                  <span className="hidden md:block absolute top-1/2 -right-2.5 h-0.5 w-5 bg-phisig-red/30 z-10" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
      )}

      {/* ─── SCHEDULE ─── */}
      <section id="schedule" className="relative section-y scroll-mt-20 overflow-hidden">
        {/* Faint brand-tinted grid band for depth behind the schedule. The dot
            grid + masked fade match the hero so the page reads as one set. */}
        <div className="absolute inset-0 -z-10 bg-dot-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)]" aria-hidden />
        <div className="container">
        <Reveal3D className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <SectionEyebrow>{termLabelShort} calendar</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Upcoming events
            </h2>
          </div>
          <div className="space-y-4 max-w-xl">
            <p className="text-muted-foreground">
              Full {termLabelShort} {terms.recruit.toLowerCase()} schedule drops in August. Get on the interest list above —
              we&apos;ll text everyone the second it&apos;s live. Private events go out by invitation only.
            </p>
            {/* Hide calendar-subscribe CTAs while the rush schedule hasn't
                been published yet. A user clicking through to a 0-event .ics
                feed gets nothing and feels like the site is broken. Once the
                rush chair adds the first public event in /admin/events, both
                CTAs appear automatically (nextEvent goes non-null). */}
            {nextEvent && (
              <div className="flex flex-wrap gap-2">
                <a
                  href={webcalUrl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/30 bg-white px-3 py-1.5 text-xs font-medium text-phisig-red hover:bg-phisig-red-soft transition-colors"
                >
                  <Calendar className="h-3 w-3" aria-hidden="true" /> Subscribe in Apple Calendar
                </a>
                <a
                  href="/api/events.ics"
                  download="chapter-rush.ics"
                  className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/30 bg-white px-3 py-1.5 text-xs font-medium text-phisig-red hover:bg-phisig-red-soft transition-colors"
                >
                  <Calendar className="h-3 w-3" aria-hidden="true" /> Download .ics
                </a>
              </div>
            )}
          </div>
        </Reveal3D>
        {/* ScheduleList is a client island that renders the live event cards —
            left untouched so its own data fetching / states keep working. */}
        <div className="max-w-3xl">
          <ScheduleList />
        </div>
        </div>
      </section>

      {/* ─── TESTIMONIAL + ABOUT (combined for density) ─── */}
      {cfg["show.testimonial"] !== "false" && (
      <section className="border-t border-border bg-gradient-to-b from-phisig-red-soft/40 via-background to-background">
        <div className="container section-y">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Reveal3D>
              <Quote className="h-8 w-8 text-phisig-red mb-3" aria-hidden="true" />
              <blockquote className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                &ldquo;{cfg["testimonial.quote"]}&rdquo;
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-phisig-red text-white flex items-center justify-center font-semibold text-sm">
                  {(cfg["testimonial.author"] || "A. Mitchell")
                    .split(/\s+/)
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className="h-3 w-3 fill-phisig-red text-phisig-red" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-foreground font-medium">{cfg["testimonial.author"]} {cfg["testimonial.classYear"]}</span>
                    {cfg["testimonial.attribution"] && (<> · {cfg["testimonial.attribution"]}</>)}
                  </p>
                </div>
              </div>
            </Reveal3D>
            {/* Heritage scene card — gentle scroll parallax + cursor-tracked 3D
                tilt with a brand-colored glow. */}
            <Parallax translateY={28}>
              <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className="rounded-2xl">
                <Scene theme="tradition" size="tall" caption={`Founded ${identity.foundingYear}. ${identity.greekLetters} at ${identity.schoolShort} since ${identity.charterYear}.`} />
              </Tilt3DCard>
            </Parallax>
          </div>
        </div>
      </section>
      )}

      {/* ─── BROTHER SPOTLIGHT ─── only when this chapter configured one, so a
          fresh tenant never shows an empty/placeholder spotlight. */}
      {cfg["show.spotlight"] !== "false" && !!cfg["spotlight.name"] && (
      <section className="container section-y">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <Reveal3D className="order-2 lg:order-1">
            <SectionEyebrow>{terms.member} of the Month</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Real {terms.membersLower}. Real recognition.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-xl">
              Every month the chapter recognizes a {terms.memberLower} who's gone above and beyond — in
              the classroom, in service, on the field, in leadership.{" "}
              {cfg["spotlight.bio"]}
            </p>
            {(() => {
              // Achievement bullets are per-member — drive them from a
              // pipe/newline-delimited `spotlight.bullets` chapter-config value;
              // fall back to the member's role only (never hardcoded chapter copy).
              const bullets = (cfg["spotlight.bullets"] || cfg["spotlight.role"] || "")
                .split(/\s*[|\n]\s*/)
                .map((s) => s.trim())
                .filter(Boolean);
              return bullets.length > 0 ? (
                <ul className="mt-6 space-y-2.5 text-sm">
                  {bullets.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-phisig-red shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : null;
            })()}
            <p className="mt-6 text-sm text-phisig-red font-medium">
              {identity.tagline}
            </p>
          </Reveal3D>
          <div className="order-1 lg:order-2 relative">
            {/* Spotlight photo links out to Instagram — kept as a real <a>
                inside the tilt so the click-through still works. */}
            <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className="rounded-2xl">
              <a
                href={/^https?:\/\//.test(cfg["spotlight.slug"]) ? cfg["spotlight.slug"] : `https://www.instagram.com/p/${cfg["spotlight.slug"]}/`}
                target="_blank"
                rel="noreferrer noopener"
                className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-secondary shadow-xl shadow-phisig-red/10 block"
              >
                <SmartImage
                  src={imageSrc(cfg["spotlight.slug"], { w: 640, h: 800, crop: "fill", gravity: "auto" })}
                  alt={`${terms.member} of the Month — ${cfg["spotlight.name"]}`}
                  width={640}
                  height={800}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  fallbackLabel={`${terms.member} of the Month`}
                  crestClassName="h-20 w-20"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                    <Star className="h-3 w-3" aria-hidden="true" />{cfg["spotlight.month"] ? <>{cfg["spotlight.month"]} · </> : null}{terms.member} of the Month
                  </span>
                  <p className="mt-2 text-white text-xl font-semibold tracking-tight">
                    {cfg["spotlight.name"]}
                  </p>
                  <p className="text-white/95 text-xs">
                    {cfg["spotlight.role"]}
                  </p>
                </div>
              </a>
            </Tilt3DCard>
            <div className="absolute -top-3 -left-3 hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/30 rotate-[-6deg] pointer-events-none z-20">
              <Star className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ─── EXECUTIVE BOARD ─── */}
      {cfg["show.eboard"] !== "false" && eboard.length > 0 && (
      <section className="border-t border-border">
        <div className="container section-y">
          <Reveal3D className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
            <div>
              <SectionEyebrow>Chapter leadership</SectionEyebrow>
              <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
                Meet the e-board.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xl leading-relaxed">
              The {identity.greekLetters} chapter elects its leadership annually. These are the {terms.membersLower}
              running the show — happy to talk to anyone who wants to learn more.
            </p>
          </Reveal3D>
          {/* Leadership grid — staggered 3D reveal; each card tilts toward the
              cursor with a brand glow. */}
          <Reveal3D stagger={0.07} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {eboard.map((m) => (
              <Reveal3DItem key={m.name} className="h-full">
                <Tilt3DCard max={9} glareColor={BRAND_TILT_GLOW} className="h-full rounded-2xl">
                  <div className="group relative h-full rounded-2xl border border-border bg-card p-5 overflow-hidden transition-colors hover:border-phisig-red/30">
                    <AvatarImage
                      src={m.headshotUrl ? avatarSrc(m.headshotUrl, 112) : ""}
                      alt={`${m.name}, ${m.role}`}
                      initials={m.name.split(" ").map((s) => s[0]).join("")}
                      width={56}
                      height={56}
                      loading="lazy"
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-phisig-red/20 ring-offset-2 ring-offset-card shadow-md shadow-phisig-red/20"
                      fallbackClassName="h-14 w-14 rounded-full text-base shadow-md shadow-phisig-red/20 ring-2 ring-phisig-red/20 ring-offset-2 ring-offset-card"
                    />
                    <div className="mt-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-phisig-red font-semibold">
                        {m.role}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">{m.name}</p>
                    </div>
                    <Crest className="absolute -bottom-3 -right-3 h-16 w-16 text-phisig-red opacity-10" aria-hidden="true" />
                  </div>
                </Tilt3DCard>
              </Reveal3DItem>
            ))}
          </Reveal3D>
        </div>
      </section>
      )}

      {/* ─── ABOUT THE CHAPTER ─── */}
      <section id="about" className="container section-y scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal3D>
            <SectionEyebrow>About the chapter</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Founded in {identity.foundingYear}.<br/> Built for what's next.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              {cfg["about.history"]}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Parents and prospective members:{" "}
              <span className="font-medium text-foreground">{cfg["contact.advisorName"]}</span>
              {cfg["contact.advisorTitle"] && (<>, {cfg["contact.advisorTitle"]}</>)} —{" "}
              <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline font-medium">
                {cfg["contact.advisorEmail"]}
              </a>{cfg["contact.rushPhone"] && (
                <>{" "}· <a href={cleanTel(cfg["contact.rushPhone"])} className="text-phisig-red hover:underline font-medium">{cfg["contact.rushPhone"]}</a></>
              )}.
            </p>

            <ul className="mt-6 space-y-2.5 stagger">
              {[
                "Top-tier academic support and mentorship",
                `Year-round philanthropy with ${cfg["philanthropy.beneficiary"]}`,
                // Region-neutral by default so no tenant claims a geography it
                // doesn't have; a chapter can override with its real footprint.
                cfg["about.alumniLine"] || "Strong, engaged alumni network",
                `${terms.collective} that lasts well beyond graduation`,
              ].filter(Boolean).map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            {/* Heritage block — the original Phi Sigma Kappa coat of arms in
                gold-and-red engraving alongside three cardinal-red Greek
                glyphs. Both pulled from the supplied chapter brand kit. Sits
                here in the About section so a parent or rushee scrolling for
                "is this a real chapter" answer gets the visual confirmation
                of national heritage in one glance. */}
            <div className="mt-7 rounded-xl border border-phisig-red/15 bg-gradient-to-br from-phisig-red-soft/30 via-white to-phisig-red-soft/10 p-4 flex items-center gap-4">
              {isPhiSig ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/brand/coat-of-arms-vintage.jpg"
                  alt={`Original ${identity.fraternityName} coat of arms — engraved ${identity.foundingYear}`}
                  width={84}
                  height={104}
                  loading="lazy"
                  decoding="async"
                  className="h-[84px] w-auto rounded-md ring-1 ring-phisig-red/10 shadow-sm shrink-0"
                />
              ) : (
                <Crest className="h-[104px] w-auto text-phisig-red shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-phisig-red font-semibold">Heritage</p>
                {/* Headline heritage claim is GATED: only assert "one of the
                    oldest" when the org is genuinely old (founded before 1950)
                    OR the chapter supplied its own line. Otherwise lead with a
                    safe, true statement so no tenant ships a false-age claim. */}
                <p className="mt-1 text-sm font-semibold leading-snug">
                  {cfg["about.heritageLine"] ||
                    (identity.foundingYear && Number(identity.foundingYear) < 1950
                      ? "One of the oldest Greek letter societies in the country."
                      : `Proud heritage, carried forward at ${identity.schoolName || "our campus"}.`)}
                </p>
                {(identity.foundingLocation || identity.foundingYear) && (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {[
                      identity.foundingYear
                        ? `${identity.fraternityName} was founded${identity.foundingLocation ? ` at ${identity.foundingLocation}` : ""} in ${identity.foundingYear}.`
                        : "",
                      identity.greekLetters && identity.schoolName && identity.charterYear
                        ? `${identity.greekLetters} has carried the chapter forward at ${identity.schoolName} since ${identity.charterYear}.`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <ContactPill icon={IconPin} label={titleCaseAddress(cfg["contact.address"])} sub={titleCaseAddress(cfg["contact.cityState"])} />
              <ContactPill icon={IconMailDuo} label={cfg["contact.rushEmail"]} sub="Rush questions" />
              <ContactPill icon={IconInstagramDuo} label={cfg["contact.instagramHandle"]} sub="Daily chapter life" />
            </div>

            <div className="mt-8 rounded-xl border border-phisig-red/20 bg-phisig-red-soft/40 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-phisig-red mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-foreground">Zero-tolerance anti-hazing policy.</p>
                  <p className="mt-1 text-muted-foreground">
                    {cfg["antiHazing.body"]}{" "}
                    Concerns can be reported anonymously to{" "}
                    <span className="text-foreground font-medium">{cfg["contact.advisorName"]}</span> at{" "}
                    <a className="text-phisig-red hover:underline" href={cleanMailto(cfg["contact.advisorEmail"])}>{cfg["contact.advisorEmail"]}</a>, or via the national anti-hazing hotline{" "}
                    <a className="text-phisig-red hover:underline font-medium" href={cleanUrl(cfg["antiHazing.hotlineUrl"])} target="_blank" rel="noreferrer noopener">{cfg["antiHazing.hotline"]}</a>.
                  </p>
                </div>
              </div>
            </div>
          </Reveal3D>

          <div className="relative">
            {/* About photo — upgraded from the static CSS .tilt to a real
                cursor-tracked 3D tilt with a brand glow. Stays a working <a>
                out to Instagram; the floating badges stay pinned outside it. */}
            <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className="rounded-2xl">
              <a
                href={/^https?:\/\//.test(cfg["about.slug"]) ? cfg["about.slug"] : `https://www.instagram.com/p/${cfg["about.slug"]}/`}
                target="_blank"
                rel="noreferrer noopener"
                className="aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-secondary shadow-xl block relative"
              >
                <SmartImage
                  src={imageSrc(cfg["about.slug"], { w: 640, h: 800, crop: "fill", gravity: "auto" })}
                  alt={cfg["about.caption"] || `${identity.greekLetters} chapter life`}
                  width={640}
                  height={800}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: cfg["about.objectPosition"] || "50% 50%" }}
                  fallbackLabel={cfg["about.caption"] || "Chapter life"}
                  crestClassName="h-20 w-20"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                    <Award className="h-3 w-3" aria-hidden="true" /> {cfg["about.caption"] || "Chapter formal"}
                  </span>
                  <p className="mt-3 text-xl font-semibold tracking-tight leading-snug">
                    {terms.collective} you can count on — every weekend, every milestone, every year.
                  </p>
                  <p className="mt-1 text-xs text-white/95">{identity.tagline}{cfg["contact.instagramHandle"] ? <> · {cfg["contact.instagramHandle"]}</> : null}</p>
                </div>
              </a>
            </Tilt3DCard>
            <div className="absolute -bottom-5 -left-5 hidden sm:block w-48 rounded-2xl border border-border bg-white shadow-xl p-4 animate-float z-30">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Cardinal Principles
              </p>
              <p className="mt-1.5 text-sm font-semibold tracking-tight leading-snug">
                {terms.collective}<br/>Scholarship<br/>Character
              </p>
            </div>
            <div className="absolute -top-5 -right-5 hidden sm:flex h-20 w-20 items-center justify-center rounded-full bg-phisig-red text-white shadow-xl shadow-phisig-red/30 animate-pulse-ring z-30">
              <span className="text-center leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.16em] opacity-80">Since</span>
                <span className="block text-lg font-semibold">{identity.foundingYear}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      {cfg["show.faq"] !== "false" && (
      <section className="border-y border-border bg-secondary/30">
        <div className="container section-y">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-10">
            <Reveal3D>
              <SectionEyebrow>FAQ</SectionEyebrow>
              <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
                Common questions.
              </h2>
              <p className="mt-3 text-muted-foreground max-w-md">
                Got something else? DM us on{" "}
                <Link
                  href={cleanUrl(cfg["contact.instagramUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-phisig-red hover:underline font-medium"
                >
                  {cfg["contact.instagramHandle"]}
                </Link>{" "}
                or email{" "}
                <a href={cleanMailto(cfg["contact.rushEmail"])} className="text-foreground font-medium hover:underline">{cfg["contact.rushEmail"]}</a>.
              </p>
            </Reveal3D>
            {/* FAQ accordions reveal in a stagger; native <details>/<summary>
                disclosure stays fully functional inside the motion wrapper. */}
            <Reveal3D as="ul" stagger={0.06} className="space-y-3">
              {FAQ.map((item) => (
                <Reveal3DItem
                  as="li"
                  key={item.q}
                  className="group rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-phisig-red/40 hover:shadow-md"
                >
                  <details className="cursor-pointer">
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 list-none">
                      <span className="text-base font-medium tracking-tight">{item.q}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-phisig-red-soft text-phisig-red shrink-0 transition-transform group-open:rotate-45">
                        <ArrowRight className="h-3.5 w-3.5 -rotate-45 group-open:rotate-0 transition-transform" aria-hidden="true" />
                      </span>
                    </summary>
                    <div className="px-5 pb-5 -mt-1">
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </details>
                </Reveal3DItem>
              ))}
            </Reveal3D>
          </div>
        </div>
      </section>
      )}

      {/* ─── WHERE TO FIND US ─── */}
      {cfg["show.whereWeLive"] !== "false" && (
      <section className="container section-y">
        {/* Single-column: the prior left tile hardcoded one chapter's Movember
            Instagram post, which would leak onto every tenant. There is no
            chapter-agnostic "house photo" cfg key, so per white-label policy the
            photo tile is omitted (better than showing another chapter's post)
            and the address + contact cards carry this section. */}
        <div className="max-w-3xl mx-auto">
          <Reveal3D>
            <SectionEyebrow>Where we live</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              The house at {titleCaseAddress(cfg["contact.address"])}.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The {identity.fraternityName} chapter house sits at <span className="text-foreground font-medium">{titleCaseAddress(cfg["contact.address"])}</span>, close
              to campus. It&apos;s where the cookouts,
              chapter meetings, and Bid Nights happen — and where most rushes meet the chapter
              for the first time.
            </p>
            {/* Contact tiles reveal in a stagger; each stays a real link. */}
            <Reveal3D stagger={0.08} className="mt-6 grid sm:grid-cols-2 gap-3">
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanUrl(cfg["contact.mapsUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconPin className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> Address
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{titleCaseAddress(cfg["contact.address"])}</p>
                  <p className="text-xs text-muted-foreground">{titleCaseAddress(cfg["contact.cityState"])}</p>
                </Link>
              </Reveal3DItem>
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanUrl(cfg["contact.instagramUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconInstagramDuo className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> Daily updates
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{cfg["contact.instagramHandle"]}</p>
                  <p className="text-xs text-muted-foreground">Follow for chapter life</p>
                </Link>
              </Reveal3DItem>
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanMailto(cfg["contact.rushEmail"])}
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconMailDuo className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> Rush questions
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{cfg["contact.rushEmail"]}</p>
                  <p className="text-xs text-muted-foreground">We reply within 24 hours</p>
                </Link>
              </Reveal3DItem>
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanUrl(cfg["chapter.schoolUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconHouse className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> {identity.schoolShort} chapter info
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{identity.schoolShort} FSL</p>
                  <p className="text-xs text-muted-foreground">Fraternity &amp; Sorority Life</p>
                </Link>
              </Reveal3DItem>
            </Reveal3D>
          </Reveal3D>
        </div>
      </section>
      )}

      {/* ─── FINAL CTA ─── */}
      <section className="container pb-16 sm:pb-20">
        <Reveal className="rounded-3xl bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark text-white p-10 sm:p-16 relative overflow-hidden shadow-2xl shadow-phisig-red/30 ring-1 ring-white/10">
          <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
          {/* Soft top-light radial for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]" aria-hidden />
          <div className="absolute -right-12 -bottom-12 opacity-15">
            <Seal className="w-[420px] h-[420px] text-white" aria-hidden="true" />
          </div>
          <div className="absolute right-[8%] top-[12%] opacity-10 hidden sm:block animate-float">
            <Crest className="h-32 w-32 text-white" aria-hidden="true" />
          </div>
          {/* Soft white orb glints drifting inside the brand panel for life.
              (The panel is already the brand color, so the orbs are light
              highlights rather than a competing hue.) */}
          <FloatingOrbs
            colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.10)"]}
            blur={80}
            className="opacity-80"
          />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              {termLabelLong}
            </span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
              Get on the interest list.
            </h2>
            <p className="mt-3 text-white/95 max-w-md text-base sm:text-lg leading-relaxed">
              Sixty seconds — name, contact, profile. We'll text the second the schedule drops in August.
            </p>
            {/* Equal-width CTA pair — same grid system as the hero pair. */}
            <div className="mt-8 grid w-full max-w-[22rem] grid-cols-1 gap-3 md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
              {/* Primary final CTA — magnetic. Real <Link> inside stays intact. */}
              <Magnetic strength={18} innerStrength={5} className="w-full">
                <Button asChild size="xl" variant="secondary" className="group cta-shine press w-full">
                  <Link href={cfg["hero.cta.href"] || "#register"}>
                    Sign me up
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic strength={10} innerStrength={3} className="w-full">
                <Button asChild size="xl" variant="outline" className="w-full border-white/40 text-white bg-white/5 hover:bg-white/15 hover:text-white press">
                  <Link href={cleanUrl(cfg["contact.instagramUrl"])} target="_blank">
                    <Instagram className="h-4 w-4" aria-hidden="true" /> Follow us
                  </Link>
                </Button>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>

      <PublicFooter />
      <StickyCTA />
      {/* Mobile-only fixed bottom nav. Hidden at md+ where the desktop top
          nav handles primary navigation. Phone + Calendar + Brothers are
          one-thumb away on a phone. */}
      <MobileBottomNav
        rushPhone={cfg["contact.rushPhone"]}
        rushEmail={cfg["contact.rushEmail"]}
        memberLabel={terms.members}
      />
      {/* Spacer so the bottom nav doesn't overlap the footer copyright on
          mobile. The 80px (4rem + safe-area) matches MobileBottomNav height. */}
      <div className="md:hidden h-20" aria-hidden />
      </div>
    </main>
  );
}

// Map config string → icon component
function iconFor(name: string): React.ElementType {
  const map: Record<string, React.ElementType> = {
    Crown, Trophy, HandHeart, Users, Award, Star, Heart, GraduationCap,
    BookOpen, Music, Building2, Flame, ShieldCheck, Calendar, MapPin,
  };
  return map[name] || Crown;
}

// Same lookup, but typed as LucideIcon for the shared <IconChip> foundation
// component (its `icon` prop is LucideIcon, not the looser React.ElementType).
// All entries above are lucide-react icons, so the cast is safe.
function chipIconFor(name: string): LucideIcon {
  return iconFor(name) as LucideIcon;
}

/**
 * Standardized section eyebrow — a small brand-tinted pill with a lucide icon.
 * Replaces the repeated bare `<span class="...text-phisig-red">` headers for a
 * more premium, consistent look. Brand-toned via phisig-red (the chapter color),
 * so it reads correctly for any tenant palette.
 */
/* Text-only eyebrow pill — clean type, tracking, hairline border. Decorative
   glyphs were purged from every badge/eyebrow pill (owner round-9: the
   glyph-in-pill pattern reads as AI slop even with bespoke icons). */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-phisig-red/20 bg-phisig-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">
      {children}
    </span>
  );
}

/**
 * BrandShimmer — a slow, premium animated gradient ring tinted to the CHAPTER
 * brand, wrapped around a primary CTA (or the form panel). It mirrors the
 * platform `.gs-shimmer-border` technique but, because that utility is hardwired
 * to the Greekstack blue→sky→gold palette, we recolor it here to the live
 * per-tenant primary (`hsl(var(--primary))`) so the rush site never shows
 * platform colors.
 *
 * Self-contained + additive: the spin reuses the existing `gs-border-spin`
 * keyframe already defined in app/globals.css (we do NOT redefine it). The ring
 * sits OUTSIDE the child via a padding-box mask, so it never clips the button.
 * Reduced-motion-safe: the global `prefers-reduced-motion` block in globals.css
 * already collapses every `animation` to a ~0ms instant, so the ring renders as
 * a static brand gradient with no spin for vestibular-sensitive users. Purely
 * decorative — the real, focusable element is the child.
 */
function BrandShimmer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // padding-box mask carves the 1.5px ring; the conic gradient is brand-tinted
  // (primary → soft primary → transparent) and shares the global spin keyframe.
  const maskStyle: React.CSSProperties = {
    padding: "1.5px",
    background:
      "conic-gradient(from 0deg, hsl(var(--primary) / 0) 0deg, hsl(var(--primary)) 80deg, hsl(var(--primary) / 0.55) 170deg, hsl(var(--primary) / 0) 300deg)",
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    maskComposite: "exclude",
    animation: "gs-border-spin 6s linear infinite",
  };
  return (
    <span className={cn("relative inline-flex isolate", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
        style={maskStyle}
      />
      {children}
    </span>
  );
}

function ContactPill({
  icon: Icon, label, sub,
}: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="group rounded-xl border border-border bg-card p-3 lift transition-colors hover:border-phisig-red/30">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-phisig-red shrink-0 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * Renders a chapter photo. The "slug" can be either:
 *   1. An Instagram post code (e.g. "DRzyoVciZCh") — proxied through /api/photo
 *   2. A direct image URL (e.g. https://...vercel-storage.com/...) from the admin upload
 * Falls back to a designed cardinal-red Crest tile if the photo can't load.
 */
function PostTile({
  slug, caption, icon: Icon, className, priority,
}: {
  slug: string;
  caption: string;
  icon: React.ElementType;
  className?: string;
  priority?: boolean;
}) {
  // No photo configured (white-labeled / unset slug) → render the designed
  // fallback tile only; never request /api/photo/ with an empty slug (404) nor
  // link to a broken instagram.com/p// URL. New chapters with no IG posts hit this.
  if (!slug || !slug.trim()) {
    return (
      <div className={`group relative rounded-2xl overflow-hidden border border-border lift block aspect-square ${className ?? ""}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark flex items-center justify-center pointer-events-none">
          <Crest className="h-20 w-20 text-white/25" aria-hidden="true" />
        </div>
        <span className="absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
          <Icon className="h-3 w-3" aria-hidden="true" /> {caption}
        </span>
      </div>
    );
  }
  const isUrl = /^https?:\/\//.test(slug);
  const cloud = isCloudinaryUrl(slug);
  // Cloudinary assets get a sized auto-format delivery URL + a Cloudinary
  // responsive srcSet. Everything else keeps the exact prior behavior: a full
  // (Blob/IG-CDN) URL renders as-is with no srcSet; a bare slug goes through the
  // /api/photo proxy with its ?w= responsive set.
  const imgSrc = cloud
    ? imageSrc(slug, { w: 960, crop: "limit" })
    : isUrl
      ? slug
      : `/api/photo/${slug}`;
  const cloudSrcSet = cloud
    ? [480, 960, 1280, 1600]
        .map((w) => `${imageSrc(slug, { w, crop: "limit" })} ${w}w`)
        .join(", ")
    : undefined;
  const linkHref = isUrl ? slug : `https://www.instagram.com/p/${slug}/`;
  return (
    <a
      href={linkHref}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`View ${caption} on Instagram`}
      className={`group relative rounded-2xl overflow-hidden border border-border lift block ${className ?? ""}`}
    >
      {/* Fallback layer — cardinal gradient with chapter crest, visible until the
          image loads. <SmartImage> ALSO renders this exact tile if the src is
          empty or 404s, so a missing photo never shows a broken-image glyph. */}
      <div className="absolute inset-0 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark flex items-center justify-center pointer-events-none">
        <Crest className="h-20 w-20 text-white/25" aria-hidden="true" />
      </div>
      <SmartImage
        src={imgSrc}
        // Responsive srcset — phones get a 480-width WebP, tablets 960, 4K
        // displays 1600. Photo proxy honors ?w= and snaps to ALLOWED_WIDTHS;
        // Cloudinary assets emit an equivalent Cloudinary-sized srcSet. A direct
        // (Blob) URL keeps no srcSet, exactly as before.
        srcSet={cloud ? cloudSrcSet : isUrl ? undefined : `/api/photo/${slug}?w=480 480w, /api/photo/${slug}?w=960 960w, /api/photo/${slug}?w=1280 1280w, /api/photo/${slug}?w=1600 1600w`}
        sizes={priority ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 50vw"}
        alt={`Chapter life — ${caption}`}
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className={`relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${priority ? "animate-ken-burns-in" : ""}`}
        fallbackLabel={caption}
        crestClassName="h-20 w-20"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-20" />
      <span className="absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
        <Icon className="h-3 w-3" aria-hidden="true" /> {caption}
      </span>
    </a>
  );
}
