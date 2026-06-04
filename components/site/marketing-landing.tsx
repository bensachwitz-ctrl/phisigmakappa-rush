"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { GreekstackLogo } from "@/components/brand/greekstack-logo";
import { Reveal, CountUp } from "@/components/site/reveal";
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
  type LucideIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────
   GREEKSTACK — apex marketing landing (no-subdomain).
   Platform brand: deep ink + indigo→violet→cyan gradient accents. This sells
   the SaaS itself; it never renders a specific chapter's data.
   Built on the shared foundation: <AnimatedBackground>, <IconChip>, <Button>,
   plus the gs-gradient-text / gs-sheen utilities and the Reveal/CountUp
   scroll primitives. Light-surfaced for WCAG (the app is color-scheme: light).
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

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500/20">
      <SiteNav />
      <main id="main">
        <Hero />
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
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Greekstack home">
          <GreekstackLogo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight gs-gradient-text">Greekstack</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/admin/login">Sign in</Link>
          </Button>
          <Button asChild variant="platform" size="sm" className="gs-sheen">
            <Link href="/onboard">
              Create your chapter site
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <AnimatedBackground variant="aurora-grid" tone="platform">
      <section className="container relative z-10 pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-slide-up [animation-delay:40ms]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              The white-label Greek-life platform
            </span>
          </div>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.06] tracking-tight animate-slide-up [animation-delay:120ms] sm:text-6xl">
            Launch a fully-branded{" "}
            <span className="gs-gradient-text">recruitment + chapter-management</span> site in
            seconds.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground animate-slide-up [animation-delay:200ms] sm:text-lg">
            Greekstack runs recruitment pipelines, automated dues, events, officer access, and
            anti-hazing reporting on one multi-tenant platform — re-skinned to your letters and
            colors, live the same day.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 animate-slide-up [animation-delay:280ms] sm:flex-row">
            <Button asChild variant="platform" size="xl" className="gs-sheen w-full sm:w-auto">
              <Link href="/onboard">
                Create your chapter site
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
              <Link href="#features">See what's inside</Link>
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

        <Reveal delay={120} className="mx-auto mt-14 max-w-5xl sm:mt-16">
          <ProductPreview />
        </Reveal>
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
            yourchapter.greekstack.app
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
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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

/* ─────────────────────────── Trust bar ─────────────────────────── */

function TrustBar() {
  return (
    <section className="border-y border-border bg-secondary/30" aria-label="Highlights">
      <div className="container">
        <Reveal className="grid grid-cols-2 gap-x-6 gap-y-5 py-8 text-center md:grid-cols-4">
          {[
            { icon: Globe, label: "Custom subdomain per chapter" },
            { icon: Lock, label: "Isolated, secure tenant data" },
            { icon: Wallet, label: "Stripe dues & payouts built in" },
            { icon: ShieldCheck, label: "Anti-hazing audit trail" },
          ].map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-2">
              <IconChip icon={b.icon} tone="platform" size="sm" />
              <span className="text-xs font-medium text-muted-foreground">{b.label}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────── Features ──────────────────────────── */

function Features() {
  return (
    <section id="features" className="container scroll-mt-20 py-20 sm:py-28">
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

      <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal
            key={f.title}
            delay={i * 70}
            className={f.span ? "sm:col-span-2 lg:col-span-1" : ""}
          >
            <FeatureCard {...f} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="group h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10">
      <IconChip icon={icon} tone="platform" size="md" />
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
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

        <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {/* connector line on desktop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent md:block"
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 110}>
              <div className="relative h-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                <div className="mx-auto flex justify-center">
                  <IconChip icon={s.icon} tone="platform" size="lg" />
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
          <Button asChild variant="platform" size="lg" className="gs-sheen">
            <Link href="/onboard">
              Create your chapter site
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────────── Proof ───────────────────────────── */

function Proof() {
  return (
    <section id="proof" className="container scroll-mt-20 py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Why chapters choose Greekstack
        </span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Built to make officers&apos; lives easier
        </h2>
      </Reveal>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-6 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="h-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
              <span className="block text-4xl font-bold tracking-tight gs-gradient-text sm:text-5xl">
                <CountUp
                  value={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals}
                />
              </span>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

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
    </section>
  );
}

/* ──────────────────────────── Final CTA ─────────────────────────── */

function FinalCta() {
  return (
    <section className="container pb-24 pt-4">
      <AnimatedBackground
        variant="spotlight"
        tone="platform"
        className="overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.07] via-violet-500/[0.05] to-cyan-500/[0.07]"
      >
        <Reveal className="relative z-10 px-6 py-16 text-center sm:px-12 sm:py-20">
          <div className="mx-auto mb-5 flex justify-center">
            <IconChip icon={Rocket} tone="platform" size="lg" />
          </div>
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Launch your chapter on <span className="gs-gradient-text">Greekstack</span> today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Spin up a fully-branded recruitment and management site in seconds. No setup fee, no
            developer, cancel anytime.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="platform" size="xl" className="gs-sheen w-full sm:w-auto">
              <Link href="/onboard">
                Create your chapter site
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl" className="w-full sm:w-auto">
              <Link href="#features">Explore features</Link>
            </Button>
          </div>
        </Reveal>
      </AnimatedBackground>
    </section>
  );
}

/* ──────────────────────────── Footer ─────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Greekstack home">
            <GreekstackLogo className="h-7 w-7" />
            <span className="text-base font-bold tracking-tight gs-gradient-text">Greekstack</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
