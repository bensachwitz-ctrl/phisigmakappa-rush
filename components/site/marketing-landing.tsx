"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { GreekstackLogo } from "@/components/brand/greekstack-logo";
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
  Marquee,
  AnimatedCounter,
} from "@/components/site/anim";
import {
  Sparkles,
  Users,
  Wallet,
  CalendarCheck,
  ShieldCheck,
  Flag,
  Palette,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  Rocket,
  Globe,
  LayoutDashboard,
  TrendingUp,
  Lock,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────
   GREEKSTACK — apex marketing landing (no-subdomain).
   Platform brand: deep ink + indigo→violet→cyan gradient accents. This sells
   the SaaS itself; it never renders a specific chapter's data.

   Elevated into a cinematic, "alive" scroll experience built on the shared
   foundation (<AnimatedBackground>, <IconChip>, <Button>, GreekstackLogo,
   gs-gradient-text / gs-sheen / cta-shine) PLUS a set of framer-motion
   animation primitives in components/site/anim/* — typewriter headline,
   cursor-tracking 3D tilt, magnetic CTAs, scroll parallax, staggered 3D
   reveals, drifting gradient orbs, a Greek-glyph marquee, a scroll-progress
   bar, and in-view counters.

   EVERY motion layer degrades to a static/instant render under
   prefers-reduced-motion, and all decorative layers are aria-hidden +
   pointer-events-none. Animation is transform/opacity only and in-view-gated.
   Light-surfaced for WCAG (the app is color-scheme: light).
──────────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#proof", label: "Why Greekstack" },
];

const FEATURES: { icon: LucideIcon; title: string; desc: string; span?: boolean }[] = [
  {
    icon: Users,
    title: "Recruitment pipeline",
    desc: "QR check-in for PNMs, a Kanban rush funnel, anonymous brother voting, and double-opt-in SMS that texts rushees the schedule the moment events go live.",
    span: true,
  },
  {
    icon: Wallet,
    title: "Automated dues",
    desc: "Stripe-powered dues with treasurer payouts, auto-reconciled ledgers, reminders, and payment plans — collected without the group-chat nagging.",
  },
  {
    icon: CalendarCheck,
    title: "Events & calendar",
    desc: "Meetings, socials, and service hours with RSVP, roster check-in, and one-click Google Calendar sync.",
  },
  {
    icon: ShieldCheck,
    title: "Officer RBAC",
    desc: "Granular role-based access for President, Treasurer, Recruitment, and Risk — everyone sees exactly what they should, nothing more.",
  },
  {
    icon: Flag,
    title: "Anti-hazing & incident reporting",
    desc: "A zero-tolerance, anonymous incident intake with an audit log and mandatory officer acknowledgments — compliance you can actually prove.",
  },
  {
    icon: Palette,
    title: "White-label branding",
    desc: "Your letters, colors, crest, and custom subdomain. The whole platform re-skins to your chapter in seconds — no rebuild, no developer.",
  },
  {
    icon: HeartHandshake,
    title: "Alumni & donations",
    desc: "An alumni directory, gated onboarding, and Stripe donation flows that turn graduated brothers into a recurring giving base.",
    span: true,
  },
];

const STEPS: { icon: LucideIcon; step: string; title: string; desc: string }[] = [
  {
    icon: Rocket,
    step: "01",
    title: "Sign up",
    desc: "Create your account and claim a chapter subdomain. No credit card, no install — you're in within a minute.",
  },
  {
    icon: Palette,
    step: "02",
    title: "Brand it",
    desc: "Drop in your letters, colors, and crest. Every page, email, and portal instantly re-skins to your chapter.",
  },
  {
    icon: Globe,
    step: "03",
    title: "Go live",
    desc: "Publish your fully-branded recruitment + management site and start collecting PNMs and dues the same day.",
  },
];

const STATS: { value: number; suffix?: string; prefix?: string; decimals?: number; label: string }[] = [
  { value: 60, suffix: "s", label: "From sign-up to a live, branded site" },
  { value: 100, suffix: "%", label: "White-label — your brand, not ours" },
  { value: 12, suffix: "+", label: "Operations modules in every plan" },
  { value: 0, prefix: "$", label: "To get started — no setup fee" },
];

/* The value props the hero headline types through before settling on the
   brand promise. Kept short + punchy; the SSR markup shows the settled line. */
const HERO_PHRASES = [
  "Run rush.",
  "Collect dues, automatically.",
  "Manage your whole roster.",
  "Stay TCPA-compliant.",
];
const HERO_SETTLE = "Run your whole chapter.";

/* Greek glyphs for the "trusted by chapters" marquee — no real logos exist, so
   we render the alphabet as a premium gradient strip. */
const GREEK_GLYPHS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("");

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500/20">
      <ScrollProgressBar />
      <SiteNav />
      <main id="main">
        <Hero />
        <GlyphMarquee />
        <TrustBar />
        <Features />
        <HowItWorks />
        <Proof />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ───────────────────────────── Nav ───────────────────────────── */

function SiteNav() {
  // Condense the header (tighter height + stronger blur/shadow) after the user
  // scrolls past the hero fold. Passive listener; no layout thrash.
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-300 " +
        (scrolled
          ? "border-border/70 bg-background/85 shadow-[0_1px_20px_-12px_rgba(99,102,241,0.5)]"
          : "border-transparent bg-background/60")
      }
    >
      <div
        className={
          "container flex items-center justify-between transition-all duration-300 " +
          (scrolled ? "h-14" : "h-16")
        }
      >
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Greekstack home">
          <span className="transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
            <GreekstackLogo className="h-8 w-8" />
          </span>
          <span className="text-lg font-bold tracking-tight gs-gradient-text">Greekstack</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
              {/* Animated underline that wipes in from the left on hover/focus. */}
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/admin/login">Sign in</Link>
          </Button>
          <Magnetic strength={12} innerStrength={4} radius={70}>
            <Button asChild variant="platform" size="sm" className="gs-sheen">
              <Link href="/onboard">
                Create your chapter site
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Magnetic>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <AnimatedBackground variant="aurora-grid" tone="platform">
      {/* Extra drifting orb layer + a parallaxing faint grid for real depth. */}
      <FloatingOrbs />
      <Parallax
        aria-hidden="true"
        translateY={70}
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_at_50%_30%,black_20%,transparent_70%)]"
      >
        <span />
      </Parallax>

      <section className="container relative z-10 pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-slide-up [animation-delay:40ms]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 animate-heartbeat" />
              The white-label Greek-life platform
            </span>
          </div>

          {/* H1 keeps the full brand promise in the SSR markup (LCP target),
              with a typewriter line layered on top that cycles the value props
              then settles. The static line below the gradient phrase carries
              the meaning even if JS never runs. */}
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.06] tracking-tight animate-slide-up [animation-delay:120ms] sm:text-6xl">
            <span className="block gs-gradient-text">
              <TypewriterCycle
                phrases={HERO_PHRASES}
                settleText={HERO_SETTLE}
                ssrText={HERO_SETTLE}
                caretClassName="bg-violet-500"
              />
            </span>
            <span className="mt-2 block text-foreground">
              One branded site for every part of it.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground animate-slide-up [animation-delay:200ms] sm:text-lg">
            Greekstack runs recruitment pipelines, automated dues, events, officer access, and
            anti-hazing reporting on one multi-tenant platform — re-skinned to your letters and
            colors, live the same day.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 animate-slide-up [animation-delay:280ms] sm:flex-row">
            <Magnetic className="w-full sm:w-auto">
              <Button asChild variant="platform" size="xl" className="gs-sheen cta-shine w-full sm:w-auto">
                <Link href="/onboard">
                  Launch your chapter — free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
              <Link href="#how">See how it works</Link>
            </Button>
          </div>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground animate-slide-up [animation-delay:360ms]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" /> No credit card to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" /> Live in 60 seconds
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" /> Cancel anytime
            </span>
          </p>
        </div>

        {/* Product mockup floats up, then tracks the cursor in 3D. */}
        <Reveal delay={120} className="mx-auto mt-14 max-w-5xl sm:mt-16">
          <Parallax translateY={36} className="[perspective:1200px]">
            <Tilt3DCard max={7} glareColor="rgba(99,102,241,0.30)" className="rounded-2xl">
              <ProductPreview />
            </Tilt3DCard>
          </Parallax>
        </Reveal>

        {/* Bouncing scroll cue. */}
        <div className="mt-12 flex justify-center animate-slide-up [animation-delay:480ms]">
          <Link
            href="#features"
            aria-label="Scroll to features"
            className="group inline-flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-indigo-600"
          >
            <span className="uppercase tracking-[0.18em]">Scroll</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </Link>
        </div>
      </section>
    </AnimatedBackground>
  );
}

/* A generic, platform-branded product preview. Deliberately uses placeholder
   names and the Greekstack palette — it never shows a real chapter. */
function ProductPreview() {
  const nav = [
    { icon: LayoutDashboard, label: "Overview", active: true },
    { icon: Users, label: "Recruitment" },
    { icon: Wallet, label: "Dues & billing" },
    { icon: CalendarCheck, label: "Events" },
    { icon: ShieldCheck, label: "Risk & safety" },
  ];
  const tiles = [
    { label: "Active rushees", value: "62", tone: "text-foreground" },
    { label: "Bids extended", value: "28", tone: "text-foreground" },
    { label: "Dues collected", value: "$18.4k", tone: "text-emerald-600" },
    { label: "Members", value: "147", tone: "text-foreground" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-2 shadow-2xl shadow-indigo-500/10 backdrop-blur-sm sm:p-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Browser chrome */}
        <div className="flex h-10 items-center justify-between border-b border-border bg-secondary/60 px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-border" />
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            yourchapter.greeklifesystems.vercel.app
          </span>
          <span className="w-12" aria-hidden="true" />
        </div>

        {/* App body */}
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-[210px_1fr]">
          {/* Sidebar */}
          <div className="hidden flex-col gap-1 border-r border-border bg-secondary/30 p-4 sm:flex">
            <span className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Chapter HQ
            </span>
            {nav.map((n) => (
              <span
                key={n.label}
                className={
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium " +
                  (n.active
                    ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-indigo-700 ring-1 ring-indigo-500/20"
                    : "text-muted-foreground")
                }
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </span>
            ))}
          </div>

          {/* Main panel */}
          <div className="space-y-5 p-5 text-left sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Fall recruitment</h3>
                <p className="text-xs text-muted-foreground">Live pipeline &amp; chapter health</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-heartbeat" />
                Active cycle
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-xl border border-border bg-secondary/30 p-3.5">
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t.label}
                  </span>
                  <span className={"mt-1 block text-2xl font-bold " + t.tone}>{t.value}</span>
                </div>
              ))}
            </div>

            {/* Funnel bar */}
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="mb-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Pipeline conversion</span>
                <span>62 of 184 PNMs</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500"
                  style={{ width: "62%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Greek-glyph marquee strip ───────────────────── */

function GlyphMarquee() {
  return (
    <section
      aria-label="Built for fraternity and sorority chapters everywhere"
      className="border-y border-border bg-card/40 py-7"
    >
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Built for chapters everywhere
      </p>
      <Marquee
        duration={38}
        gapClassName="gap-10 sm:gap-14"
        items={GREEK_GLYPHS.map((g) => (
          <span
            key={g}
            className="select-none text-3xl font-bold text-transparent sm:text-4xl"
            style={{
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              backgroundImage: "linear-gradient(90deg,#6366f1,#a855f7,#22d3ee)",
              opacity: 0.55,
            }}
          >
            {g}
          </span>
        ))}
      />
    </section>
  );
}

/* ─────────────────────────── Trust bar ─────────────────────────── */

function TrustBar() {
  const items = [
    { icon: Globe, label: "Custom subdomain per chapter" },
    { icon: Lock, label: "Isolated, secure tenant data" },
    { icon: Wallet, label: "Stripe dues & payouts built in" },
    { icon: ShieldCheck, label: "Anti-hazing audit trail" },
  ];
  return (
    <section className="border-b border-border bg-secondary/30" aria-label="Highlights">
      <div className="container">
        <Reveal3D
          stagger={0.1}
          className="grid grid-cols-2 gap-x-6 gap-y-5 py-8 text-center md:grid-cols-4"
        >
          {items.map((b) => (
            <Reveal3DItem key={b.label} className="flex flex-col items-center gap-2">
              <span className="transition-transform duration-300 hover:scale-110">
                <IconChip icon={b.icon} tone="platform" size="sm" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">{b.label}</span>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </div>
    </section>
  );
}

/* ──────────────────────────── Features ──────────────────────────── */

function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
      {/* Faint masked grid band for depth behind the feature cards. Decorative
          only, fades at the edges so it never competes with the content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      {/* Soft top gradient divider */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Everything a chapter runs on
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            One platform. Every part of <span className="gs-gradient-text">chapter operations</span>.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Recruitment to alumni giving — the tools your officers actually need, in a single
            branded system instead of a dozen spreadsheets and group chats.
          </p>
        </Reveal>

        {/* Bento grid: each card is a cursor-tracking 3D tilt card, revealed in a
            staggered 3D sequence as the grid scrolls into view. */}
        <Reveal3D
          stagger={0.08}
          className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <Reveal3DItem
              key={f.title}
              className={f.span ? "sm:col-span-2 lg:col-span-1" : ""}
            >
              <Tilt3DCard max={8} className="h-full rounded-2xl">
                <FeatureCard {...f} />
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10">
      {/* Decorative corner accent — soft indigo→cyan glow that brightens on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/15 to-cyan-400/10 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />
      <IconChip icon={icon} tone="platform" size="md" className="relative transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
      <h3 className="relative mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

/* ────────────────────────── How it works ────────────────────────── */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-border bg-secondary/30 py-20 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Live in three steps
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            From zero to a branded chapter site
          </h2>
          <p className="mt-4 text-muted-foreground">
            No developers, no design agency, no months-long build. Just three steps.
          </p>
        </Reveal>

        {/* The "instant, branded site" promise, made visual: as this scrolls
            into view a chapter name + colors type in and a live preview card
            re-skins to match in real time. */}
        <Reveal delay={80} className="mx-auto mt-14 max-w-5xl">
          <BrandItDemo />
        </Reveal>

        <div className="relative mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {/* connector line on desktop — a soft gradient rail behind the steps
              with a slow highlight travelling along it so it feels alive.
              Decorative: aria-hidden + pointer-events-none. Scoped keyframe so
              we don't depend on / touch global CSS. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-[3.25rem] hidden h-px overflow-hidden bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent md:block"
          >
            <span
              className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-violet-500/80 to-transparent motion-reduce:hidden"
              style={{
                animation: "gs-rail 3.6s ease-in-out infinite",
              }}
            />
            <style>{`@keyframes gs-rail { 0% { transform: translateX(0); } 100% { transform: translateX(450%); } }`}</style>
          </div>
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 110}>
              <div className="group relative h-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10">
                <div className="mx-auto flex justify-center">
                  <IconChip icon={s.icon} tone="platform" size="lg" className="transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
                </div>
                <span className="mt-4 block text-xs font-bold tracking-[0.2em] text-indigo-500">
                  STEP {s.step}
                </span>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-12 flex justify-center">
          <Magnetic>
            <Button asChild variant="platform" size="lg" className="gs-sheen cta-shine">
              <Link href="/onboard">
                Create your chapter site
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}

/* Interactive "brand it" demo. When it enters view it cycles a few example
   chapter identities — the wordmark types in and a theme swatch + live preview
   card re-skin to that chapter's color. Reduced-motion users see a single
   static, fully-branded example (the first identity). Decorative dashboard
   below the typewriter is a faux preview, never real data. */
const DEMO_CHAPTERS = [
  { letters: "Beta Theta Pi", short: "ΒΘΠ", color: "#7c3aed", colorName: "Royal violet" },
  { letters: "Sigma Chi", short: "ΣΧ", color: "#2563eb", colorName: "Azure blue" },
  { letters: "Kappa Alpha", short: "ΚΑ", color: "#dc2626", colorName: "Crimson" },
  { letters: "Chi Omega", short: "ΧΩ", color: "#db2777", colorName: "Cardinal rose" },
];

function BrandItDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const [reduce, setReduce] = React.useState(false);

  // Respect reduced motion (pin to the first identity, no cycling).
  React.useEffect(() => {
    setReduce(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Start cycling only once in view.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    if (!active || reduce) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % DEMO_CHAPTERS.length), 3200);
    return () => clearInterval(id);
  }, [active, reduce]);

  const chapter = DEMO_CHAPTERS[idx];

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 md:grid-cols-[1fr_1.1fr] md:items-center"
    >
      {/* Left: the "fill in your chapter" inputs typing themselves. */}
      <div className="space-y-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
          <Palette className="h-3.5 w-3.5" />
          Watch it brand itself
        </span>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Chapter name
          </label>
          <div className="field-glow flex h-12 items-center rounded-xl border border-border bg-secondary/30 px-4 text-lg font-semibold">
            {reduce ? (
              DEMO_CHAPTERS[0].letters
            ) : (
              <TypewriterCycle
                key={idx /* retype on each identity change */}
                phrases={[chapter.letters]}
                settleText={chapter.letters}
                ssrText={DEMO_CHAPTERS[0].letters}
                typeSpeed={70}
                className="gs-gradient-text"
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Brand color
          </label>
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 rounded-xl ring-1 ring-black/10 transition-colors duration-500"
              style={{ backgroundColor: reduce ? DEMO_CHAPTERS[0].color : chapter.color }}
            />
            <div className="flex h-12 flex-1 items-center rounded-xl border border-border bg-secondary/30 px-4 font-mono text-sm transition-colors duration-500">
              <span
                className="font-semibold transition-colors duration-500"
                style={{ color: reduce ? DEMO_CHAPTERS[0].color : chapter.color }}
              >
                {reduce ? DEMO_CHAPTERS[0].color : chapter.color}
              </span>
              <span className="ml-2 text-muted-foreground">
                {reduce ? DEMO_CHAPTERS[0].colorName : chapter.colorName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: a live preview card that re-skins to the chapter color. */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
        <div
          className="flex items-center gap-3 px-5 py-4 transition-colors duration-500"
          style={{
            background: `linear-gradient(120deg, ${
              reduce ? DEMO_CHAPTERS[0].color : chapter.color
            }, ${reduce ? DEMO_CHAPTERS[0].color : chapter.color}cc)`,
          }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-bold text-white ring-1 ring-white/30">
            {reduce ? DEMO_CHAPTERS[0].short : chapter.short}
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-bold text-white">
              {reduce ? DEMO_CHAPTERS[0].letters : chapter.letters}
            </span>
            <span className="block text-[11px] text-white/80">Recruitment is open</span>
          </div>
          <span className="ml-auto rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/30">
            Live
          </span>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex gap-3">
            {["Rush", "Dues", "Events"].map((t) => (
              <span
                key={t}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-500"
                style={{
                  color: reduce ? DEMO_CHAPTERS[0].color : chapter.color,
                  borderColor: `${reduce ? DEMO_CHAPTERS[0].color : chapter.color}33`,
                  backgroundColor: `${reduce ? DEMO_CHAPTERS[0].color : chapter.color}0d`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: "68%",
                  backgroundColor: reduce ? DEMO_CHAPTERS[0].color : chapter.color,
                }}
              />
            </div>
            <div className="h-2.5 w-3/4 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full opacity-60 transition-all duration-700"
                style={{
                  width: "52%",
                  backgroundColor: reduce ? DEMO_CHAPTERS[0].color : chapter.color,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { k: "PNMs", v: "184" },
              { k: "Bids", v: "28" },
              { k: "Dues", v: "92%" },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-border bg-secondary/30 p-2.5 text-center">
                <span className="block text-sm font-bold text-foreground">{s.v}</span>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {s.k}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Proof ───────────────────────────── */

function Proof() {
  return (
    <section id="proof" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
      {/* Faint masked grid band behind the stat tiles for quiet depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Why chapters choose Greekstack
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built to make officers&apos; lives easier
          </h2>
        </Reveal>

        <Reveal3D
          stagger={0.09}
          className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-6 lg:grid-cols-4"
        >
          {STATS.map((s) => (
            <Reveal3DItem key={s.label}>
              <div className="group h-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10">
                <span className="block text-4xl font-bold tracking-tight gs-gradient-text sm:text-5xl">
                  <AnimatedCounter
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals}
                  />
                </span>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.label}</p>
              </div>
            </Reveal3DItem>
          ))}
        </Reveal3D>

        <Reveal delay={120} className="mx-auto mt-12 max-w-3xl">
          <figure className="rounded-2xl border border-border bg-gradient-to-br from-secondary/40 to-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex justify-center">
              <IconChip icon={TrendingUp} tone="platform" size="md" />
            </div>
            <blockquote className="text-pretty text-lg font-medium leading-relaxed sm:text-xl">
              &ldquo;Recruitment, dues, and events used to live in five different apps. Greekstack put
              the whole chapter on one branded site we set up in an afternoon.&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-sm text-muted-foreground">
              What chapter officers tell us after switching
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────── Final CTA ─────────────────────────── */

function FinalCta() {
  return (
    <section className="container pb-24 pt-4">
      <div className="relative overflow-hidden rounded-3xl p-[1.5px]">
        {/* Slowly-rotating conic-gradient border ring — the panel edge feels
            alive. Sits behind the inner card; aria-hidden + GPU transform. */}
        <div
          aria-hidden="true"
          className="absolute inset-[-100%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,#6366f1_60deg,#a855f7_140deg,#22d3ee_220deg,transparent_300deg)] opacity-70 motion-reduce:animate-none"
        />
        <AnimatedBackground
          variant="spotlight"
          tone="platform"
          className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] border border-indigo-500/10 bg-gradient-to-br from-indigo-500/[0.07] via-violet-500/[0.05] to-cyan-500/[0.07]"
        >
          {/* Drifting orbs inside the panel for extra life. */}
          <FloatingOrbs blur={80} />
          <Reveal className="relative z-10 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="mx-auto mb-5 flex justify-center">
              <span className="animate-float">
                <IconChip icon={Rocket} tone="platform" size="lg" />
              </span>
            </div>
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Launch your chapter on <span className="gs-gradient-text">Greekstack</span> today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
              Spin up a fully-branded recruitment and management site in seconds. No setup fee, no
              developer, cancel anytime.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic strength={22} className="w-full sm:w-auto">
                <Button asChild variant="platform" size="xl" className="gs-sheen cta-shine w-full sm:w-auto">
                  <Link href="/onboard">
                    Launch your chapter
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </Magnetic>
              <Button asChild variant="glass" size="xl" className="w-full sm:w-auto">
                <Link href="#features">Explore features</Link>
              </Button>
            </div>
          </Reveal>
        </AnimatedBackground>
      </div>
    </section>
  );
}

/* ──────────────────────────── Footer ─────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="Greekstack home">
            <span className="transition-transform duration-300 group-hover:rotate-[-6deg]">
              <GreekstackLogo className="h-7 w-7" />
            </span>
            <span className="text-base font-bold tracking-tight gs-gradient-text">Greekstack</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/privacy"
              className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/onboard"
              className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Get started
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Greekstack. The white-label Greek-life platform.</p>
          <p>greeklifesystems.vercel.app</p>
        </div>
      </div>
    </footer>
  );
}
