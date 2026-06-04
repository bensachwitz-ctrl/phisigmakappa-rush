"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
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
  IconWhiteLabel,
  IconCheck,
  IconCheckCircle,
  IconArrowRight,
  IconLaunch,
  IconSubdomain,
  IconDashboard,
  IconGrowth,
  IconSecurity,
  IconChevronDown,
  IconMenu,
  IconClose,
  type IconProps,
} from "@/components/brand/icons";
// Bespoke marketing/pricing glyphs — imported DIRECTLY (not via the barrel) per
// the brief. These keep EVERY symbol on the page custom (zero lucide).
import {
  IconPlanBase,
  IconPlanDuesShare,
  IconPlanCustom,
  IconSchoolPicker,
  IconBookCall,
  IconTalkToSales,
  IconFreeTag,
  IconUnlimited,
  IconPayout,
} from "@/components/brand/icons/marketing";
// Bespoke feature glyphs for the (now larger, interactive) feature grid —
// imported DIRECTLY per the brief so the grid stays 100% custom (zero lucide).
import {
  IconChat,
  IconAlumniNetwork,
  IconTreasury,
} from "@/components/brand/icons/feature-extras";
import {
  FeatureDetailModal,
  type FeatureDetail,
} from "@/components/site/feature-detail-modal";
import {
  PreviewRecruitment,
  PreviewDues,
  PreviewEvents,
  PreviewRoles,
  PreviewWhiteLabel,
  PreviewChat,
  PreviewAlumni,
} from "@/components/site/feature-previews";

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
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#proof", label: "Why Greekstack" },
  // Real route (not an in-page anchor) — SiteNav/SiteFooter render every entry
  // through next/link, which handles "/"-prefixed hrefs and "#" anchors alike.
  { href: "/contact", label: "Contact" },
];

/* The feature cards ("squares"). Each is now a FeatureDetail: the grid shows the
   icon + title + short `desc`, and clicking a card opens <FeatureDetailModal>
   with the richer `long` copy, capability `bullets`, and an in-app `preview`
   mockup. `wide` cards span two columns on large screens so the grid breathes
   and the hero features read bigger. The "Anti-hazing & incident reporting" card
   was REMOVED per the brief and replaced with the real "Chapter chat" feature so
   the grid stays full + balanced. */
const FEATURES: (FeatureDetail & { wide?: boolean })[] = [
  {
    icon: IconRecruitment,
    eyebrow: "Recruitment",
    title: "Recruitment pipeline",
    desc: "A Kanban rush funnel, QR check-in for PNMs, anonymous brother voting, and double-opt-in SMS — your whole recruitment cycle in one board.",
    long: "Run every recruitment cycle from a single drag-and-drop board. PNMs check in at events with a QR code, brothers vote anonymously, and the moment you publish an event the platform texts rushees the schedule — with double opt-in consent captured for you.",
    bullets: [
      "Drag-and-drop Kanban funnel from interest → bid",
      "QR check-in that builds the PNM list automatically",
      "Anonymous brother voting with running vote sums",
      "TCPA-compliant double opt-in SMS to rushees",
    ],
    preview: <PreviewRecruitment />,
    wide: true,
  },
  {
    icon: IconDues,
    eyebrow: "Finance",
    title: "Automated dues",
    desc: "Stripe-powered dues with treasurer payouts, auto-reconciled ledgers, reminders, and payment plans — collected without the group-chat nagging.",
    long: "Stop chasing dues in the group chat. Members pay by card, money lands straight in your chapter's connected Stripe account, and the ledger reconciles itself. Set up payment plans, automatic reminders, and late tracking once — then let it run.",
    bullets: [
      "Card payments via Stripe Connect, paid out to your account",
      "Self-reconciling ledger — always know who owes what",
      "Payment plans + automatic reminders",
      "No Greekstack markup on top of Stripe's standard rate",
    ],
    preview: <PreviewDues />,
  },
  {
    icon: IconEvents,
    eyebrow: "Calendar",
    title: "Events & calendar",
    desc: "Meetings, socials, and service hours with RSVP, roster check-in, and one-click Google Calendar sync.",
    long: "Every meeting, social, mixer, and service event in one shared calendar. Members RSVP, you take attendance with a tap, and required-event tracking rolls up automatically. One click syncs the whole calendar to Google, iCloud, or Outlook.",
    bullets: [
      "RSVP + live attendance with roster check-in",
      "Required-event tracking that rolls up per member",
      "Service-hour logging for standards",
      "One-click sync to Google / iCloud / Outlook",
    ],
    preview: <PreviewEvents />,
  },
  {
    icon: IconTreasury,
    eyebrow: "Treasury",
    title: "Treasury & budgets",
    desc: "Chapter budgets, ledgers, and expense tracking in one place — every dollar in and out, reconciled against dues automatically.",
    long: "Give your treasurer a real back office. Build a semester budget by line item, log and categorize expenses, and watch spend track against budget in real time — all reconciled against the dues coming in so the books are always current.",
    bullets: [
      "Line-item semester budgets with live spend tracking",
      "Categorized expense logging + receipts",
      "Reconciles against incoming dues automatically",
      "Clean exports for the next treasurer or nationals",
    ],
    preview: <PreviewDues />,
  },
  {
    icon: IconRoles,
    eyebrow: "Permissions",
    title: "Officer roles & access",
    desc: "Granular role-based access for President, Treasurer, Recruitment, and Risk — everyone sees exactly what they should, nothing more.",
    long: "Officers get exactly the tools their job needs and nothing else. Role-based access control scopes every screen and action, so a Recruitment chair never sees the treasury and a new e-board hands off cleanly each year.",
    bullets: [
      "Preset roles: President, Treasurer, Recruitment, Risk & more",
      "Every screen + action scoped by permission",
      "Clean year-over-year e-board handoff",
      "Full audit trail of officer actions",
    ],
    preview: <PreviewRoles />,
  },
  {
    icon: IconChat,
    eyebrow: "Community",
    title: "Chapter chat",
    desc: "Real-time announcements and group chat built right in — replace the scattered GroupMe with one channel tied to your roster.",
    long: "Keep the whole chapter in one place. Built-in real-time chat and announcement channels are tied to your actual roster and officer roles, so the right people see the right messages — no more managing a tangle of side group chats.",
    bullets: [
      "Real-time chat + broadcast announcement channels",
      "Tied to your roster — new members are added automatically",
      "Officer-only and committee channels",
      "Read on web or mobile, push when it matters",
    ],
    preview: <PreviewChat />,
  },
  {
    icon: IconWhiteLabel,
    eyebrow: "Branding",
    title: "White-label branding",
    desc: "Your letters, colors, crest, and custom subdomain. The whole platform re-skins to your chapter in seconds — no rebuild, no developer.",
    long: "It's your chapter's platform, not ours. Drop in your letters, colors, and crest and the entire site — every page, email, member portal, and your own subdomain — re-skins instantly. No rebuild, no agency, no developer required.",
    bullets: [
      "Your letters, colors & crest applied site-wide",
      "Custom subdomain for your chapter",
      "Branded emails + member portal",
      "Re-theme in seconds from the admin panel",
    ],
    preview: <PreviewWhiteLabel />,
  },
  {
    icon: IconAlumniNetwork,
    eyebrow: "Alumni",
    title: "Alumni & donations",
    desc: "An alumni directory, gated onboarding, and Stripe donation flows that turn graduated brothers into a recurring giving base.",
    long: "Turn graduated brothers into a living network and a recurring giving base. A searchable alumni directory, secure gated onboarding, and Stripe-powered donation flows make it easy to stay connected and easy for alumni to give back.",
    bullets: [
      "Searchable alumni directory by class year",
      "Secure single-use onboarding invites",
      "Stripe donation + recurring-giving flows",
      "Giving totals and engagement at a glance",
    ],
    preview: <PreviewAlumni />,
    wide: true,
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

/* ── Pricing ──────────────────────────────────────────────────────────────
   THREE honest ways to pay for the SAME full platform — buyers pick the model
   that fits how their chapter thinks about money, not a stripped-down tier:
     1. BASE PLATFORM — flat $50/mo, FIRST MONTH FREE (or $250/semester).
     2. DUES-SHARE   — $0 upfront; Greekstack takes a small % of dues (1.5% the
        first semester, then 3%). "Pay as your chapter pays."
     3. CUSTOM BUILD — a tailored system on a custom base fee → /contact#custom.
   Every method unlocks the entire product (same features, same support); the
   "Dues-share" card is the recommended/most-popular one and wears the shimmer
   ring. All CTAs route real (/onboard, /contact#custom). */
type Plan = {
  id: string;
  name: string;
  icon: GsIcon;
  /** Big headline price, e.g. "$50" / "1.5%" / "Custom". */
  price: string;
  /** Small unit beside the price, e.g. "/month". */
  unit?: string;
  /** One-line "how this model works" under the price. */
  priceNote: string;
  tagline: string;
  /** The 1–2 differentiators unique to THIS method (beyond the shared list). */
  highlights: string[];
  cta: { label: string; href: string };
  /** Recommended card → shimmer ring + "Most popular" ribbon. */
  featured?: boolean;
  /** Tiny reassurance line under the CTA. */
  fineprint: string;
};

const PLANS: Plan[] = [
  {
    id: "base",
    name: "Base platform",
    icon: IconPlanBase,
    price: "$50",
    unit: "/month",
    priceNote: "First month free · or $250/semester",
    tagline: "One flat price for your whole white-label site.",
    highlights: [
      "Predictable flat monthly bill — easy to budget",
      "Go semester at $250 and save vs. monthly",
    ],
    cta: { label: "Start free month", href: "/onboard" },
    fineprint: "First month free · cancel anytime",
  },
  {
    id: "dues-share",
    name: "Dues-share",
    icon: IconPlanDuesShare,
    price: "1.5%",
    unit: "of dues",
    priceNote: "$0 upfront · 1.5% first semester, then 3%",
    tagline: "Pay as your chapter pays. Nothing out of pocket to launch.",
    highlights: [
      "Zero upfront cost — perfect for a new or lean treasury",
      "We only earn when dues actually come in",
    ],
    cta: { label: "Launch with $0 down", href: "/onboard" },
    featured: true,
    fineprint: "No monthly fee · cancel anytime",
  },
  {
    id: "custom",
    name: "Custom build",
    icon: IconPlanCustom,
    price: "Custom",
    priceNote: "Tailored system · custom base fee",
    tagline: "Bespoke flows, integrations, and reporting for your council.",
    highlights: [
      "Custom recruitment, dues, or alumni-giving workflows",
      "Council / national integrations + custom reporting",
    ],
    cta: { label: "Talk to us", href: "/contact#custom" },
    fineprint: "We scope it with you first — no surprise fees",
  },
];

/* What EVERY method includes — the load-bearing capabilities a buyer checks for.
   Shown once beneath the three cards so the comparison stays clean. */
const PLAN_INCLUDES: { icon: GsIcon; label: string }[] = [
  { icon: IconRecruitment, label: "Recruitment pipeline — QR check-in, Kanban funnel & anonymous voting" },
  { icon: IconPayout, label: "Automated dues with Stripe Connect treasurer payouts" },
  { icon: IconTreasury, label: "Treasury — budgets, ledgers & expense tracking" },
  { icon: IconEvents, label: "Events, meetings & calendar with RSVP and roster check-in" },
  { icon: IconMembers, label: "Member portal & officer role-based access (RBAC)" },
  { icon: IconChat, label: "Chapter chat & announcement channels tied to your roster" },
  { icon: IconWhiteLabel, label: "White-label branding — your letters, colors & subdomain" },
  { icon: IconAlumniNetwork, label: "Alumni directory & Stripe donation flows" },
  { icon: IconUnlimited, label: "Unlimited members & officers — never priced per seat" },
  { icon: IconShieldCheck, label: "TCPA-compliant SMS, isolated tenant data & no-markup processing" },
];

/* ── FAQ ──────────────────────────────────────────────────────────────────
   The real buyer objections, answered honestly. Plain strings (no markup) so
   the accordion stays accessible and the copy is easy to audit. */
const FAQS: { q: string; a: string }[] = [
  {
    q: "Is our chapter's data isolated from other chapters?",
    a: "Yes. Every chapter gets its own isolated database schema — your roster, dues records, and recruitment data are walled off from every other chapter on the platform. Officer access is further scoped by role-based permissions, so a Treasurer and a Recruitment chair only ever see what their job requires.",
  },
  {
    q: "How do you handle TCPA and A2P 10DLC SMS compliance?",
    a: "Compliance is built in, not bolted on. Every PNM opt-in is double opt-in with a timestamped consent receipt (verbatim ATDS language, IP, and user-agent stamped) for the legally-required 4-year recordkeeping. We enforce CTIA STOP/HELP/START keyword handling and an 8am–9pm recipient-local quiet-hours gate so no one gets paged at 3am. A2P 10DLC brand registration is handled at the platform level so individual chapters don't each file with the carriers.",
  },
  {
    q: "What does it cost to process dues and donations?",
    a: "You choose: the base platform is $50/month flat (first month free) or $250/semester, or go $0-upfront with dues-share (1.5% of dues your first semester, then 3%). Either way, card processing runs on Stripe at its standard rate (currently 2.9% + 30¢ per transaction) directly — we don't add any markup or platform fee on top of dues or donations. Payouts go straight to your chapter's connected Stripe account via Stripe Connect.",
  },
  {
    q: "How does the white-label branding actually work?",
    a: "You drop in your letters, colors, and crest from the admin panel and the entire platform re-skins to your chapter in seconds — every page, email, member portal, and your own custom subdomain. There's no rebuild and no developer required; it's your brand front-to-back, never ours.",
  },
  {
    q: "How long does onboarding and migration take?",
    a: "You're live in minutes, not months. Create your account, claim a subdomain, brand it, and start collecting PNMs and dues the same day — no install, no design agency, no setup fee. Your first sign-in walks you through a short checklist so a non-technical officer can get the chapter fully set up on day one.",
  },
  {
    q: "Can we cancel anytime, and do we keep our data?",
    a: "Yes to both. There are no contracts and no cancellation fees — cancel anytime from the admin panel. Your data is always yours: export your roster, PNMs (with vote sums and attendance), and dues records to CSV whenever you want, including on the way out.",
  },
  {
    q: "Is Greekstack for fraternities or sororities?",
    a: "Both. The platform is built for any Greek-letter organization — fraternities and sororities alike. Recruitment, dues, events, member management, and anti-hazing compliance work identically regardless of council, and the white-label branding makes it unmistakably your chapter.",
  },
  {
    q: "What's included in the 14-day free trial?",
    a: "Everything. The trial is the full product — every feature, unlimited members and officers, with no credit card required to start. Set up your branded site, run a recruitment cycle, and invite your e-board before you ever decide to pay.",
  },
];

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
        <Pricing />
        <Faq />
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
  const [menuOpen, setMenuOpen] = React.useState(false);
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
        // it, and stays nearly borderless over the hero. A hairline blue→sky→gold
        // bottom edge fades in on scroll for a premium "lit" seam.
        "gs-glass-nav sticky top-0 z-50 w-full border-b transition-all duration-300 " +
        (scrolled
          ? "border-border/60 shadow-[0_4px_30px_-12px_rgba(37,99,235,0.45)]"
          : "border-transparent shadow-none")
      }
    >
      {/* Lit bottom seam — fades in once the page scrolls under the bar. */}
      <div
        aria-hidden="true"
        className={
          "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent transition-opacity duration-300 " +
          (scrolled ? "opacity-100" : "opacity-0")
        }
      />
      <div
        className={
          // gap-4+ between the wordmark and the nav so the lockup never crowds the
          // links; min-w-0 lets the center nav shrink gracefully before anything
          // would wrap (it collapses into the sheet well before that point).
          "container flex items-center gap-4 transition-all duration-300 " +
          (scrolled ? "h-14" : "h-16")
        }
      >
        {/* Brand lockup — never shrinks. */}
        <Link href="/" className="group flex shrink-0 items-center" aria-label="Greekstack home">
          {/* The "Keystone Stack" wordmark lockup — mark + "Greek"(ink)/"stack"
              (gradient), so the name itself encodes the brand split. The mark
              tilts on hover for a touch of life. A separate agent owns the mark;
              we only lay it out. */}
          <GreekstackWordmark
            size="md"
            markClassName="h-8 w-8 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[-6deg] group-hover:scale-105"
          />
        </Link>

        {/* Center nav — lives on lg+ ONLY so the long primary CTA + Sign-in never
            collide with the links at the 1024 breakpoint (where they used to
            wrap). On md-and-below the links move into the sheet menu. The
            min-w-0 + justify-center keep it optically centered without pushing
            the actions off-screen. */}
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-7 lg:flex xl:gap-9"
          aria-label="Primary"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
              {/* Animated underline that wipes in from the left on hover/focus. */}
              <span
                aria-hidden="true"
                className="absolute -bottom-1.5 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
            </Link>
          ))}
        </nav>

        {/* Right actions. On lg+ this sits after the centered nav; below lg the
            nav is gone so this group is pushed to the end with ms-auto. */}
        <div className="flex shrink-0 items-center gap-2 lg:ms-0 ms-auto">
          <Button asChild variant="ghost" size="sm" className="hidden xl:inline-flex">
            <Link href="/contact#book">Book a call</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/admin/login">Sign in</Link>
          </Button>
          {/* Primary CTA — full label on sm+, compact "Get started" on the
              tightest phones so it never wraps next to the hamburger. */}
          <Magnetic strength={12} innerStrength={4} radius={70} className="hidden sm:inline-flex">
            <ShimmerBorder rounded="rounded-md">
              <Button asChild variant="platform" size="sm" className="gs-sheen whitespace-nowrap">
                <Link href="/onboard" className="group/btn">
                  Create your chapter site
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </ShimmerBorder>
          </Magnetic>
          <ShimmerBorder rounded="rounded-md" className="sm:hidden">
            <Button asChild variant="platform" size="sm" className="gs-sheen whitespace-nowrap">
              <Link href="/onboard">Get started</Link>
            </Button>
          </ShimmerBorder>

          {/* Hamburger — shown on lg-and-below (everything the nav can't fit
              lives in the sheet). 44px touch target. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/70 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile / tablet sheet menu. */}
      <MobileNavSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

/* The slide-in sheet that holds the full nav + auth links + CTA on md-and-below.
   Closes on Escape, backdrop click, and any link tap. Locks body scroll while
   open (scrollbar-width compensated → no CLS) and moves focus into the panel,
   restoring it to the trigger on close. Spring entrance via framer; collapses to
   an instant show/hide under prefers-reduced-motion. */
function MobileNavSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const { body, documentElement: html } = document;
    const scrollbar = window.innerWidth - html.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>('a, button');
      (first ?? panel)?.focus();
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-nav"
          className="fixed inset-0 z-[90] lg:hidden"
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? {} : { opacity: 1 }}
          exit={reduce ? {} : { opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
          />
          {/* Panel — slides in from the right, full-height, frosted. */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            initial={reduce ? false : { x: "100%" }}
            animate={reduce ? {} : { x: 0 }}
            exit={reduce ? {} : { x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col gs-glass-nav bg-card/95 shadow-[-20px_0_60px_-20px_rgba(15,23,42,0.4)] outline-none"
          >
            {/* lit left edge */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-blue-500/0 via-sky-400/60 to-amber-400/0"
            />
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <GreekstackWordmark size="sm" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Mobile">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onClose}
                  className="group flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                >
                  {l.label}
                  <IconArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </nav>

            <div className="space-y-2.5 border-t border-border px-5 py-5">
              <Button asChild variant="platform" size="lg" className="gs-sheen w-full">
                <Link href="/onboard" onClick={onClose} className="group/btn">
                  Create your chapter site
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/admin/login" onClick={onClose}>Sign in</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/contact#book" onClick={onClose}>Book a call</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
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
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-600" /> No credit card to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-600" /> Live in 60 seconds
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-600" /> Cancel anytime
            </span>
          </p>

          {/* Pricing hint — surfaces the three honest models right in the hero and
              jumps to the pricing section. Anchored, crawlable, AA-contrast. */}
          <p className="mt-3 text-sm text-muted-foreground animate-slide-up [animation-delay:400ms]">
            From{" "}
            <span className="font-semibold text-foreground">$50/mo with the first month free</span>,
            a{" "}
            <Link href="#pricing" className="font-semibold text-blue-700 underline-offset-4 hover:underline">
              $0-upfront dues-share
            </Link>
            , or a custom build —{" "}
            <Link href="#pricing" className="font-semibold text-blue-700 underline-offset-4 hover:underline">
              see pricing
            </Link>
            .
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
    { icon: IconShieldCheck, label: "TCPA-compliant SMS & audit trail" },
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
  // Which feature's detail modal is open (null = closed). The cards are real
  // buttons that set this; <FeatureDetailModal> reads it and handles all the
  // a11y (focus-trap, esc, restore).
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const active = openIdx == null ? null : FEATURES[openIdx];

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
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Everything a chapter runs on
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            One platform. Every part of <span className="gs-gradient-text">chapter operations</span>.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Recruitment to alumni giving — the tools your officers actually need, in a single
            branded system instead of a dozen spreadsheets and group chats.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-4 py-1.5 text-xs font-medium text-blue-800">
            <IconSpark className="h-3.5 w-3.5" accent="#38bdf8" />
            Tap any feature to see it inside the app
          </p>
        </Reveal>

        {/* Bigger, generously-spaced bento grid. Two columns on large screens so
            each card is wide and roomy (the brief's "make the squares bigger");
            `wide` cards span the full row for rhythm. Equal-height rows via
            auto-rows-fr. Each card is a cursor-tracking 3D tilt card revealed in
            a staggered 3D sequence as the grid scrolls into view. */}
        <Reveal3D
          stagger={0.07}
          className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:auto-rows-fr"
        >
          {FEATURES.map((f, i) => (
            <Reveal3DItem
              key={f.title}
              className={f.wide ? "sm:col-span-2" : ""}
            >
              <Tilt3DCard max={7} glareColor="rgba(37,99,235,0.22)" className="h-full rounded-3xl">
                <FeatureCard feature={f} wide={f.wide} onOpen={() => setOpenIdx(i)} />
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </div>

      {/* Single shared detail modal — opened by whichever card was clicked. */}
      <FeatureDetailModal feature={active} open={active != null} onClose={() => setOpenIdx(null)} />
    </section>
  );
}

/* A big, interactive feature "square". It's a real <button> (keyboard + focus
   for free) that opens the detail modal. Frosted glass + layered depth, with a
   hover lift, warming border, top-edge light line, corner bloom + gold glint,
   and a "See inside" affordance that slides in. The 3D tilt comes from the
   wrapping <Tilt3DCard>. */
function FeatureCard({
  feature,
  wide,
  onOpen,
}: {
  feature: FeatureDetail & { wide?: boolean };
  wide?: boolean;
  onOpen: () => void;
}) {
  const { icon, title, desc } = feature;

  // The "See inside" affordance, shared by both layouts.
  const seeInside = (
    <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition-colors group-hover:text-blue-800">
      See inside
      <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </span>
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${title} — see details and an in-app preview`}
      className="group relative flex h-full w-full overflow-hidden rounded-3xl gs-glass p-7 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_22px_48px_-18px_rgba(15,23,42,0.24),0_48px_84px_-44px_rgba(37,99,235,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-8"
    >
      {/* Thin gradient top-edge that lights up on hover (blue→sky→gold). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Decorative corner accent — soft blue→cyan glow that brightens on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />
      {/* Gold under-glow that "lights up" from the bottom-left on hover — the
          warm accent the brief asks for, kept very soft so it reads as a glint. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.18),transparent_65%)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
      />

      {wide ? (
        // Wide cards (full-row span) read as a premium horizontal panel: a large
        // icon block on the left, copy on the right — so the extra width is used
        // intentionally instead of leaving the right half empty.
        <div className="relative flex w-full flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <IconChip
            icon={icon}
            tone="platform"
            size="lg"
            className="shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {desc}
            </p>
            <span className="mt-4 inline-flex">{seeInside}</span>
          </div>
        </div>
      ) : (
        // Standard cards: vertical, with the affordance pinned to the bottom so
        // every card in a row aligns.
        <div className="relative flex h-full w-full flex-col">
          <IconChip
            icon={icon}
            tone="platform"
            size="lg"
            className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6"
          />
          <h3 className="mt-5 text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          <span className="mt-auto inline-flex pt-6">{seeInside}</span>
        </div>
      )}
    </button>
  );
}

/* ────────────────────────── How it works ────────────────────────── */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-border bg-secondary/30 py-20 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Live in three steps
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            From zero to a branded chapter site
          </h2>
          <p className="mt-4 text-muted-foreground">
            No developers, no design agency, no months-long build. Just three steps.
          </p>
        </Reveal>

        {/* Selling point: pick your school + letters and the whole site themes
            itself instantly. Sits right above the live demo so the claim and the
            proof read as one beat. */}
        <Reveal delay={60} className="mx-auto mt-12 max-w-3xl">
          <div className="flex flex-col items-center gap-4 rounded-2xl gs-glass px-6 py-5 text-center sm:flex-row sm:text-left">
            <IconChip icon={IconSchoolPicker} tone="platform" size="lg" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Pick your school + letters &rarr;{" "}
                <span className="gs-gradient-text">instantly themed</span>
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                Search your campus and choose your chapter — Greekstack auto-applies your school&apos;s
                colors and your letters across the entire site. Fine-tune any shade after, or leave it
                exactly as it lands.
              </p>
            </div>
          </div>
        </Reveal>

        {/* The "instant, branded site" promise, made visual: as this scrolls
            into view a chapter name + colors type in and a live preview card
            re-skins to match in real time. */}
        <Reveal delay={80} className="mx-auto mt-6 max-w-5xl">
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
                <span className="mt-4 block text-xs font-bold tracking-[0.2em] text-blue-700">
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
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

/* ───────────────────────────── Pricing ───────────────────────────── */

function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
      {/* Faint masked grid band for quiet depth behind the plan card — matches
          the Features/Proof treatment so the page reads as one system. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      {/* Soft top gradient divider */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      {/* Cursor-tracking glow, subtle, fine-pointer-only. */}
      <Spotlight size={420} color="rgba(37,99,235,0.10)" edgeColor="rgba(56,189,248,0.06)" />

      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Simple, honest pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="gs-gradient-text">Three ways to pay.</span> One full platform.
          </h2>
          <p className="mt-4 text-pretty text-base text-muted-foreground">
            Same product, same support, every feature — pick the model that fits how your chapter
            thinks about money. No per-seat math, no stripped-down tiers, no fake
            &ldquo;enterprise&rdquo; upsell.
          </p>
        </Reveal>

        {/* Three comparable plan cards. The recommended "Dues-share" card wears
            the shimmer ring + a ribbon and sits raised on desktop. */}
        <Reveal3D
          stagger={0.1}
          className="mx-auto mt-14 grid max-w-6xl grid-cols-1 items-stretch gap-6 lg:grid-cols-3"
        >
          {PLANS.map((plan) => (
            <Reveal3DItem key={plan.id} className="h-full">
              <PlanCard plan={plan} />
            </Reveal3DItem>
          ))}
        </Reveal3D>

        {/* Shared "every method includes" panel — keeps the cards clean while
            still proving the full capability set behind every price. */}
        <Reveal delay={80} className="mx-auto mt-8 max-w-5xl">
          <div className="relative overflow-hidden rounded-2xl gs-glass p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold tracking-tight">
                Every plan includes the whole platform
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                <IconSpark className="h-3.5 w-3.5" accent="#f59e0b" />
                No feature gates
              </span>
            </div>
            <ul
              className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2"
              aria-label="Included in every plan"
            >
              {PLAN_INCLUDES.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-sky-500/10 ring-1 ring-blue-500/25">
                    <IconCheck className="h-3 w-3 text-blue-700" />
                  </span>
                  <span className="text-sm leading-relaxed text-foreground/90">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Honest framing + a "talk to a human" path for anyone still deciding. */}
        <Reveal delay={120} className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-sm text-muted-foreground">
            On any plan, card processing runs on Stripe at its standard rate
            {" "}(2.9% + 30&cent;) with <span className="font-semibold text-foreground">zero Greekstack markup</span>{" "}
            on dues or donations. Not sure which model fits? Talk it through with the owner.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/contact" className="group/btn">
                <IconTalkToSales className="h-5 w-5 text-blue-700" />
                Talk to sales
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/contact#book" className="group/btn">
                <IconBookCall className="h-5 w-5 text-blue-700" />
                Book a 15-min call
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* A single pricing-method card. Frosted glass with the shared depth language;
   the recommended card is wrapped in the shimmer ring + carries a ribbon and a
   subtle raise. Each card's CTA routes for real (/onboard or /contact#custom). */
function PlanCard({ plan }: { plan: Plan }) {
  const Card = (
    <div
      className={
        "group relative flex h-full flex-col overflow-hidden gs-glass p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-16px_rgba(15,23,42,0.22),0_44px_80px_-44px_rgba(37,99,235,0.55)] " +
        (plan.featured
          ? "rounded-[calc(1.5rem-1.5px)] lg:-translate-y-2 lg:hover:-translate-y-3"
          : "rounded-3xl")
      }
    >
      {/* Thin gradient top-edge (blue→sky→gold). On the featured card it's always
          lit; on the others it warms in on hover. */}
      <div
        aria-hidden="true"
        className={
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0 transition-opacity duration-300 " +
          (plan.featured ? "opacity-100" : "opacity-0 group-hover:opacity-100")
        }
      />
      {/* Soft corner bloom — shared card language. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />

      {/* Ribbon (featured only). */}
      {plan.featured && (
        <span className="relative mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
          <IconSpark className="h-3.5 w-3.5" accent="#fbbf24" />
          Most popular
        </span>
      )}

      <div className="relative flex items-center gap-3">
        <IconChip icon={plan.icon} tone="platform" size="md" className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6" />
        <span className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
          {plan.name}
        </span>
      </div>

      <p className="relative mt-3 min-h-[2.5rem] text-sm leading-relaxed text-foreground/80">
        {plan.tagline}
      </p>

      {/* Price */}
      <div className="relative mt-5 flex items-end gap-1.5">
        <span className="text-5xl font-bold leading-none tracking-tight gs-gradient-text">
          {plan.price}
        </span>
        {plan.unit && (
          <span className="mb-1 text-base font-medium text-muted-foreground">{plan.unit}</span>
        )}
      </div>
      <div className="relative mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.07] px-3 py-1.5 text-[13px] font-medium text-blue-800">
        {plan.id === "base" ? (
          <IconFreeTag className="h-4 w-4 text-blue-700" accent="#f59e0b" />
        ) : (
          <IconCheckCircle className="h-4 w-4 text-blue-600" />
        )}
        {plan.priceNote}
      </div>

      {/* Method-specific highlights. */}
      <ul className="relative mt-6 space-y-2.5" aria-label={`${plan.name} highlights`}>
        {plan.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-sky-500/10 ring-1 ring-blue-500/25">
              <IconCheck className="h-3 w-3 text-blue-700" />
            </span>
            <span className="text-sm leading-relaxed text-foreground/85">{h}</span>
          </li>
        ))}
      </ul>

      {/* CTA pinned to the bottom so all three cards align. */}
      <div className="relative mt-auto pt-7">
        {plan.featured ? (
          <Magnetic className="w-full">
            <Button asChild variant="platform" size="lg" className="gs-sheen cta-shine w-full">
              <Link href={plan.cta.href} className="group/btn">
                {plan.cta.label}
                <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Link>
            </Button>
          </Magnetic>
        ) : (
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href={plan.cta.href} className="group/btn">
              {plan.cta.label}
              <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
            </Link>
          </Button>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">{plan.fineprint}</p>
      </div>
    </div>
  );

  // Wrap only the recommended card in the shimmer ring (it glows outside the
  // panel, so no overflow-clip on the wrapper).
  if (plan.featured) {
    return (
      <ShimmerBorder inline={false} rounded="rounded-3xl" className="h-full p-[1.5px]">
        {Card}
      </ShimmerBorder>
    );
  }
  return Card;
}

/* ───────────────────────────── FAQ ───────────────────────────── */

function Faq() {
  // Single-open accordion. Tracks the open index; -1 = all collapsed. Each row
  // is a real <button> (keyboard + focus-visible for free) controlling an
  // aria-expanded region. The panel animates via grid-template-rows (height
  // 0→auto) which is GPU-cheap and collapses instantly under reduced motion via
  // the motion-reduce:* utilities — no JS measurement, no layout-shift risk.
  const [open, setOpen] = React.useState<number>(-1);

  return (
    <section id="faq" className="scroll-mt-20 border-y border-border bg-secondary/30 py-20 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Questions, answered
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to know before you <span className="gs-gradient-text">go live</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            The real questions chapter officers ask us — security, compliance, fees, and getting
            started. Still curious? Start a free trial and see it yourself.
          </p>
        </Reveal>

        <Reveal delay={80} className="mx-auto mt-12 max-w-3xl">
          <ul className="space-y-3">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              const panelId = `faq-panel-${i}`;
              const btnId = `faq-trigger-${i}`;
              return (
                <li
                  key={item.q}
                  className={
                    "group overflow-hidden rounded-2xl gs-glass transition-colors duration-300 " +
                    (isOpen ? "border-blue-500/40" : "hover:border-blue-500/30")
                  }
                >
                  <h3 className="m-0">
                    <button
                      type="button"
                      id={btnId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen((cur) => (cur === i ? -1 : i))}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-6 sm:text-base"
                    >
                      <span>{item.q}</span>
                      <span
                        aria-hidden="true"
                        className={
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/15 to-sky-500/10 ring-1 ring-blue-500/20 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none " +
                          (isOpen ? "rotate-180" : "")
                        }
                      >
                        <IconChevronDown className="h-4 w-4 text-blue-600" />
                      </span>
                    </button>
                  </h3>
                  {/* Collapsed rows are fully removed from layout via `hidden`,
                      so there is zero reserved space and zero layout shift, and
                      the closed answer text stays out of the a11y tree + tab
                      order until expanded. The chevron rotation is the only
                      motion, and it is disabled under reduced motion. */}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    hidden={!isOpen}
                    className="px-5 pb-5 sm:px-6"
                  >
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Soft conversion nudge under the list. */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
            <p className="text-sm text-muted-foreground">Still have a question?</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/onboard" className="group/btn">
                Start free &amp; explore
                <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
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
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
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
                <Link href="/contact#book" className="group/btn">
                  <IconBookCall className="h-5 w-5" />
                  Book a call
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-foreground/70">
              Prefer to ask first?{" "}
              <Link
                href="/contact"
                className="font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                Talk to sales
              </Link>{" "}
              — a real person (the owner) answers.
            </p>
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
          <Link href="/" className="group flex items-center" aria-label="Greekstack home">
            <GreekstackWordmark
              size="sm"
              markClassName="h-7 w-7 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[-6deg]"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
            {/* NAV_LINKS now includes Contact, so it's rendered in this map —
                no separate hardcoded Contact link (would duplicate it). */}
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
              href="/terms"
              className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/onboard"
              className="text-sm font-medium text-blue-700 transition-colors hover:text-blue-800"
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
