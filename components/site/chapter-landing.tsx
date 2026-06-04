import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { MobileBottomNav } from "@/components/site/mobile-nav";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal, Crest } from "@/components/brand/wordmark";
import { Scene } from "@/components/brand/scene";
import { InstagramFeed } from "@/components/site/instagram-feed";
import { StickyCTA } from "@/components/site/sticky-cta";
import { Reveal, CountUp } from "@/components/site/reveal";
import { RushCountdown } from "@/components/site/rush-countdown";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight, ShieldCheck, Users, Trophy, Heart,
  GraduationCap, Sparkles, Quote, Star, Calendar,
  MapPin, Award, Zap, Music, BookOpen, HandHeart,
  Instagram, Mail, Phone, Building2, Flame, Crown,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { cleanUrl, cleanMailto, cleanTel, titleCaseAddress } from "@/lib/utils";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { FloatingSymbols } from "@/components/site/floating-symbols";

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
  const summary = `${cfg["stats.brothers"]} brothers · ${cfg["stats.gpa"]} GPA · ${cfg["philanthropy.raisedTotal"]} raised for ${cfg["philanthropy.beneficiaryShort"]}.`;
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

const VALUES_DEFAULT: ValueRow[] = [
  { icon: "Users", title: "Brotherhood", body: "Lifelong friendships built on mutual respect and showing up for each other." },
  { icon: "GraduationCap", title: "Scholarship", body: "Study halls, mentorship, and an alumni network across every field. Chapter GPA above the all-fraternity average." },
  { icon: "Heart", title: "Character", body: "We measure men by what they do — service, integrity, and courage in conviction." },
];

const TIMELINE_DEFAULT: TimelineRow[] = [
  { week: "Week 1", title: "Open events", body: "Cookouts, brotherhood events, low-pressure hangs at the house. Show up — no commitment, no application." },
  { week: "Week 2", title: "Closed events", body: "Invite-only smaller events. Spend more time with individual brothers and start to feel out the fit." },
  { week: "Week 3", title: "Interviews & Bid Day", body: "One-on-ones with the e-board, then bids extended. Welcome ceremony for new members." },
];

// Generic, chapter-agnostic fallbacks. These render ONLY if a chapter hasn't
// supplied its own faq.json / highlights.json / recent.json — so a fresh tenant
// (e.g. Clemson) never sees another chapter's school, philanthropy, or tagline.
// The rush chair fills in the real, chapter-specific copy via /admin/settings.
const FAQ_DEFAULT: FaqRow[] = [
  { q: "Do I need to be a freshman?", a: "Nope. We rush freshmen, sophomores, juniors, and transfers. If you're on campus and looking for a brotherhood, we want to meet you." },
  { q: "Is there a GPA requirement?", a: "We expect a solid academic standing to receive a bid. Our chapter average is well above the minimum — scholarship is one of our core principles." },
  { q: "How much does it cost?", a: "Dues cover house fees, philanthropy, formals, and chapter operations. We'll walk you through every line item before you accept a bid — no surprises." },
  { q: "Is there hazing?", a: "Zero. Our national organization and our chapter take a hard line against hazing. New-member education is built around brotherhood, history, and leadership development. Concerns can be reported anonymously to our chapter advisor or to national HQ." },
  { q: "What's the time commitment?", a: "About 4–6 hours/week of required programming during the semester (chapter meeting, study hall, occasional service). The rest is optional — go as hard or as easy as you want." },
  { q: "Can I rush if I'm already in another organization?", a: "Yes — our brothers are on sports teams, in every college, in honors, and in ROTC. The chapter adds to your campus experience, it doesn't replace it." },
];

const HIGHLIGHTS_DEFAULT: HighlightRow[] = [
  { icon: "HandHeart", label: "Year-round philanthropy" },
  { icon: "Trophy", label: "Signature fundraisers" },
  { icon: "Building2", label: "On-campus chapter house" },
  { icon: "GraduationCap", label: "Above-average chapter GPA" },
  { icon: "Flame", label: "Brotherhood events year-round" },
  { icon: "Star", label: "Active alumni network" },
];

const RECENT_DEFAULT: RecentRow[] = [
  { tag: "Philanthropy", title: "Annual fundraiser for our chosen charity", icon: "HandHeart" },
  { tag: "Brotherhood", title: "Brotherhood events before finals", icon: "Trophy" },
  { tag: "Formals", title: "Chapter formal — third-party vendor, sober transportation", icon: "Award" },
  { tag: "Service", title: "Community service throughout the semester", icon: "Heart" },
];

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

  // Booth mode = single-purpose tablet kiosk. Render only the rush form.
  // No hero, no marketing sections, no Instagram feed, no footer chrome — every
  // pixel below the form is a distraction at a 30-second walk-up on bumpy 4G.
  if (booth) {
    return (
      <main id="main-content" className="min-h-screen bg-phisig-mist">        <PublicNav booth />
        <section className="container py-6 sm:py-10">
          <div className="max-w-2xl mx-auto text-center mb-6 animate-slide-up">
            <div className="mb-4 flex justify-center">
              <SectionEyebrow icon={Sparkles}>{identity.fraternityName} at {identity.schoolShort} · Booth</SectionEyebrow>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
              Add yourself to the Fall&nbsp;&apos;26 rush list.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Three quick fields. We&apos;ll text you when the schedule drops.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <RushForm booth />
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Tablet auto-clears between rushees · {cfg["contact.instagramHandle"] || "@phisig_usc"}
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
    { ...parseStat(cfg["stats.brothers"]), label: cfg["stats.brothers.label"] || "Active brothers", icon: Users, sub: cfg["stats.brothers.sub"] || undefined },
    { ...parseStat(cfg["stats.gpa"]), label: cfg["stats.gpa.label"] || "Chapter GPA", icon: GraduationCap, sub: cfg["stats.gpa.sub"] || "Above the all-fraternity average" },
    { ...parseStat(cfg["stats.years"]), label: cfg["stats.years.label"] || "Years strong", icon: ShieldCheck, sub: cfg["stats.years.sub"] || "Founded 1873" },
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
  const VALUES = parseJsonArray<ValueRow>(cfg["values.json"], VALUES_DEFAULT);
  const TIMELINE = parseJsonArray<TimelineRow>(cfg["timeline.json"], TIMELINE_DEFAULT);
  const FAQ = parseJsonArray<FaqRow>(cfg["faq.json"], FAQ_DEFAULT);
  const HIGHLIGHTS = parseJsonArray<HighlightRow>(cfg["highlights.json"], HIGHLIGHTS_DEFAULT);
  const RECENT = parseJsonArray<RecentRow>(cfg["recent.json"], RECENT_DEFAULT);

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

  return (
    <main id="main-content" className="min-h-screen bg-background">      <PublicNav />

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
        <FloatingSymbols greekLettersGlyphs={cfg["chapter.greekLettersGlyphs"]} />
        <div className="absolute right-[8%] top-[10%] -z-10 hidden md:block animate-float [animation-delay:1s] opacity-[0.22] select-none pointer-events-none filter drop-shadow-[0_20px_50px_hsl(var(--primary)/0.25)]">
          {/* 3D Glassmorphic Shield floating in the hero section */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/3d-shield.png"
            alt=""
            className="h-[360px] w-auto object-contain animate-orbit-slow"
            style={{ animationDuration: '45s' }}
            aria-hidden="true"
          />
        </div>

        <div className="container section-y">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
            <div className="max-w-2xl animate-slide-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-white/95 backdrop-blur px-3 py-1 text-xs font-medium text-phisig-red shadow-sm animate-heartbeat">
                <span className="h-1.5 w-1.5 rounded-full bg-phisig-red animate-pulse" />
                {cfg["hero.eyebrow"]}
              </span>
              <RushCountdown
                startsAt={nextEvent ? nextEvent.startsAt.toISOString() : null}
                endsAt={nextEvent?.endsAt ? nextEvent.endsAt.toISOString() : null}
                eventName={nextEvent ? nextEvent.name : null}
                eventLocation={nextEvent ? nextEvent.location : null}
              />
            </div>
            <h1 className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] [text-wrap:balance]">
              {cfg["hero.h1.lead"]}{" "}<br className="hidden sm:block" />
              {cfg["hero.h1.tail"]}{" "}
              <span className="relative inline-block text-phisig-red">
                {cfg["hero.h1.highlight"]}
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
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild variant="gradient" size="xl" className="group cta-shine press">
                <Link href={cfg["hero.cta.href"] || "#register"}>
                  {cfg["hero.cta.label"] || "Get on the interest list"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="press bg-white/70 backdrop-blur">
                <Link href="#about">About the chapter</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/70 px-3 py-1.5 backdrop-blur">
                <MapPin className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" /> {titleCaseAddress(cfg["contact.address"])}, {titleCaseAddress(cfg["contact.cityState"])}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/70 px-3 py-1.5 backdrop-blur">
                <Zap className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" /> Reply within 24 hours
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/70 px-3 py-1.5 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" /> {identity.greekLetters} chapter
              </span>
              <Link
                href={cleanUrl(cfg["contact.instagramUrl"])}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/25 bg-phisig-red-soft/60 px-3 py-1.5 font-medium text-phisig-red backdrop-blur transition-colors hover:bg-phisig-red-soft"
              >
                <Instagram className="h-3.5 w-3.5" aria-hidden="true" /> {cfg["contact.instagramHandle"]}
              </Link>
            </div>
            </div>

            {/* Hero photo collage — real chapter posts via Instagram embed */}
            <div className="relative animate-slide-up [animation-delay:200ms]">
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
                  caption={cfg["hero.tile2.caption"]}
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
              <div className="absolute -right-4 -top-4 hidden lg:flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-xl shadow-phisig-red/40 ring-4 ring-white/80 z-10 pointer-events-none animate-float">
                <span className="text-center leading-tight">
                  <span className="block text-[9px] uppercase tracking-[0.16em] opacity-80">Since</span>
                  <span className="block text-base font-semibold">1873</span>
                </span>
              </div>
            </div>
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
        <div className="relative container section-y-tight grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 sm:gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="group flex items-center gap-4">
              <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0 shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-105 group-hover:bg-white/20">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight leading-none">
                  <CountUp value={s.num} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </div>
                <div className="mt-1 text-xs opacity-85">{s.label}</div>
                {s.sub && <div className="text-[10px] opacity-65 mt-0.5">{s.sub}</div>}
              </div>
            </Reveal>
          ))}
        </div>
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
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs sm:text-sm text-muted-foreground shadow-sm transition-colors hover:border-phisig-red/30 hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
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
        <Reveal className="max-w-2xl mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-phisig-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Three principles
          </span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
            Brotherhood. Scholarship. Character.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 90} className="h-full">
              <div className="lift h-full rounded-2xl border border-border bg-card p-6 sm:p-7 relative overflow-hidden group transition-colors hover:border-phisig-red/30">
                <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-gradient-to-br from-phisig-red-soft/60 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />
                <IconChip icon={chipIconFor(v.icon)} tone="brand" size="lg" className="relative transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
                <h3 className="relative mt-5 text-xl font-semibold tracking-tight">{v.title}</h3>
                <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
                <Crest className="absolute -bottom-4 -right-4 h-20 w-20 text-phisig-red opacity-[0.08]" aria-hidden="true" />
              </div>
            </Reveal>
          ))}
        </div>
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
          <div className="max-w-xl mx-auto text-center mb-8 animate-slide-up">
            <IconChip icon={Sparkles} tone="brand" size="md" className="mx-auto mb-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-phisig-red">
              Get on the list
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
              Drop your number.
            </h2>
            <p className="mt-3 text-muted-foreground text-base sm:text-lg">
              No spam, no ceremony — about 60 seconds. We'll text the second the
              Fall '26 schedule drops.
            </p>
            <ul className="mt-5 inline-flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Goes straight to the rush chair
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Up to 8 texts per cycle, opt out anytime
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Never sold or shared
              </li>
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">
              18+, or 17 with a parent's permission.{" "}
              <Link href="/privacy" className="text-phisig-red hover:underline">Privacy</Link>{" "}·{" "}
              <Link href="/parents" className="text-phisig-red hover:underline">For parents</Link>.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <RushForm />
          </div>
        </div>
      </section>

      {/* ─── INSTAGRAM FEED — real photos from @phisig_usc ─── */}
      {cfg["show.instagramFeed"] !== "false" && (
      <section className="container section-y">
        <Reveal className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <SectionEyebrow icon={Instagram}>{cfg["contact.instagramHandle"] || "@phisig_usc"}</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">A year in the life.</h2>
          </div>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            Philanthropy events, brotherhood before finals, the chapter formal
            (FIPG-compliant, third-party vendor, sober transportation), and dry
            tailgates on game day. The {identity.greekLetters} chapter shows up — all year.{" "}
            <span className="text-phisig-red font-medium">{identity.tagline}</span>
          </p>
        </Reveal>
        <InstagramFeed count={9} />

        {/* Recent activity strip */}
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {RECENT.map((r, i) => (
            <Reveal key={r.title} delay={i * 70} className="h-full">
              <div className="h-full rounded-2xl border border-border bg-card p-5 lift transition-colors hover:border-phisig-red/30">
                <div className="flex items-center gap-2.5">
                  <IconChip icon={chipIconFor(r.icon)} tone="brand" size="sm" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">{r.tag}</span>
                </div>
                <p className="mt-3 text-sm font-medium leading-snug">{r.title}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="https://www.instagram.com/phisig_usc/"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" /> Follow @phisig_usc for the latest
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </section>
      )}

      {/* ─── HOW RUSH WORKS ─── */}
      {cfg["show.timeline"] !== "false" && (
      <section className="border-y border-border bg-secondary/40">
        <div className="container section-y">
          <Reveal className="max-w-2xl mb-10">
            <SectionEyebrow icon={Calendar}>How rush works</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
              Three weeks. Zero pressure.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
              We're not interested in hazing or hoops. We're interested in finding the right men.
            </p>
          </Reveal>
          <ol className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {TIMELINE.map((t, i) => (
              <Reveal key={t.week} as="li" delay={i * 90} className="relative rounded-2xl border border-border bg-card p-6 lift transition-colors hover:border-phisig-red/30">
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
                {i < TIMELINE.length - 1 && (
                  <span className="hidden md:block absolute top-1/2 -right-2.5 h-0.5 w-5 bg-phisig-red/30" aria-hidden />
                )}
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
      )}

      {/* ─── SCHEDULE ─── */}
      <section id="schedule" className="container section-y scroll-mt-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <SectionEyebrow icon={Calendar}>Fall &apos;26 calendar</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Upcoming events
            </h2>
          </div>
          <div className="space-y-4 max-w-xl">
            <p className="text-muted-foreground">
              Full Fall &apos;26 rush schedule drops in August. Get on the interest list above —
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
        </div>
        <div className="max-w-3xl">
          <ScheduleList />
        </div>
      </section>

      {/* ─── TESTIMONIAL + ABOUT (combined for density) ─── */}
      {cfg["show.testimonial"] !== "false" && (
      <section className="border-t border-border bg-gradient-to-b from-phisig-red-soft/40 via-background to-background">
        <div className="container section-y">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-slide-up">
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
            </div>
            <Scene theme="tradition" size="tall" caption={`Founded ${identity.foundingYear}. ${identity.greekLetters} at ${identity.schoolShort} since ${identity.charterYear}.`} />
          </div>
        </div>
      </section>
      )}

      {/* ─── BROTHER SPOTLIGHT ─── */}
      {cfg["show.spotlight"] !== "false" && (
      <section className="container section-y">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div className="order-2 lg:order-1">
            <SectionEyebrow icon={Star}>Brother of the Month</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Real men. Real recognition.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-xl">
              Every month the chapter recognizes a brother who's gone above and beyond — in
              the classroom, in service, on the field, in leadership.{" "}
              {cfg["spotlight.bio"]}
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Philanthropy Chair (freshman)",
                `Led Polar Plunge — ${cfg["philanthropy.raisedAmount"]} raised for ${cfg["philanthropy.beneficiaryShort"]}`,
                "Dry fundraiser dinner for Leukemia & Lymphoma Society",
                "Embodies the cardinal principle of Character",
              ].map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-phisig-red shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-phisig-red font-medium">
              #DamnProud
            </p>
          </div>
          <div className="order-1 lg:order-2 relative">
            <a
              href={/^https?:\/\//.test(cfg["spotlight.slug"]) ? cfg["spotlight.slug"] : `https://www.instagram.com/p/${cfg["spotlight.slug"]}/`}
              target="_blank"
              rel="noreferrer noopener"
              className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-secondary lift shadow-xl shadow-phisig-red/10 block"
            >
              <img
                src={/^https?:\/\//.test(cfg["spotlight.slug"]) ? cfg["spotlight.slug"] : `/api/photo/${cfg["spotlight.slug"]}`}
                alt={`Brother of the Month — ${cfg["spotlight.name"]}`}
                width={640}
                height={800}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                  <Star className="h-3 w-3" aria-hidden="true" />{cfg["spotlight.month"] ? <>{cfg["spotlight.month"]} · </> : null}Brother of the Month
                </span>
                <p className="mt-2 text-white text-xl font-semibold tracking-tight">
                  {cfg["spotlight.name"]}
                </p>
                <p className="text-white/95 text-xs">
                  {cfg["spotlight.role"]}
                </p>
              </div>
            </a>
            <div className="absolute -top-3 -left-3 hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/30 rotate-[-6deg] pointer-events-none">
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
          <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
            <div>
              <SectionEyebrow icon={Crown}>Chapter leadership</SectionEyebrow>
              <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
                Meet the e-board.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xl leading-relaxed">
              The {identity.greekLetters} chapter elects its leadership annually. These are the brothers
              running the show — happy to talk to any rush who wants to learn more.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 stagger">
            {eboard.map((m) => (
              <div
                key={m.name}
                className="group relative rounded-2xl border border-border bg-card p-5 lift overflow-hidden transition-colors hover:border-phisig-red/30"
              >
                {m.headshotUrl ? (
                  <img
                    src={/^https?:\/\//.test(m.headshotUrl) ? m.headshotUrl : `/api/photo/${m.headshotUrl}`}
                    alt={`${m.name}, ${m.role}`}
                    width={56}
                    height={56}
                    loading="lazy"
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-phisig-red/20 ring-offset-2 ring-offset-card shadow-md shadow-phisig-red/20"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white flex items-center justify-center text-base font-semibold shadow-md shadow-phisig-red/20">
                    {m.name.split(" ").map((s) => s[0]).join("")}
                  </div>
                )}
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-phisig-red font-semibold">
                    {m.role}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{m.name}</p>
                </div>
                <Crest className="absolute -bottom-3 -right-3 h-16 w-16 text-phisig-red opacity-10" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ─── ABOUT THE CHAPTER ─── */}
      <section id="about" className="container section-y scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionEyebrow icon={ShieldCheck}>About the chapter</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Founded in 1873.<br/> Built for what's next.
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
                "Strong alumni network across the Southeast",
                "Brotherhood that lasts well beyond graduation",
              ].map((p) => (
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/coat-of-arms-vintage.jpg"
                alt="Original Phi Sigma Kappa coat of arms — engraved 1873"
                width={84}
                height={104}
                loading="lazy"
                className="h-[84px] w-auto rounded-md ring-1 ring-phisig-red/10 shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-phisig-red font-semibold">Heritage</p>
                <p className="mt-1 text-sm font-semibold leading-snug">
                  One of the oldest Greek letter societies in the country.
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {identity.fraternityName} was founded at {identity.foundingLocation} in {identity.foundingYear}.
                  {" "}{identity.greekLetters} has carried the chapter forward at {identity.schoolName} since {identity.charterYear}.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <ContactPill icon={MapPin} label={titleCaseAddress(cfg["contact.address"])} sub={titleCaseAddress(cfg["contact.cityState"])} />
              <ContactPill icon={Mail} label={cfg["contact.rushEmail"]} sub="Rush questions" />
              <ContactPill icon={Instagram} label={cfg["contact.instagramHandle"]} sub="Daily chapter life" />
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
          </div>

          <div className="relative">
            <a
              href={/^https?:\/\//.test(cfg["about.slug"]) ? cfg["about.slug"] : `https://www.instagram.com/p/${cfg["about.slug"]}/`}
              target="_blank"
              rel="noreferrer noopener"
              className="aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-secondary tilt shadow-xl block relative"
            >
              <img
                src={/^https?:\/\//.test(cfg["about.slug"]) ? cfg["about.slug"] : `/api/photo/${cfg["about.slug"]}`}
                alt={cfg["about.caption"]}
                width={640}
                height={800}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: cfg["about.objectPosition"] || "50% 50%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                  <Award className="h-3 w-3" aria-hidden="true" /> {cfg["about.caption"] || "Chapter formal"}
                </span>
                <p className="mt-3 text-xl font-semibold tracking-tight leading-snug">
                  Brotherhood you can count on — every weekend, every milestone, every year.
                </p>
                <p className="mt-1 text-xs text-white/95">#DamnProud · {cfg["contact.instagramHandle"] || "@phisig_usc"}</p>
              </div>
            </a>
            <div className="absolute -bottom-5 -left-5 hidden sm:block w-48 rounded-2xl border border-border bg-white shadow-xl p-4 animate-float z-30">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Cardinal Principles
              </p>
              <p className="mt-1.5 text-sm font-semibold tracking-tight leading-snug">
                Brotherhood<br/>Scholarship<br/>Character
              </p>
            </div>
            <div className="absolute -top-5 -right-5 hidden sm:flex h-20 w-20 items-center justify-center rounded-full bg-phisig-red text-white shadow-xl shadow-phisig-red/30 animate-pulse-ring z-30">
              <span className="text-center leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.16em] opacity-80">Since</span>
                <span className="block text-lg font-semibold">1873</span>
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
            <div>
              <SectionEyebrow icon={Sparkles}>FAQ</SectionEyebrow>
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
            </div>
            <ul className="space-y-3">
              {FAQ.map((item, i) => (
                <li
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
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      )}

      {/* ─── WHERE TO FIND US ─── */}
      {cfg["show.whereWeLive"] !== "false" && (
      <section className="container section-y">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <a
            href="https://www.instagram.com/p/DRxIVRXkYCn/"
            target="_blank"
            rel="noreferrer noopener"
            className="relative aspect-[5/4] rounded-2xl overflow-hidden border border-border bg-secondary lift order-2 lg:order-1 block"
          >
            <img
              src="/api/photo/DRxIVRXkYCn"
              alt="Phi Sigma Kappa brothers — No Shave November fundraiser raised $1,600 for the Movember Foundation, supporting men's health and mental health awareness"
              loading="lazy"
              width={800}
              height={640}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 80%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                <HandHeart className="h-3 w-3" aria-hidden="true" /> Movember · $1,600 raised
              </span>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                Grow a beard. Make a difference. — men&apos;s mental health.
              </p>
            </div>
          </a>
          <div className="order-1 lg:order-2">
            <SectionEyebrow icon={MapPin}>Where we live</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              The house at {titleCaseAddress(cfg["contact.address"])}.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The {identity.fraternityName} chapter house sits at <span className="text-foreground font-medium">{titleCaseAddress(cfg["contact.address"])}</span>, close
              to campus. It&apos;s where the cookouts,
              chapter meetings, and Bid Nights happen — and where most rushes meet the chapter
              for the first time.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <Link
                href={cleanUrl(cfg["contact.mapsUrl"])}
                target="_blank"
                rel="noreferrer noopener"
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40 min-h-[60px]"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <MapPin className="h-3 w-3" aria-hidden="true" /> Address
                </div>
                <p className="mt-1.5 text-sm font-semibold">{titleCaseAddress(cfg["contact.address"])}</p>
                <p className="text-xs text-muted-foreground">{titleCaseAddress(cfg["contact.cityState"])}</p>
              </Link>
              <Link
                href={cleanUrl(cfg["contact.instagramUrl"])}
                target="_blank"
                rel="noreferrer noopener"
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40 min-h-[60px]"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <Instagram className="h-3 w-3" aria-hidden="true" /> Daily updates
                </div>
                <p className="mt-1.5 text-sm font-semibold">{cfg["contact.instagramHandle"]}</p>
                <p className="text-xs text-muted-foreground">Follow for chapter life</p>
              </Link>
              <Link
                href={cleanMailto(cfg["contact.rushEmail"])}
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40 min-h-[60px]"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <Mail className="h-3 w-3" aria-hidden="true" /> Rush questions
                </div>
                <p className="mt-1.5 text-sm font-semibold">{cfg["contact.rushEmail"]}</p>
                <p className="text-xs text-muted-foreground">We reply within 24 hours</p>
              </Link>
              <Link
                href="https://sc.edu/about/offices_and_divisions/fraternity_and_sorority_life/chapters/index.php"
                target="_blank"
                rel="noreferrer noopener"
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40 min-h-[60px]"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <Building2 className="h-3 w-3" aria-hidden="true" /> USC chapter info
                </div>
                <p className="mt-1.5 text-sm font-semibold">UofSC FSL</p>
                <p className="text-xs text-muted-foreground">Fraternity & Sorority Life</p>
              </Link>
            </div>
          </div>
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
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Fall Rush 2026
            </span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
              Get on the interest list.
            </h2>
            <p className="mt-3 text-white/95 max-w-md text-base sm:text-lg leading-relaxed">
              Sixty seconds — name, contact, profile. We'll text the second the schedule drops in August.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="xl" variant="secondary" className="group cta-shine press">
                <Link href={cfg["hero.cta.href"] || "#register"}>
                  Sign me up
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="border-white/40 text-white bg-white/5 hover:bg-white/15 hover:text-white press">
                <Link href={cleanUrl(cfg["contact.instagramUrl"])} target="_blank">
                  <Instagram className="h-4 w-4" aria-hidden="true" /> Follow us
                </Link>
              </Button>
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
      />
      {/* Spacer so the bottom nav doesn't overlap the footer copyright on
          mobile. The 80px (4rem + safe-area) matches MobileBottomNav height. */}
      <div className="md:hidden h-20" aria-hidden />
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
function SectionEyebrow({
  icon: Icon, children,
}: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-phisig-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">
      <Icon className="h-3 w-3" aria-hidden="true" /> {children}
    </span>
  );
}

function ContactPill({
  icon: Icon, label, sub,
}: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 lift">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-phisig-red shrink-0" aria-hidden="true" />
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
  const isUrl = /^https?:\/\//.test(slug);
  const imgSrc = isUrl ? slug : `/api/photo/${slug}`;
  const linkHref = isUrl ? slug : `https://www.instagram.com/p/${slug}/`;
  return (
    <a
      href={linkHref}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`View ${caption} on Instagram`}
      className={`group relative rounded-2xl overflow-hidden border border-border lift block ${className ?? ""}`}
    >
      {/* Fallback layer — cardinal gradient with chapter crest, visible until image loads */}
      <div className="absolute inset-0 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark flex items-center justify-center pointer-events-none">
        <Crest className="h-20 w-20 text-white/25" aria-hidden="true" />
      </div>
      <img
        src={imgSrc}
        // Responsive srcset — phones get a 480-width WebP, tablets 960, 4K
        // displays 1600. Photo proxy honors ?w= and snaps to ALLOWED_WIDTHS.
        // Keeping the URL stable means the cache key matches across requests.
        srcSet={isUrl ? undefined : `/api/photo/${slug}?w=480 480w, /api/photo/${slug}?w=960 960w, /api/photo/${slug}?w=1280 1280w, /api/photo/${slug}?w=1600 1600w`}
        sizes={priority ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 50vw"}
        alt={`Chapter life — ${caption}`}
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className={`relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${priority ? "animate-ken-burns-in" : ""}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-20" />
      <span className="absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
        <Icon className="h-3 w-3" aria-hidden="true" /> {caption}
      </span>
    </a>
  );
}
