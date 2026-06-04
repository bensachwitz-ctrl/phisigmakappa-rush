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
  Spotlight,
  ShimmerBorder,
  Grain,
} from "@/components/site/anim";
import {
  IconSpark,
  IconRecruitment,
  IconMembers,
  IconDues,
  IconEvents,
  IconShieldCheck,
  IconRoles,
  IconSafety,
  IconWhiteLabel,
  IconAlumni,
  IconCheckCircle,
  IconArrowRight,
  IconLaunch,
  IconSubdomain,
  IconDashboard,
  IconGrowth,
  IconSecurity,
  IconChevronDown,
  type IconProps,
} from "@/components/brand/icons";

/** Custom Greekstack icon component type — drop-in replacement for lucide's LucideIcon. */
type GsIcon = (props: IconProps) => React.JSX.Element;

/* ────────────────────────────────────────────────────────────────────────
   GREEKSTACK — apex marketing landing (no-subdomain).
   Platform brand: deep ink + royal-blue→sky gradient accents with tasteful gold
   highlights. This sells the SaaS itself; it never renders a specific chapter's data.

   Elevated into a cinematic, "alive" scroll experience built on the shared
   foundation (<AnimatedBackground>, <IconChip>, <Button>, GreekstackLogo,
   gs-gradient-text / gs-sheen / cta-shine) PLUS a set of framer-motion
   animation primitives in components/site/anim/* — typewriter headline,
   cursor-tracking 3D tilt, magnetic CTAs, scroll parallax, staggered 3D
   reveals, drifting gradient orbs, a Greek-glyph marquee, a scroll-progress
   bar, and in-view counters.

   DEPTH PASS (2nd elevation): a glassmorphism + layered-depth + interactive-
   lighting system layered on top of the animation work, for genuinely premium
   B2B-SaaS polish. The frosted .gs-glass surface is applied to the sticky
   header, the bento feature cards, the product-mockup chrome, and the final
   CTA panel; a cursor-tracking <Spotlight> lights the hero + features; a
   <ShimmerBorder> rings the primary CTAs + final-CTA panel in a slow
   blue→sky→gold sheen; the hero mockup floats on a layered ambient shadow over
   a faint <Grain> texture; and the cards gain inner top-edge glow, deeper hover
   shadow, and gold-accent micro-interactions. backdrop-blur is used SPARINGLY
   (a handful of key panels only) to keep it GPU-cheap.

   EVERY motion layer degrades to a static/instant render under
   prefers-reduced-motion (spotlight + shimmer-spin + parallax all gate or fall
   back to static), and all decorative layers are aria-hidden +
   pointer-events-none. Animation is transform/opacity/filter only and
   in-view-gated; the hero LCP text ships in SSR markup, not behind motion, so
   LCP/CLS stay intact. Light-surfaced for WCAG (the app is color-scheme:
   light); the glass surfaces keep AA text contrast.
──────────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#proof", label: "Why Greekstack" },
];

const FEATURES: { icon: GsIcon; title: string; desc: string; span?: boolean }[] = [
  {
    icon: IconRecruitment,
    title: "Recruitment pipeline",
    desc: "QR check-in for PNMs, a Kanban rush funnel, anonymous brother voting, and double-opt-in SMS that texts rushees the schedule the moment events go live.",
    span: true,
  },
  {
    icon: IconDues,
    title: "Automated dues",
    desc: "Stripe-powered dues with treasurer payouts, auto-reconciled ledgers, reminders, and payment plans — collected without the group-chat nagging.",
  },
  {
    icon: IconEvents,
    title: "Events & calendar",
    desc: "Meetings, socials, and service hours with RSVP, roster check-in, and one-click Google Calendar sync.",
  },
  {
    icon: IconRoles,
    title: "Officer RBAC",
    desc: "Granular role-based access for President, Treasurer, Recruitment, and Risk — everyone sees exactly what they should, nothing more.",
  },
  {
    icon: IconSafety,
    title: "Anti-hazing & incident reporting",
    desc: "A zero-tolerance, anonymous incident intake with an audit log and mandatory officer acknowledgments — compliance you can actually prove.",
  },
  {
    icon: IconWhiteLabel,
    title: "White-label branding",
    desc: "Your letters, colors, crest, and custom subdomain. The whole platform re-skins to your chapter in seconds — no rebuild, no developer.",
  },
  {
    icon: IconAlumni,
    title: "Alumni & donations",
    desc: "An alumni directory, gated onboarding, and Stripe donation flows that turn graduated brothers into a recurring giving base.",
    span: true,
  },
];

const STEPS: { icon: GsIcon; step: string; title: string; desc: string }[] = [
  {
    icon: IconLaunch,
    step: "01",
    title: "Sign up",
    desc: "Create your account and claim a chapter subdomain. No credit card, no install — you're in within a minute.",
  },
  {
    icon: IconWhiteLabel,
    step: "02",
    title: "Brand it",
    desc: "Drop in your letters, colors, and crest. Every page, email, and portal instantly re-skins to your chapter.",
  },
  {
    icon: IconSubdomain,
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
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-blue-500/20">
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
        // Frosted-glass header: .gs-glass-nav supplies the translucent base +
        // heavier backdrop-blur + saturation. We keep a scroll-reactive border +
        // shadow on top so the bar gains definition once the page scrolls under
        // it, and stays nearly borderless over the hero.
        "gs-glass-nav sticky top-0 z-50 w-full border-b transition-all duration-300 " +
        (scrolled
          ? "border-border/60 shadow-[0_4px_30px_-12px_rgba(37,99,235,0.45)]"
          : "border-transparent shadow-none")
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
                className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/admin/login">Sign in</Link>
          </Button>
          <Magnetic strength={12} innerStrength={4} radius={70}>
            <ShimmerBorder rounded="rounded-md">
              <Button asChild variant="platform" size="sm" className="gs-sheen">
                <Link href="/onboard" className="group/btn">
                  Create your chapter site
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </ShimmerBorder>
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
      {/* Faint film-grain texture for tactile depth — sits furthest back at
          ~4% opacity so it never competes with content (decorative, static). */}
      <Grain />
      {/* Extra drifting orb layer + a parallaxing faint grid for real depth. */}
      <FloatingOrbs />
      {/* Cursor-tracking radial glow — interactive depth on fine-pointer
          devices only; renders nothing on touch / under reduced motion. */}
      <Spotlight size={520} />
      <Parallax
        aria-hidden="true"
        translateY={70}
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.05)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_at_50%_30%,black_20%,transparent_70%)]"
      >
        <span />
      </Parallax>

      <section className="container relative z-10 pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-slide-up [animation-delay:40ms]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-600 shadow-sm">
              <IconSpark className="h-3.5 w-3.5 animate-heartbeat" accent="#fbbf24" />
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
                caretClassName="bg-sky-500"
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
              <ShimmerBorder rounded="rounded-xl" className="w-full sm:w-auto">
                <Button asChild variant="platform" size="xl" className="gs-sheen cta-shine w-full sm:w-auto">
                  <Link href="/onboard" className="group/btn">
                    Launch your chapter — free
                    <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </ShimmerBorder>
            </Magnetic>
            <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
              <Link href="#how">See how it works</Link>
            </Button>
          </div>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground animate-slide-up [animation-delay:360ms]">
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-500" /> No credit card to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-500" /> Live in 60 seconds
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-500" /> Cancel anytime
            </span>
          </p>
        </div>

        {/* Product mockup floats up, then tracks the cursor in 3D. A faint
            radial "ground glow" sits beneath it so the floating panel feels
            like it casts soft blue light onto the page (decorative). */}
        <Reveal delay={120} className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[8%] bottom-[-6%] -z-10 h-1/3 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.22),rgba(56,189,248,0.10)_45%,transparent_70%)] blur-2xl"
          />
          <Parallax translateY={36} className="[perspective:1200px]">
            <Tilt3DCard max={7} glareColor="rgba(37,99,235,0.30)" className="rounded-2xl">
              <ProductPreview />
            </Tilt3DCard>
          </Parallax>
        </Reveal>

        {/* Bouncing scroll cue. */}
        <div className="mt-12 flex justify-center animate-slide-up [animation-delay:480ms]">
          <Link
            href="#features"
            aria-label="Scroll to features"
            className="group inline-flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-blue-600"
          >
            <span className="uppercase tracking-[0.18em]">Scroll</span>
            <IconChevronDown className="h-5 w-5 animate-bounce" />
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
    { icon: IconDashboard, label: "Overview", active: true },
    { icon: IconMembers, label: "Recruitment" },
    { icon: IconDues, label: "Dues & billing" },
    { icon: IconEvents, label: "Events" },
    { icon: IconShieldCheck, label: "Risk & safety" },
  ];
  const tiles = [
    { label: "Active rushees", value: "62", tone: "text-foreground" },
    { label: "Bids extended", value: "28", tone: "text-foreground" },
    { label: "Dues collected", value: "$18.4k", tone: "text-emerald-600" },
    { label: "Members", value: "147", tone: "text-foreground" },
  ];

  return (
    // Frosted-glass outer frame on a deep layered ambient shadow so the mockup
    // reads as floating well above the page. .gs-glass supplies the translucent
    // base + blur + hairline + top highlight; .gs-float-shadow (declared later
    // in globals.css) overrides the shadow with the deep grounding stack.
    <div className="gs-glass gs-float-shadow rounded-2xl p-2 sm:p-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Browser chrome */}
        <div className="flex h-10 items-center justify-between border-b border-border bg-secondary/60 px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-border" />
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <IconSecurity className="h-3 w-3" />
            yourchapter.greekstack.vercel.app
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
                    ? "bg-gradient-to-r from-blue-500/15 to-sky-500/10 text-blue-700 ring-1 ring-blue-500/20"
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
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500"
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
              backgroundImage: "linear-gradient(90deg,#2563eb,#0ea5e9,#22d3ee)",
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
    { icon: IconSubdomain, label: "Custom subdomain per chapter" },
    { icon: IconSecurity, label: "Isolated, secure tenant data" },
    { icon: IconDues, label: "Stripe dues & payouts built in" },
    { icon: IconShieldCheck, label: "Anti-hazing audit trail" },
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
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      {/* Soft top gradient divider */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      {/* Cursor-tracking glow over the bento grid — subtler than the hero so it
          supports the cards without stealing focus. Fine-pointer-only. */}
      <Spotlight size={420} color="rgba(37,99,235,0.10)" edgeColor="rgba(56,189,248,0.06)" />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
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
              <Tilt3DCard max={8} glareColor="rgba(37,99,235,0.22)" className="h-full rounded-2xl">
                <FeatureCard {...f} />
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }: { icon: GsIcon; title: string; desc: string }) {
  return (
    // Frosted-glass bento card with layered depth. .gs-glass supplies the
    // translucent surface + hairline + top inner-highlight + layered shadow;
    // on hover the card lifts, the border warms to blue, and the shadow deepens
    // into a blue-tinted ambient glow. Decorative accents (corner bloom, top-
    // edge gradient line, gold under-glow) are real children so they never
    // collide with the .gs-glass ::before hairline.
    <div className="group relative h-full overflow-hidden rounded-2xl gs-glass p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-16px_rgba(15,23,42,0.22),0_40px_70px_-40px_rgba(37,99,235,0.5)]">
      {/* Thin gradient top-edge that lights up on hover (blue→sky→gold). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Decorative corner accent — soft blue→cyan glow that brightens on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />
      {/* Gold under-glow that "lights up" from the bottom-left on hover — the
          warm accent the brief asks for, kept very soft so it reads as a glint. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.18),transparent_65%)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <IconChip icon={icon} tone="platform" size="md" className="relative transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6" />
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
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
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
            className="pointer-events-none absolute left-0 right-0 top-[3.25rem] hidden h-px overflow-hidden bg-gradient-to-r from-transparent via-blue-500/30 to-transparent md:block"
          >
            <span
              className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-sky-500/80 to-transparent motion-reduce:hidden"
              style={{
                animation: "gs-rail 3.6s ease-in-out infinite",
              }}
            />
            <style>{`@keyframes gs-rail { 0% { transform: translateX(0); } 100% { transform: translateX(450%); } }`}</style>
          </div>
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 110}>
              {/* Frosted step card — glass over the tinted band, lifting into a
                  blue-tinted ambient shadow on hover. */}
              <div className="group relative h-full rounded-2xl gs-glass p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-16px_rgba(15,23,42,0.22),0_40px_70px_-40px_rgba(37,99,235,0.5)]">
                <div className="mx-auto flex justify-center">
                  <IconChip icon={s.icon} tone="platform" size="lg" className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:-rotate-3" />
                </div>
                <span className="mt-4 block text-xs font-bold tracking-[0.2em] text-blue-500">
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
                <IconArrowRight className="h-5 w-5" />
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
  { letters: "Beta Theta Pi", short: "ΒΘΠ", color: "#1e40af", colorName: "Royal blue" },
  { letters: "Sigma Chi", short: "ΣΧ", color: "#0ea5e9", colorName: "Azure sky" },
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
          <IconWhiteLabel className="h-3.5 w-3.5" />
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
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
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
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_18px_40px_-16px_rgba(15,23,42,0.2),0_40px_70px_-40px_rgba(37,99,235,0.45)]">
                {/* Thin gradient top-edge that lights up on hover. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
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
              <IconChip icon={IconGrowth} tone="platform" size="md" />
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
      {/* Showcase panel: a slow blue→sky→gold animated ring (the .gs-shimmer-
          border utility — spins + blooms on hover, collapses to a STATIC
          gradient ring under reduced motion) wraps a frosted-glass panel. The
          ring's hover-bloom glows OUTSIDE the panel, so no overflow-clip here. */}
      <ShimmerBorder inline={false} rounded="rounded-3xl" className="p-[1.5px]">
        <AnimatedBackground
          variant="spotlight"
          tone="platform"
          // Frosted-glass treatment that PRESERVES the colored tint + orbs: a
          // light backdrop-blur + hairline border + bright top inner-highlight
          // and a layered ambient shadow (carried in the shadow stack), rather
          // than the opaque-white .gs-glass fill which would hide the orbs.
          className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] border border-white/40 bg-gradient-to-br from-blue-500/[0.07] via-sky-500/[0.05] to-cyan-500/[0.07] backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_24px_60px_-24px_rgba(37,99,235,0.4),0_60px_100px_-60px_rgba(15,23,42,0.35)]"
        >
          {/* Faint grain + drifting orbs inside the panel for tactile depth. */}
          <Grain opacity={0.05} />
          <FloatingOrbs blur={80} />
          <Reveal className="relative z-10 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="mx-auto mb-5 flex justify-center">
              <span className="animate-float">
                <IconChip icon={IconLaunch} tone="platform" size="lg" />
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
                <ShimmerBorder rounded="rounded-xl" className="w-full sm:w-auto">
                  <Button asChild variant="platform" size="xl" className="gs-sheen cta-shine w-full sm:w-auto">
                    <Link href="/onboard" className="group/btn">
                      Launch your chapter
                      <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </ShimmerBorder>
              </Magnetic>
              <Button asChild variant="glass" size="xl" className="w-full sm:w-auto">
                <Link href="#features">Explore features</Link>
              </Button>
            </div>
          </Reveal>
        </AnimatedBackground>
      </ShimmerBorder>
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
              className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              Get started
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Greekstack. The white-label Greek-life platform.</p>
          <div className="flex items-center gap-3">
            {/* Discreet entry point to the super-admin operator console. The page
                behind it is just a password form, so linking it is safe — it keeps
                operators from having to memorize the /platform URL. Apex-only:
                this footer renders solely on the marketing landing. */}
            <Link
              href="/platform/login"
              className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              Operator console
            </Link>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            <p>greekstack.vercel.app</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
