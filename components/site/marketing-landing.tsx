"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, useInView } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { GreekstackWordmark, GreekstackLogo } from "@/components/brand/greekstack-logo";
import { Reveal } from "@/components/site/reveal";

import { BrandGlyph } from "@/components/site/brand-glyph";
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
  ShimmerBorder,
  Grain,
} from "@/components/site/anim";
import {
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
  IconAlumniNetwork,
  IconTreasury,
} from "@/components/brand/icons/feature-extras";
import { IconComms } from "@/components/brand/icons/onboarding";
import {
  FeatureDetailModal,
  type FeatureDetail,
} from "@/components/site/feature-detail-modal";
import { FadingVideo } from "@/components/site/fading-video";

import {
  PreviewRecruitment,
  PreviewDues,
  PreviewEvents,
  PreviewRoles,
  PreviewWhiteLabel,
  PreviewAnnouncements,
  PreviewAlumni,
  PreviewTreasury,
  PreviewRoster,
} from "@/components/site/feature-previews";

/** Custom Greekstack icon component type — drop-in replacement for lucide's LucideIcon. */
type GsIcon = (props: IconProps) => React.JSX.Element;

/* ── Bespoke glassy icon TILE (the new custom character) ──────────────────────
   Renders one of the bespoke single-family <BrandGlyph> SVG app-icons — the SAME
   visual language as the feature-card icons. Transparent by construction (no
   baked dark box), crisp at any size. It stands ALONE (no IconChip glass wrapper)
   so a glass tile never double-ups on a glass chip, and it inherits the shared
   hover lift/tilt when placed inside a `group`. Decorative → aria-hidden. `size`
   matches the IconChip footprints it replaces (sm≈32 / md≈44 / lg≈56). */
/**
 * GlyphTile — now a thin alias over the bespoke <BrandGlyph> SVG icon system.
 * Previously it rendered AI-generated `/brand/gen/<name>.png` rasters that baked
 * a dark navy box behind the art (the "black box" artifact) and read as generic.
 * BrandGlyph draws clean, single-family line-art in the brand gradient on a
 * transparent frosted tile — no box possible, crisp at any size, deliberate.
 * Call-sites keep passing the same concept names (e.g. "feat-events").
 */
function GlyphTile({
  name,
  size = "md",
  className = "",
}: {
  /** Concept key, e.g. "gl-letters" / "feat-events" (legacy stems still work). */
  name: string;
  /** xs≈24 (inline eyebrow) · sm≈36 · md≈44 · lg≈56 — matches IconChip footprints. */
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return <BrandGlyph name={name} size={size} className={className} />;
}

/* ── Greek-key (meander) divider ──────────────────────────────────────────────
   A thin, premium meander strip — the instantly-recognizable "Greek life" cue.
   Decorative only (aria-hidden + pointer-events-none). Backed by the .gs-greek-key
   utility in globals.css (static SVG-background, GPU-light, reduced-motion-safe).
   Used tastefully above a couple of key section headers + as a hairline band. */
function GreekKey({
  className = "",
  width = "w-28",
  gold = false,
  faint = false,
}: {
  className?: string;
  /** Tailwind width utility for the strip (it tiles to fill). */
  width?: string;
  gold?: boolean;
  faint?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={
        "pointer-events-none gs-greek-key" +
        (gold ? " gs-greek-key--gold" : "") +
        (faint ? " gs-greek-key-faint" : "") +
        " " + width +
        (className ? " " + className : "")
      }
    />
  );
}

/* Bespoke "tap to try" pointer cue — replaces the generic 💡 emoji that prefixed
   the interactive demo hint. Single-stroke, inherits currentColor (brand blue),
   one deliberate family with the rest of the icon system. */
function IconCursorTap({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 11V6a2 2 0 0 1 4 0v5" />
      <path d="M13 11V8.5a1.8 1.8 0 0 1 3.6 0V12" />
      <path d="M16.6 11.5a1.8 1.8 0 0 1 3.4.9v3.1a5 5 0 0 1-5 5h-2.2a4 4 0 0 1-2.9-1.2l-3.6-3.7a1.8 1.8 0 0 1 2.6-2.5L9.6 14" />
    </svg>
  );
}

/* In-app preview mockup for the Officer Elections feature. Built from divs in the
   exact visual language of components/site/feature-previews.tsx (royal-blue / sky
   / gold, never purple; every pixel a div so it stays crisp and adds no network
   weight). Shown inside <FeatureDetailModal> when the Elections card is opened.
   It depicts a closed, secret-ballot seat tally with the winner seated — never
   real chapter data, and never any voter→vote linkage (the feature is anonymous
   by design). Defined locally here because the shared previews file isn't part of
   this change; it's `function`-declared so it's hoisted for the FEATURES array. */
function PreviewElections() {
  const [votes, setVotes] = React.useState<number[]>([27, 14, 6]);
  const [userVote, setUserVote] = React.useState<number | null>(null);

  const initialVotes = [27, 14, 6];

  const handleVote = (index: number) => {
    setVotes(prev => {
      const next = [...prev];
      if (userVote === index) {
        // Toggle off
        next[index] = initialVotes[index];
        setUserVote(null);
      } else {
        // Reset others to initial, and add 1 to new selection
        initialVotes.forEach((val, i) => {
          next[i] = val + (i === index ? 1 : 0);
        });
        setUserVote(index);
      }
      return next;
    });
  };

  const totalVotes = votes.reduce((sum, v) => sum + v, 0);

  // Determine winner (highest vote count)
  const maxVotes = Math.max(...votes);
  const winningIndex = votes.indexOf(maxVotes);

  const candidates: { glyph: string; tone: "blue" | "sky" | "gold" }[] = [
    { glyph: "ΑΒ", tone: "blue" },
    { glyph: "ΓΔ", tone: "sky" },
    { glyph: "ΕΖ", tone: "gold" },
  ];

  const toneBar: Record<string, string> = {
    blue: "bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500",
    sky: "bg-gradient-to-r from-sky-500 to-cyan-400",
    gold: "bg-gradient-to-r from-amber-500 to-amber-400",
  };
  const toneAvatar: Record<string, string> = {
    blue: "from-blue-500/25 to-blue-500/10 text-blue-700 ring-blue-500/25",
    sky: "from-sky-500/25 to-sky-500/10 text-sky-700 ring-sky-500/25",
    gold: "from-amber-400/30 to-amber-400/10 text-amber-700 ring-amber-400/30",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">President · ballot</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all duration-300 ${
          userVote !== null 
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
            : "border-blue-500/20 bg-blue-500/10 text-blue-700"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${userVote !== null ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
          {userVote !== null ? `Vote Cast · ${totalVotes} ballots` : `Open · ${totalVotes} ballots`}
        </span>
      </div>
      {/* Anonymity reassurance line — the load-bearing promise of the feature. */}
      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-2.5 py-1.5">
        <IconShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-700" />
        <span className="text-[10px] font-medium text-blue-800">Secret ballot — votes aren&apos;t linked to voters</span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[9px] font-medium italic text-blue-600/90"><IconCursorTap className="h-3 w-3 shrink-0 not-italic" /><span>Tap a candidate row below to cast a simulated anonymous vote.</span></p>

      <div className="mt-2.5 space-y-2">
        {candidates.map((c, i) => {
          const candidateVotes = votes[i];
          const pct = totalVotes > 0 ? Math.round((candidateVotes / totalVotes) * 100) : 0;
          const isWinner = i === winningIndex;
          const isSelected = userVote === i;

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              className={`w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all duration-200 active:scale-[0.99] relative overflow-hidden ${
                isSelected 
                  ? "border-blue-600 bg-blue-500/5 font-semibold"
                  : "border-border bg-card hover:border-blue-400"
              }`}
            >
              <div 
                className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 ${
                  isSelected ? "bg-blue-500/10" : "bg-secondary/20"
                }`}
                style={{ width: `${pct}%` }}
              />

              <span
                aria-hidden="true"
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold ring-1 transition-transform ${
                  isSelected ? "scale-105" : ""
                } ${toneAvatar[c.tone]}`}
              >
                {c.glyph}
              </span>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full transition-all duration-500 ${toneBar[c.tone]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="relative z-10 w-7 shrink-0 text-right text-[11px] font-bold tabular-nums text-foreground">{candidateVotes}</span>
              {isWinner ? (
                <span className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm transition-all">
                  <IconCheck className="h-2.5 w-2.5" />
                  {userVote !== null ? "Winning" : "Seated"}
                </span>
              ) : (
                <span className="w-[52px] shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
        {userVote !== null 
          ? "You cast a vote! Real elections automatically seat the winner into the role upon ballot closure."
          : "Voting closed → the winner was seated into the President role automatically."}
      </p>
    </div>
  );
}

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

/* Ordered to MATCH the page's scroll order (how → features → proof → pricing →
   faq) so the nav doubles as a table of contents for the narrative. The
   interactive-demo path is NOT an inline link here because it already owns a
   permanent, bolder slot in the header actions (the "Demo" button) — six links
   is also the measured max that fits the xl inline band without crowding. */
const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#proof", label: "Why Greekstack" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  // Real route (not an in-page anchor) — SiteNav/SiteFooter render every entry
  // through next/link, which handles "/"-prefixed hrefs and "#" anchors alike.
  { href: "/contact", label: "Contact" },
];

/* The feature cards ("squares"). Each is now a FeatureDetail: the grid shows the
   icon + title + short `desc`, and clicking a card opens <FeatureDetailModal>
   with the richer `long` copy, capability `bullets`, and an in-app `preview`
   mockup. Every card shares ONE anatomy at ONE size — icon tile → title →
   checkmark outcome → body → "See inside" — so the grid reads as a single
   uniform system. (The old `wide` span-2 cards are gone: they orphaned
   "White-label branding" in a half-empty row and stretched "Alumni & donations"
   into a floating full-width band.) TEN cards = five even rows of two on sm+,
   zero holes. Each card also carries a concrete one-line `outcome` surfaced ON
   the card face, so the value is legible WITHOUT opening the modal. Row pairing
   is deliberate: the grid LEADS with the painkillers (Recruitment + Dues, then
   Treasury + Events), the governance story reads together on one row (Officer
   roles & access + Officer elections — the elections preview is the
   locally-defined <PreviewElections> mockup above), community pairs with the
   people (Announcements + Members & roster), and brand + alumni close the grid
   (White-label + Alumni & donations). "Members & roster" surfaces the
   genuinely-shipped directory — actives/alumni views, member profiles, and the
   careers board from the demo's Directory surface. Two more genuinely-shipped
   "launch-day" capabilities — one-click sample data and the guided same-day setup
   checklist — are surfaced in a dedicated strip BELOW this grid (see <Features>)
   rather than as core bento cards, since they're about getting started fast, not
   day-to-day operations. */
const FEATURES: (FeatureDetail & { outcome: string })[] = [
  {
    icon: IconRecruitment,
    img: "feat-recruitment",
    eyebrow: "Recruitment",
    title: "Recruitment pipeline",
    outcome: "Run your whole rush from one board — not five group chats and a spreadsheet.",
    desc: "A Kanban rush funnel, QR check-in for PNMs, anonymous brother voting, and double-opt-in SMS — your whole recruitment cycle in one board.",
    long: "Run every recruitment cycle from a single drag-and-drop board. PNMs check in at events with a QR code, brothers vote anonymously, and the moment you publish an event the platform texts rushees the schedule — with double opt-in consent captured for you.",
    bullets: [
      "Drag-and-drop Kanban funnel from interest → bid",
      "QR check-in that builds the PNM list automatically",
      "Anonymous brother voting with running vote sums",
      "TCPA-compliant double opt-in SMS to rushees",
    ],
    preview: <PreviewRecruitment />,
  },
  {
    icon: IconDues,
    img: "feat-dues",
    eyebrow: "Finance",
    title: "Automated dues",
    outcome: "Get paid on time without nagging anyone in the group chat.",
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
    icon: IconTreasury,
    img: "feat-treasury",
    eyebrow: "Treasury",
    title: "Treasury & budgets",
    outcome: "Hand the next treasurer clean books instead of a shoebox of receipts.",
    desc: "Chapter budgets, ledgers, and expense tracking in one place — every dollar in and out, reconciled against dues automatically.",
    long: "Give your treasurer a real back office. Build a semester budget by line item, log and categorize expenses, and watch spend track against budget in real time — all reconciled against the dues coming in so the books are always current.",
    bullets: [
      "Line-item semester budgets with live spend tracking",
      "Categorized expense logging + receipts",
      "Reconciles against incoming dues automatically",
      "Clean exports for the next treasurer or nationals",
    ],
    preview: <PreviewTreasury />,
  },
  {
    icon: IconEvents,
    img: "feat-events",
    eyebrow: "Calendar",
    title: "Events & calendar",
    outcome: "Know who's actually coming — and who hit their required hours.",
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
    icon: IconRoles,
    img: "feat-portal",
    eyebrow: "Permissions",
    title: "Officer roles & access",
    outcome: "Every officer sees exactly their job — nothing more, handed off cleanly each year.",
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
    icon: IconRoles,
    img: "feat-officers",
    eyebrow: "Elections",
    title: "Officer elections",
    outcome: "Run a clean, secret-ballot election — and the winners are seated into their roles automatically.",
    desc: "Run secret-ballot officer elections right in the app. Ballots are anonymous, votes tally live, and winners are seated into their officer roles automatically.",
    long: "Hold your whole officer election in one place. Build the ballot, open voting to active members, and let votes tally in real time. Ballots are anonymous by design — the system never stores who voted for whom — and the moment voting closes, the winners are seated straight into their officer roles, with access and permissions applied for you.",
    bullets: [
      "Truly secret ballot — voter identity is never tied to a vote",
      "Live tallies with a clear winner per seat (ties flagged, never guessed)",
      "Winners auto-seated into their officer roles on close",
      "Full audit trail of the election, kept separate from how anyone voted",
    ],
    preview: <PreviewElections />,
  },
  {
    icon: IconComms,
    img: "feat-announcements",
    eyebrow: "Community",
    title: "Chapter announcements",
    outcome: "Get chapter news to everyone in one place — not buried in a group chat.",
    desc: "Officer-broadcast announcements built right in — post once and the whole chapter sees it on their dashboard, tied to your roster.",
    long: "Keep the whole chapter informed from one place. Officers post announcements that land on every member's dashboard — pinned when it matters — tied to your actual roster, so the right people always see the latest chapter news without digging through a side group chat.",
    bullets: [
      "Officer-broadcast announcements with pinning",
      "Tied to your roster — new members see them automatically",
      "Lands on every member's portal dashboard",
      "Posted by officers, read on web or mobile",
    ],
    preview: <PreviewAnnouncements />,
  },
  {
    icon: IconMembers,
    img: "gl-brotherhood",
    eyebrow: "Members",
    title: "Members & roster",
    outcome: "One living roster — every member's profile and contact info, always current.",
    desc: "A searchable chapter directory with actives and alumni views, member profiles, and a built-in careers board — the single source of truth your officers share.",
    long: "Retire the roster spreadsheet. Every member lives in one searchable directory — actives and alumni side by side — with profiles, contact info, and standing always current. New members are added in seconds, and the built-in careers board turns your network into real jobs and internships.",
    bullets: [
      "Searchable directory of actives and alumni",
      "Member profiles with contact info and standing",
      "Members manage their own profile & privacy",
      "Chapter careers board for jobs & internships",
    ],
    preview: <PreviewRoster />,
  },
  {
    icon: IconWhiteLabel,
    img: "feat-branding",
    eyebrow: "Branding",
    title: "White-label branding",
    outcome: "It looks like your chapter's own site — your letters, colors, and subdomain.",
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
    img: "feat-alumni",
    eyebrow: "Alumni",
    title: "Alumni & donations",
    outcome: "Turn graduated brothers into a recurring giving base, not a dead email list.",
    desc: "An alumni directory, gated onboarding, and Stripe donation flows that turn graduated brothers into a recurring giving base.",
    long: "Turn graduated brothers into a living network and a recurring giving base. A searchable alumni directory, secure gated onboarding, and Stripe-powered donation flows make it easy to stay connected and easy for alumni to give back.",
    bullets: [
      "Searchable alumni directory by class year",
      "Secure single-use onboarding invites",
      "Stripe donation + recurring-giving flows",
      "Giving totals and engagement at a glance",
    ],
    preview: <PreviewAlumni />,
  },
];

/* "Launch-day" capabilities surfaced in a strip beneath the feature grid. Both
   are genuinely shipped: a one-click sample-data engine that populates (and then
   clears) a believable demo chapter, and the single guided first-run checklist
   (the unified FirstRunCard) that walks a non-technical officer from sign-up to a
   live branded site the same day. They reuse already-imported SVG icons (rendered
   in an IconChip) so the strip stays on-brand without any new image files. */
const LAUNCH_DAY: { icon: GsIcon; img: string; eyebrow: string; title: string; desc: string }[] = [
  {
    icon: IconLaunch,
    img: "gl-bid",
    eyebrow: "Instant demo",
    title: "See your chapter in one click",
    desc: "Load realistic sample data — PNMs, dues, events, and members — to explore everything populated, then clear it with one click before you go live. No throwaway typing to kick the tires.",
  },
  {
    icon: IconCheckCircle,
    img: "feat-branding",
    eyebrow: "Guided setup",
    title: "Live the same day",
    desc: "A single guided checklist walks you from sign-up to a fully-branded, live site the same day — so a non-technical officer can get the whole chapter set up on day one.",
  },
];

const STEPS: { icon: GsIcon; img: string; step: string; title: string; desc: string }[] = [
  {
    icon: IconLaunch,
    img: "gl-bid",
    step: "01",
    title: "Sign up",
    desc: "Create your account and claim a chapter subdomain. Your first month is free — set up in a minute, no card required to launch.",
  },
  {
    icon: IconWhiteLabel,
    img: "feat-branding",
    step: "02",
    title: "Brand it",
    desc: "Drop in your letters, colors, and crest. Every page, email, and portal instantly re-skins to your chapter.",
  },
  {
    icon: IconSubdomain,
    img: "gl-letters",
    step: "03",
    title: "Go live",
    desc: "Publish your fully-branded recruitment + management site and start collecting PNMs and dues the same day.",
  },
];

/* "What you get" — concrete value stats, NOT implied adoption. Numeric stats
   animate via <AnimatedCounter>; `display` carries a non-countable value (e.g.
   "Same-day") rendered as static text so we never fake a precise number. */
const STATS: {
  value?: number;
  display?: string;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
}[] = [
  { value: 30, suffix: "-day free trial", label: "To get started (card required for subscription plans)" },
  { value: 10, suffix: " tools", label: "Recruitment to alumni, in one login" },
  { display: "Same-day", label: "From sign-up to a live, branded site" },
  { value: 0, prefix: "$", label: "Per-seat fees — unlimited members & officers" },
];

/* The value props the hero headline types through before settling on the
   brand promise. Kept short + punchy; the SSR markup shows the settled line. */
const HERO_PHRASES = [
  "Run rush & recruitment.",
  "Collect dues automatically.",
  "Manage your officer access.",
  "Cast secret ballots & elections.",
  "Track chapter scholarship.",
  "Broadcast TCPA-compliant text alerts.",
  "Build alumni giving campaigns.",
  "Custom subdomains & white-label.",
  "Check-in at events & track attendance.",
  "Manage budgets & treasuries.",
  "Coordinate Bid Day rosters.",
  "Enforce chapter bylaws & compliance.",
];
const HERO_SETTLE = "Run your whole chapter.";

/* Real capability/trust claims for the marquee band. We have no customer logos
   yet, so instead of faking a "trusted by" row we run a tasteful animated strip
   of TRUE platform claims a buyer actually cares about. Each is a real, defensible
   statement (Stripe payouts, tenant isolation, compliance, no per-seat pricing,
   the councils served). */
/* The old static four-tile TrustBar repeated these same claims a second time
   directly under this band (Stripe ↔ Stripe, tenant isolation ↔ tenant
   isolation, TCPA ↔ TCPA) — two stacked trust bands answering the same
   question. It was removed and its ONE unique claim (custom subdomain) was
   folded in here, so the page spends that scroll beat showing the product
   instead (see <DemoShowcase>). */
const TRUST_CLAIMS: { icon: GsIcon; label: string }[] = [
  { icon: IconPayout, label: "Stripe-powered payouts" },
  { icon: IconSecurity, label: "Tenant-isolated data" },
  { icon: IconShieldCheck, label: "TCPA / A2P 10DLC compliant" },
  { icon: IconUnlimited, label: "Unlimited members — never per-seat" },
  { icon: IconSubdomain, label: "Custom subdomain per chapter" },
  { icon: IconMembers, label: "Fraternities & sororities" },
  { icon: IconRoles, label: "IFC · Panhellenic · NPHC" },
];

/* ── Pricing ──────────────────────────────────────────────────────────────
   The honest ways to pay for the SAME full platform — kept deliberately minimal
   so the choice is fluid (fewer options = easier decision):
     1. PLATFORM — the lead is FIRST MONTH FREE. After that you pick how you pay:
        • Monthly: $50/month + $200 per rush cycle, OR
        • Yearly:  $800/year — all rush fees included (the better value; this is
          the recommended/featured card and wears the shimmer ring + ribbon).
     2. DUES-SHARE — waive the monthly platform fee entirely and instead pay a
        small percentage on dues collected online (1.5% intro, then 3%); no card
        required to start.
     3. CUSTOM — need something tailored? Talk to Ben about a custom build +
        pricing → /contact#book (the existing book-a-call path).
   There is NO semester option. Every method unlocks the entire product (same
   features, same support). CTAs route real (/onboard, /contact#book). */
type Plan = {
  id: string;
  name: string;
  icon: GsIcon;
  /** Big headline price, e.g. "Free" / "Custom" — the lead the eye lands on. */
  price: string;
  /** Small unit beside the price, e.g. "your first month". */
  unit?: string;
  /** Optional intro-discount badge shown beside the price. */
  introBadge?: string;
  /** One-line "what happens after" / framing under the price. */
  priceNote: string;
  tagline: string;
  /** The differentiators unique to THIS plan (beyond the shared list). */
  highlights: string[];
  /** Optional explicit monthly-vs-yearly choice rendered as two clear rows so
      it's obvious which is the better deal. Only the platform plan uses this. */
  billing?: {
    monthly: { price: string; cadence: string; note: string };
    yearly: { price: string; cadence: string; note: string; badge?: string };
  };
  cta: { label: string; href: string };
  /** Recommended card → shimmer ring + "Most popular" ribbon. */
  featured?: boolean;
  /** Tiny reassurance line under the CTA. */
  fineprint: string;
};

const PLANS: Plan[] = [
  {
    id: "dues_percentage",
    name: "Dues-Share",
    icon: IconPayout,
    price: "$0",
    unit: "platform fee",
    priceNote: "1.5% then 3% on dues collected",
    tagline: "Waive all monthly platform fees and pay only as you collect.",
    highlights: [
      "No monthly platform fee — ever",
      "1.5% fee on your first dues cycle",
      "3% standard fee on subsequent cycles",
      "No setup cost & no card required to start",
    ],
    cta: { label: "Start on Dues-Share", href: "/onboard" },
    fineprint: "No card needed to start · setup via Ben",
  },
  {
    id: "platform",
    name: "Platform",
    icon: IconPlanBase,
    price: "Free",
    unit: "your first month",
    priceNote: "$50/month after the first month",
    tagline: "Everything your chapter needs, on one branded site.",
    highlights: [
      "Free for the first month",
      "$50/month after the first month",
      "$200 each rush cycle",
      "Unlimited members & officers — never per-seat",
    ],
    billing: {
      monthly: {
        price: "$50",
        cadence: "/month",
        note: "+ $200 each rush cycle",
      },
      yearly: {
        price: "$800",
        cadence: "/year",
        note: "All rush fees included",
        badge: "Best value",
      },
    },
    cta: { label: "Start free month", href: "/onboard" },
    featured: true,
    fineprint: "First month free · card setup required at signup · cancel anytime",
  },
  {
    id: "custom",
    name: "Custom build",
    icon: IconPlanCustom,
    price: "Custom",
    priceNote: "Need something tailored? We scope it with you.",
    tagline: "Bespoke flows, integrations, and reporting for your council.",
    highlights: [
      "Custom recruitment, dues, or alumni-giving workflows",
      "Council / national integrations + custom reporting",
      "Custom pricing built around what you actually need",
    ],
    cta: { label: "Talk to Ben about a custom build", href: "/contact#book" },
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
  { icon: IconRoles, label: "Secret-ballot officer elections that auto-seat the winners" },
  { icon: IconComms, label: "Chapter announcements broadcast to your whole roster" },
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
    a: "First month free, then $50/mo + $200 per rush cycle — or $800/year (rush fees included). Subscription plans require card setup at signup to start your free trial. Alternatively, you can choose our Dues-Share plan to waive the monthly platform fee entirely, paying a simple percentage (1.5% intro, then 3%) on dues collected online (no card required to sign up). Card processing runs on Stripe at its standard rate (currently 2.9% + 30¢ per transaction) directly — we don't add any platform markup.",
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
    a: "Both. The platform is built for any Greek-letter organization — fraternities and sororities alike, across IFC, Panhellenic, and NPHC councils. Recruitment, dues, events, and member management work identically regardless of council, and the white-label branding makes it unmistakably your chapter.",
  },
  {
    q: "Do I have to pay anything to start?",
    a: "No. Your first month is completely free. Paid plans require setting up a card at signup, but you won't be charged today and can cancel at any time. It includes the full product — every feature, unlimited members and officers. Alternatively, choose our Dues-Share plan which requires no card to start.",
  },
];



export default function MarketingLandingPage() {
  return (
    <div className="relative min-h-screen text-foreground antialiased selection:bg-blue-500/20">
      {/* Tinted base wash — replaces the flat-white background so the page never
          reads as plain: a soft blue radial up top fading to white, then a faint
          blue floor. Fixed page-background layer at z-0 (owner round-8 z-stack:
          bg z-0 → letters z-1 → content z-2+). */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-10] bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(37,99,235,0.10),transparent_55%),linear-gradient(to_bottom,#f6f8fc_0%,#ffffff_34%,#eef4ff_100%)]"
      />
      {/* Drifting Greek letters are rendered globally by app/layout.tsx —
          no local instance needed here. The field sits at z-[-5], behind
          the page wash (z-[-10]) and all cards/text (z-10). */}
      <ScrollProgressBar />
      <SiteNav />
      {/* NARRATIVE ORDER — each scroll beat answers the next natural question:
          Hero ("what is this?") → GlyphMarquee ("can I trust it?") →
          DemoShowcase ("show me — as MY chapter") → HowItWorks ("how do I get
          it?") → Features ("what's included?") → BeforeAfter ("why switch?") →
          Proof ("who's behind it / what do I get?") → Pricing ("what does it
          cost?") → Faq (last objections) → FinalCta (close). The interactive
          demo + launch paths recur tastefully at the end of every major beat. */}
      <main id="main" className="relative z-10">
        <Hero />
        <GlyphMarquee />
        <DemoShowcase />
        <HowItWorks />
        <Features />
        <BeforeAfter />
        <PracticeShowcase />
        <Proof />
        <Pricing />
        <Faq />
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
        // Frosted-glass header: .liquid-glass-strong supplies the translucent base +
        // heavier backdrop-blur + saturation. We keep a scroll-reactive border +
        // shadow on top so the bar gains definition once the page scrolls under
        // it, and stays nearly borderless over the hero. A hairline blue→sky→gold
        // bottom edge fades in on scroll for a premium "lit" seam.
        "liquid-glass-strong sticky top-0 z-50 w-full border-b transition-all duration-300 " +
        (scrolled
          ? "border-border/60 shadow-[0_4px_30px_-12px_rgba(37,99,235,0.45)] bg-white/80 backdrop-blur-lg"
          : "border-transparent shadow-none bg-transparent")
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
          // THREE-COLUMN GRID (auto · 1fr · auto): the brand and the right-side
          // actions take exactly the space they need (auto), and the center nav
          // lives in the flexible middle column. Because each region owns its own
          // grid track, the brand and the actions can NEVER overlap each other or
          // the links — the middle column simply shrinks, and the inline nav is
          // hidden well before it would ever crowd a neighbour. This replaces the
          // old single flex row that clipped the CTA in the ~1280–1320px band.
          "container grid grid-cols-[auto_1fr_auto] items-center gap-3 transition-all duration-300 " +
          (scrolled ? "h-14" : "h-16")
        }
      >
        {/* Brand lockup — col 1, never shrinks. */}
        <Link href="/" className="group flex shrink-0 items-center" aria-label="Greekstack home">
          {/* The "Keystone Stack" wordmark lockup — mark + "Greek"(ink)/"stack"
              (gradient), so the name itself encodes the brand split. The mark
              tilts on hover for a touch of life. */}
          <GreekstackWordmark
            size="md"
            markClassName="h-8 w-8 transition-transform duration-300 ease-gs-spring group-hover:rotate-[-6deg] group-hover:scale-105"
          />
        </Link>

        {/* Center nav — col 2 (the flexible middle track). Renders inline from xl
            (≥1280px) where the brand (~150px) + the six links (~700px) + the full
            actions cluster (~360px) measure ~1210px and fit the 1280 container with
            room to spare — so common 1366/1440 laptops keep the full desktop nav
            instead of dropping to a hamburger. The three-column grid means the
            tracks can never overlap regardless of width; below xl the links simply
            collapse into the sheet menu. justify-center keeps it optically centered;
            min-w-0 lets the track shrink without forcing horizontal scroll. */}
        <nav
          className="hidden min-w-0 items-center justify-center gap-3 xl:flex xl:gap-4 2xl:gap-6 text-xs xl:text-sm"
          aria-label="Primary"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative whitespace-nowrap font-medium text-muted-foreground transition-colors hover:text-foreground"
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

        {/* Right actions — col 3, never shrinks, always flush right. The compact
            "Demo" + "Sign in" text links show from lg up (they take little room);
            the primary CTA + hamburger are always present so there's a clear path
            to launch + to the full menu at every width. */}
        <div className="col-start-3 flex shrink-0 items-center justify-end gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex text-blue-600 hover:text-blue-800 font-bold">
            <Link href="/app?demo=true">Demo</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          {/* Primary CTA — full label on md+, compact "Launch — free" on the
              tightest phones so it never wraps beside the hamburger. */}
          <Magnetic strength={12} innerStrength={4} radius={70} className="hidden md:inline-flex">
            <ShimmerBorder rounded="rounded-md">
              <Button asChild variant="platform" size="sm" className="gs-sheen whitespace-nowrap px-3.5">
                <Link href="/onboard" className="group/btn font-bold">
                  <span className="hidden 2xl:inline">Launch chapter — free</span>
                  <span className="2xl:hidden">Launch free</span>
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 ml-1.5 inline-flex" />
                </Link>
              </Button>
            </ShimmerBorder>
          </Magnetic>
          <ShimmerBorder rounded="rounded-md" className="md:hidden">
            <Button asChild variant="platform" size="sm" className="gs-sheen whitespace-nowrap">
              <Link href="/onboard">Launch — free</Link>
            </Button>
          </ShimmerBorder>

          {/* Hamburger — shown below xl (everything the inline nav can't fit lives
              in the sheet: the section links, plus Demo + Sign in on the tighter
              widths). 44px touch target (WCAG 2.5.5 / Apple HIG minimum). */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card/70 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 xl:hidden"
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
          className="fixed inset-0 z-[90] xl:hidden"
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
                className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
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
                  className="group flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-secondary active:scale-[0.99] active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                >
                  {l.label}
                  <IconArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </nav>

            <div className="space-y-2.5 border-t border-border px-5 py-5">
              <Button asChild variant="platform" size="lg" className="gs-sheen w-full">
                <Link href="/onboard" onClick={onClose} className="group/btn">
                  Launch your chapter — free
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full text-blue-600 border-blue-500/20 hover:bg-blue-50/50 hover:text-blue-700 font-semibold">
                <Link href="/app?demo=true&pick=1" onClick={onClose}>See the demo as your chapter</Link>
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/login" onClick={onClose}>Sign in</Link>
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
    <AnimatedBackground variant="aurora-grid" tone="platform" className="relative">
      {/* MOTION BUDGET (GOTY): the above-the-fold hero is held to a small number
          of concurrent motion systems. We keep ONE ambient background (the
          aurora-grid of <AnimatedBackground>) and the typewriter as the single
          hero motion moment; the entrance word-reveal/slide-ups are one-shot, not
          looping. The previously-stacked background video, drifting orbs, rising
          Greek letters, and parallaxing grid were removed from the hero — they
          compounded into 9+ concurrent infinite systems (compositing jank +
          "motion = active" AI-slop) without adding meaning. The static film
          grain stays (decorative, no animation). */}
      <Grain />

      <section className="container relative z-10 pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow pill — bespoke + premium. The OUTER span paints a hairline
              gradient border (gold→amber→sky) by laying the gradient under a 1px
              pad; the INNER span is a frosted-glass pill (.gs-glass) that masks
              all but that 1px rim. The brand mark (rounded, ~18px) leads instead
              of a generic sparkle, a soft gold glow sits behind for warmth, and
              the label is a crisp, saturated gold→amber gradient (amber-700→
              gold-400) with bold weight so it reads with strong contrast rather
              than the old washed-out amber. Decorative layers are aria-hidden. */}
          {/* Bold animated subheader — the tagline now reads as bold, tracked-out
              letters that reveal word-by-word (fade + slide-up + un-blur), with the
              brand-gradient accent word continuously panning. No pill, per owner
              request ("just bold letters with a nice reveal"). SSR-safe (text is in
              the markup) + reduced-motion-safe (see globals.css). */}
          <p className="flex flex-wrap items-center justify-center gap-x-[0.5em] gap-y-1 text-sm font-extrabold uppercase leading-none tracking-[0.14em] text-slate-900 xs:text-base sm:text-lg sm:tracking-[0.2em]">
            {["The", "white-label", "Greek-life", "platform"].map((w, i) => (
              <span
                key={w}
                className={
                  "gs-word-reveal inline-block " +
                  (i === 2 ? "gs-gradient-text" : "")
                }
                style={{ animationDelay: `${140 + i * 95}ms` }}
              >
                {w}
              </span>
            ))}
          </p>

          {/* H1 keeps the full brand promise in the SSR markup (LCP target),
              with a typewriter line layered on top that cycles the value props
              then settles. The static line below the gradient phrase carries
              the meaning even if JS never runs. */}
          <h1 className="gs-hero-h1 mt-6 text-balance font-bold tracking-tight animate-slide-up [animation-delay:120ms]">
            <span className="block">
              <TypewriterCycle
                phrases={HERO_PHRASES}
                settleText={HERO_SETTLE}
                ssrText={HERO_SETTLE}
                textClassName="gs-gradient-text"
                caretClassName="bg-sky-500"
              />
            </span>
            <span className="mt-2 block text-foreground">
              One branded site for every part of it.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-foreground/80 animate-slide-up [animation-delay:200ms] sm:text-lg">
            Stop chasing dues in the group chat. Greekstack runs recruitment, automated dues,
            events, officer access, and alumni giving on one branded site — re-skinned to your
            letters and colors, live the same day.
          </p>

          {/* Tagline/badge strip — the SIX highest-signal tools, not an
              exhaustive keyword dump. Curated (was 17) so the band reads as a
              confident "here's the core," lets the H1 above breathe, and doesn't
              dilute the "8 tools in one site" stat below it. The full breadth is
              carried by the feature grid further down the page. */}
          <div className="mx-auto mt-8 flex flex-wrap justify-center gap-2 max-w-2xl animate-slide-up [animation-delay:240ms]">
            {[
              { label: "Recruitment & Rush", icon: "recruitment" },
              { label: "Online Dues Collection", icon: "dues" },
              { label: "Event RSVP & Attendance", icon: "checkin" },
              { label: "Secret Ballots & Elections", icon: "ballot" },
              { label: "Treasury & Budgets", icon: "treasury" },
              { label: "White-Label Domains", icon: "branding" },
            ].map((feat, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1.5 rounded-full border border-blue-500/10 bg-blue-50/40 px-3 py-1 text-xs font-semibold text-blue-800 shadow-[0_2px_10px_-4px_rgba(59,130,246,0.1)] transition-all hover:scale-105 hover:bg-blue-50 hover:border-blue-500/25"
              >
                <span className="w-3 h-3 opacity-85 flex items-center justify-center text-blue-700">
                  <BrandGlyph name={feat.icon as any} size="xs" />
                </span>
                {feat.label}
              </span>
            ))}
          </div>

          {/* The two CTAs render at IDENTICAL width at EVERY viewport (owner
              round-5): stacked (<md) both fill the same max-w-[22rem] column;
              in a row (md+) the grid is w-fit with auto-cols-fr, so both
              columns resolve to the width of the WIDER button — min-width
              alone let the longer label stretch one of the pair. Both are
              size="xl" (h-14) so heights match too. */}
          <div className="mx-auto mt-10 grid w-full max-w-[22rem] grid-cols-1 gap-3 animate-slide-up [animation-delay:280ms] md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
            <Magnetic className="w-full">
              <ShimmerBorder rounded="rounded-xl" className="w-full">
                <Button asChild variant="platform" size="xl" className="gs-sheen cta-shine w-full max-[400px]:px-5">
                  <Link href="/onboard" className="group/btn">
                    Launch your chapter — free
                    <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </ShimmerBorder>
            </Magnetic>
            {/* Value-forward demo CTA: says what the visitor GETS (the app as
                their chapter), and deep-links straight to the chooser so the
                reskin moment is literally one click from arrival. */}
            <Button asChild variant="outline" size="xl" className="w-full max-[400px]:px-5 border-blue-500/30 text-blue-600 hover:bg-blue-50/50 hover:text-blue-700 font-semibold">
              <Link href="/app?demo=true&pick=1">See the demo as your chapter</Link>
            </Button>
          </div>

          {/* Tertiary action demoted to a quiet text link so the page has exactly
              two real CTAs of distinct weight (filled primary + outline secondary)
              rather than three competing buttons. */}
          <div className="mt-4 flex justify-center animate-slide-up [animation-delay:320ms]">
            <Link
              href="#how"
              className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-blue-700"
            >
              See how it works
              <IconChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </Link>
          </div>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground animate-slide-up [animation-delay:360ms]">
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-600" /> First month free
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-600" /> Live the same day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheckCircle className="h-3.5 w-3.5 text-blue-600" /> Cancel anytime
            </span>
          </p>

          {/* Pricing hint — one honest line, ONE link to the pricing section
              (the old duplicate links were folded into this single CTA).
              Anchored, crawlable, AA-contrast. */}
          <p className="mt-3 text-sm text-foreground/80 animate-slide-up [animation-delay:400ms]">
            First month free, or waive fees with Dues-Share —{" "}
            <Link href="#pricing" className="font-semibold text-blue-700 underline-offset-4 hover:underline">
              see pricing
            </Link>
            .
          </p>

          {/* Credibility band — animated proof at the decision point (right under
              the CTA), not 1,400px down the page. A glass bar on the house curve
              with three countable stats so a skeptic sees the value before they
              scroll past. Counters ramp on view; reduced-motion shows finals. */}
          <Reveal delay={120} className="mx-auto mt-7 w-fit max-w-full animate-slide-up [animation-delay:440ms]">
            <div className="flex flex-wrap items-stretch justify-center divide-x divide-border/70 overflow-hidden rounded-2xl gs-glass px-1.5 py-1.5">
              {[
                { value: 8, suffix: "", label: "tools in one site" },
                { value: 0, prefix: "$", label: "to get started" },
                { value: 30, suffix: "s", label: "to go live" },
              ].map((s) => (
                <div key={s.label} className="flex min-w-[7.5rem] flex-col items-center px-4 py-2 sm:px-6">
                  <span className="sr-only">{s.label}</span>
                  <AnimatedCounter
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    duration={1.3}
                    className="bg-gradient-to-br from-blue-700 to-sky-500 bg-clip-text text-2xl font-extrabold tabular-nums leading-none text-transparent sm:text-3xl"
                  />
                  <span className="mt-1.5 text-center text-[11px] font-medium leading-tight text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* "What happens when you launch" — a compact reassurance strip that
              lowers the activation-energy of the primary CTA above it: a skeptic
              sees the commitment is tiny (three small steps, ~30s) BEFORE
              clicking. Glassy, on-brand, and revealed on scroll; the three steps
              read as one connected flow via gradient arrows. Decorative arrows
              are aria-hidden; the steps themselves are an ordered list so the
              "1 → 2 → 3" sequence is conveyed semantically, not just visually. */}
          <Reveal delay={140} className="mx-auto mt-8 w-full max-w-2xl">
            <div className="relative overflow-hidden rounded-2xl gs-glass px-4 py-4 sm:px-6">
              {/* lit top seam — matches the card language elsewhere on the page */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0"
              />
              <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                What happens when you launch
              </p>
              <ol className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-1.5">
                {[
                  { n: "1", label: "Pick your letters & colors" },
                  { n: "2", label: "Create your login" },
                  { n: "3", label: "Your branded site is live in ~30 seconds" },
                ].map((s, i, arr) => (
                  <React.Fragment key={s.n}>
                    <li className="flex flex-1 items-center gap-2.5 text-left">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[11px] font-bold text-white shadow-sm">
                        {s.n}
                      </span>
                      <span className="text-[13px] font-medium leading-snug text-foreground/90">
                        {s.label}
                      </span>
                    </li>
                    {i < arr.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="hidden shrink-0 text-sky-500/70 sm:inline-flex"
                      >
                        <IconArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </ol>
            </div>
          </Reveal>
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
              {/* The mockup IS a door: the whole panel links into the live demo
                  (it contains no interactive elements of its own, so wrapping it
                  is safe). A persistent "Live demo" chip marks it as clickable
                  on touch, and a hover/focus pill invites the click on desktop. */}
              <Link
                href="/app?demo=true"
                aria-label="Open the interactive demo"
                className="group/preview relative block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2"
              >
                <ProductPreview />
                {/* Always-visible affordance chip (touch devices get no hover). */}
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.55)] ring-1 ring-white/30 sm:right-5 sm:top-5"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  Live demo
                </span>
                {/* Desktop hover/focus invitation — materializes centered. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center rounded-2xl bg-blue-950/0 transition-colors duration-300 group-hover/preview:bg-blue-950/[0.06] group-focus-visible/preview:bg-blue-950/[0.06] sm:flex"
                >
                  <span className="translate-y-1.5 scale-95 rounded-full bg-white/95 px-5 py-2.5 text-sm font-bold text-blue-700 opacity-0 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-blue-500/20 backdrop-blur transition-all duration-300 ease-gs-spring group-hover/preview:translate-y-0 group-hover/preview:scale-100 group-hover/preview:opacity-100 group-focus-visible/preview:translate-y-0 group-focus-visible/preview:scale-100 group-focus-visible/preview:opacity-100 motion-reduce:transition-none">
                    Open the interactive demo &rarr;
                  </span>
                </span>
              </Link>
            </Tilt3DCard>
          </Parallax>
        </Reveal>

        {/* Bouncing scroll cue. */}
        <div className="mt-12 flex justify-center animate-slide-up [animation-delay:480ms]">
          <Link
            href="#demo"
            aria-label="Scroll to the live demo showcase"
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
   names and the Greekstack palette — it never shows a real chapter.

   The KPI tiles count up and the pipeline bar grows from 0 → 62% when the
   mockup scrolls into view (house easing, reduced-motion-safe via the shared
   <AnimatedCounter> primitive + an inView-gated width transition). This makes
   the hero "screenshot" read as a live product the moment a visitor sees it. */
function ProductPreview() {
  const nav = [
    { icon: IconDashboard, label: "Overview", active: true },
    { icon: IconMembers, label: "Recruitment" },
    { icon: IconDues, label: "Dues & billing" },
    { icon: IconEvents, label: "Events" },
    { icon: IconShieldCheck, label: "Risk & safety" },
  ];
  // Each tile carries the countable parts so <AnimatedCounter> can ramp them.
  const tiles: {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    tone: string;
  }[] = [
    { label: "Active rushees", value: 62, tone: "text-foreground" },
    { label: "Bids extended", value: 28, tone: "text-foreground" },
    { label: "Dues collected", value: 18.4, prefix: "$", suffix: "k", decimals: 1, tone: "text-emerald-600" },
    { label: "Members", value: 147, tone: "text-foreground" },
  ];

  // Drive the funnel-bar grow-in: 0 → 62% once the panel is in view.
  const reduce = useReducedMotion();
  const barRef = React.useRef<HTMLDivElement>(null);
  const barInView = useInView(barRef, { once: true, amount: 0.6 });
  const filled = reduce || barInView;

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
            yourchapter.greekstack.com
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
                <div className="text-base font-semibold">Fall recruitment</div>
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
                  <AnimatedCounter
                    value={t.value}
                    prefix={t.prefix}
                    suffix={t.suffix}
                    decimals={t.decimals}
                    duration={1.4}
                    className={"mt-1 block text-2xl font-bold tabular-nums " + t.tone}
                  />
                </div>
              ))}
            </div>

            {/* Funnel bar — grows from 0 → 62% on scroll-into-view. */}
            <div ref={barRef} className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="mb-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Pipeline conversion</span>
                <span>62 of 184 PNMs</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 motion-safe:transition-[width] motion-safe:duration-[1400ms] motion-safe:ease-gs-spring"
                  style={{ width: filled ? "62%" : "0%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Capability / trust marquee strip ───────────────────── */

/* A tasteful animated band of REAL platform claims (not fake customer logos and
   not a meaningless alphabet). Each claim is a custom duotone glyph + a short,
   defensible statement, scrolling in a continuous loop that pauses on hover and
   freezes to a static wrapped row under reduced motion (handled inside <Marquee>). */
function GlyphMarquee() {
  return (
    <section
      aria-label="What Greekstack gives every chapter"
      className="border-y border-border bg-card/40 py-7"
    >
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Built for every council — fraternities &amp; sororities
      </p>
      <Marquee
        duration={42}
        gapClassName="gap-5 sm:gap-7"
        items={TRUST_CLAIMS.map((c) => (
          <span
            key={c.label}
            className="inline-flex select-none items-center gap-2.5 whitespace-nowrap rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-semibold text-foreground/90 shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/15 to-sky-500/10 ring-1 ring-blue-500/20">
              <c.icon className="h-4 w-4 text-blue-700" />
            </span>
            {c.label}
          </span>
        ))}
      />
    </section>
  );
}

/* ─────────────────── Demo showcase — "see it as YOUR chapter" ───────────────────
   The page's second beat: right after the hook, SHOW the product re-skinning
   itself live (the auto-cycling BrandItDemo), then hand the visitor the keys —
   one primary CTA into the interactive demo (deep-linked straight to the
   chapter chooser so "see YOUR chapter" is literally the first thing they do)
   and a quiet launch link for the already-convinced. Extracted from the old
   HowItWorks placement where it sat below the fold of its own section. */
function DemoShowcase() {
  return (
    <section id="demo" className="relative scroll-mt-20 overflow-hidden py-12 sm:py-24">
      {/* Faint masked grid band — the shared section-depth language. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            See it before you sign anything
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Watch it become <span className="gs-gradient-text">your chapter</span>
          </h2>
          <p className="mt-4 text-pretty text-foreground/80">
            Pick your school and letters and the entire platform re-skins to your colors —
            here&apos;s that moment on loop. Then open the real demo and do it yourself.
          </p>
        </Reveal>

        <Reveal delay={80} className="mx-auto mt-10 max-w-5xl">
          <BrandItDemo />
        </Reveal>

        {/* The two paths out of this beat: TRY it (primary — deep-links straight
            to the demo's chapter chooser) or LAUNCH it (quiet secondary). */}
        <Reveal delay={120} className="mx-auto mt-10 grid w-full max-w-[22rem] grid-cols-1 gap-3 md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
          <Magnetic className="w-full">
            <ShimmerBorder rounded="rounded-xl" className="w-full">
              <Button asChild variant="platform" size="lg" className="gs-sheen cta-shine w-full">
                <Link href="/app?demo=true&pick=1" className="group/btn">
                  Try it with your chapter<span className="hidden min-[480px]:inline"> — free demo</span>
                  <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </ShimmerBorder>
          </Magnetic>
          <Button asChild variant="outline" size="lg" className="w-full border-blue-500/30 font-semibold text-blue-700 hover:bg-blue-50/50 hover:text-blue-800">
            <Link href="/onboard">Skip ahead — launch for real</Link>
          </Button>
        </Reveal>
        <Reveal delay={160} className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            No sign-up, no email — the demo opens on the chapter picker so the first thing you see
            is <span className="font-semibold text-foreground/80">your</span> letters.
          </p>
        </Reveal>
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
    <section id="features" className="relative scroll-mt-20 overflow-hidden py-12 sm:py-28">
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
      {/* (spotlight removed — compositing) */}
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          {/* Greek-key (meander) divider — the recognizable "Greek life" motif,
              placed once above this flagship section header. Decorative. */}
          <GreekKey className="mx-auto mb-5" width="w-32" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Everything a chapter runs on
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            One platform. Every part of <span className="gs-gradient-text">chapter operations</span>.
          </h2>
          <p className="mt-4 text-pretty text-foreground/80">
            Recruitment to alumni giving — the tools your officers actually need, in a single
            branded system instead of a dozen spreadsheets and group chats.
          </p>
          <p className="mt-4 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-4 py-1.5 text-xs font-medium text-blue-800">
            Tap any feature to see it inside the app
          </p>
        </Reveal>

        {/* ONE uniform, generously-spaced grid: every card is the same size and
            anatomy — 1-col on mobile, 2-col from sm up; ten cards = five even
            rows with zero orphan cells and zero full-width bands. Equal-height
            rows via auto-rows-fr keep visual weight identical across the grid.
            Each card is a cursor-tracking 3D tilt card revealed in a staggered
            3D sequence as the grid scrolls into view. */}
        <Reveal3D
          stagger={0.07}
          className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:auto-rows-fr"
        >
          {FEATURES.map((f, i) => (
            <Reveal3DItem key={f.title}>
              <Tilt3DCard
                max={7}
                glareColor="rgba(37,99,235,0.22)"
                className="h-full rounded-3xl"
                onClick={() => setOpenIdx(i)}
              >
                <FeatureCard feature={f} />
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>

        {/* "Up and running today" strip — two genuinely-shipped launch-day
            capabilities (one-click sample data + the guided same-day setup
            checklist) that aren't day-to-day operations, so they live here
            beneath the core grid rather than as bento cards. Same glass-card
            language, already-imported icons (no new image files), revealed on
            scroll, AA-contrast, reduced-motion-safe via <Reveal>. */}
        <Reveal delay={80} className="mx-auto mt-8 max-w-6xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7">
            {LAUNCH_DAY.map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-3xl gs-glass p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-16px_rgba(15,23,42,0.22),0_40px_70px_-40px_rgba(37,99,235,0.5)] sm:p-7"
              >
                {/* lit top seam — shared card language */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="relative flex items-start gap-4">
                  <GlyphTile
                    name={item.img}
                    size="lg"
                    className="transition-transform duration-300 ease-gs-spring group-hover:scale-105"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                      {item.eyebrow}
                    </span>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Beat-closing path: reading about features is one thing — every one of
            them is live in the demo, so hand the visitor the door. Quiet text
            link (the section's cards are already busy), launch stays implicit. */}
        <Reveal delay={120} className="mt-10 text-center">
          <Link
            href="/app?demo=true"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
          >
            Every feature above is live in the interactive demo — try them
            <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
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
}: {
  feature: FeatureDetail & { outcome?: string };
}) {
  const { icon, img, title, desc, outcome } = feature;

  // The concrete, one-line outcome shown ON the card face (so the value is
  // legible without opening the modal). A small gradient check leads it so it
  // reads as a promise, not body copy. Shared by both card layouts.
  const outcomeLine = outcome ? (
    <p className="flex items-start gap-2 text-[15px] font-semibold leading-snug text-foreground">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-sky-500/10 ring-1 ring-blue-500/25"
      >
        <IconCheck className="h-3 w-3 text-blue-700" />
      </span>
      {outcome}
    </p>
  ) : null;

  // Feature icon — the bespoke <BrandGlyph> tile (a self-contained frosted brand
  // icon) stands ALONE: no IconChip wrapper, so it never double-ups a tile on a
  // chip. Inherits the same hover lift/tilt the chip had so the card's micro-
  // interaction is preserved. Falls back to the SVG-in-chip only if a feature
  // has no glyph. Shared by both card layouts.
  const featureIcon = img ? (
    <BrandGlyph
      name={img}
      size="lg"
      className="transition-transform duration-300 ease-gs-spring group-hover:scale-105"
    />
  ) : (
    <IconChip
      icon={icon}
      tone="platform"
      size="lg"
      className="shrink-0 transition-transform duration-300 ease-gs-spring group-hover:scale-105"
    />
  );

  // The "See inside" affordance, shared by both layouts.
  const seeInside = (
    <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition-colors group-hover:text-blue-800">
      See inside
      <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </span>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`${title} — see details and an in-app preview`}
      // Keyboard path: Enter/Space synthesize a click, which bubbles up to the
      // wrapping <Tilt3DCard onClick> — so the modal opens without a mouse.
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      // active:scale gives the tap a tactile "give" — the only press feedback
      // touch users get, since the 3D tilt layer is desktop-only.
      className="group relative flex h-full w-full overflow-hidden rounded-3xl liquid-glass bg-white/70 backdrop-blur-md p-7 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_22px_48px_-18px_rgba(15,23,42,0.24),0_48px_84px_-44px_rgba(37,99,235,0.55)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-8"
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

      <div className="relative flex h-full w-full flex-col z-10">
        {featureIcon}
        <h3 className="mt-5 text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
        {outcomeLine && <div className="mt-2.5">{outcomeLine}</div>}
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">{desc}</p>
        <span className="mt-auto inline-flex pt-6">{seeInside}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Before → After comparison ─────────────────────── */

/* The status-quo tools a chapter juggles today — deliberately muted + visually
   "scattered" (each chip carries a small random tilt) so the left side reads as
   chaos. These are generic third-party tools (no logos, just names) collapsing
   into the single Greekstack card on the right. */
const BEFORE_TOOLS: { label: string; tilt: string }[] = [
  { label: "Spreadsheets", tilt: "sm:-rotate-2 sm:translate-y-0.5" },
  { label: "GroupMe", tilt: "sm:rotate-1 sm:-translate-y-1" },
  { label: "Venmo", tilt: "sm:rotate-2 sm:translate-y-1" },
  { label: "Google Forms", tilt: "sm:-rotate-1 sm:-translate-y-0.5" },
  { label: "Linktree", tilt: "sm:rotate-1 sm:translate-y-1" },
  { label: "A shared Google Drive", tilt: "sm:-rotate-2 sm:-translate-y-0.5" },
];

/* A tasteful "before vs after" beat: the tangle of tools chapters juggle today
   (muted, scattered chips) collapses — across a gradient arrow — into ONE
   cohesive, glowing Greekstack card that replaces them all. Sits between
   Features and How-it-works so the value ("all of this, in one place") lands
   right after the feature grid. Fully on-brand, animated on scroll, and
   reduced-motion-safe (everything degrades through <Reveal>/<Reveal3D>, which
   render static under prefers-reduced-motion; the arrow's idle drift is gated
   behind motion-reduce:animate-none). */
function BeforeAfter() {
  return (
    <section
      aria-label="Before and after Greekstack"
      className="relative scroll-mt-20 overflow-hidden border-t border-border py-12 sm:py-28"
    >
      {/* Faint masked grid band — matches the Features/Pricing/Proof depth so the
          page reads as one system. Decorative, fades at the edges. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Replace the whole stack
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Six scattered tools become <span className="gs-gradient-text">one</span>
          </h2>
          <p className="mt-4 text-pretty text-foreground/80">
            Stop stitching together a spreadsheet, a group chat, and a payment app every semester.
            Greekstack does the job of all of them — on one branded site your whole chapter logs into.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          {/* BEFORE — the muted, scattered pile of tools. A faint diagonal
              hatch (brand-neutral slate, near-invisible) gives the card a
              scratch-paper texture so the chaos side has its own material —
              deliberately flatter than the glass "after" card it loses to. */}
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-secondary/30 p-6 sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgba(100,116,139,0.05)_0px,rgba(100,116,139,0.05)_1px,transparent_1px,transparent_9px)]"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Today
              </span>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                A different login for every job — nothing talks to anything else.
              </p>
              {/* Scattered, desaturated chips. Each is slightly tilted + grayscale
                  so the cluster reads as "messy", and lifts level on hover. */}
              <ul className="mt-5 flex flex-wrap gap-2.5">
                {BEFORE_TOOLS.map((t) => (
                  <li
                    key={t.label}
                    className={
                      "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-sm font-medium text-muted-foreground opacity-80 shadow-sm transition-all duration-300 hover:opacity-100 hover:grayscale-0 grayscale " +
                      t.tilt
                    }
                  >
                    <IconClose className="h-3.5 w-3.5 text-muted-foreground/70" />
                    {t.label}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Re-built from scratch every year. Data scattered across six apps. Nobody owns it.
              </p>
            </div>
          </Reveal>

          {/* Arrow — the collapse. Points down on mobile (where the cards
              stack) and right on desktop. The rotation lives on an inner
              wrapper so the circle's shadow stays grounded, and the icon
              nudges along its OWN pointing axis via .gs-nudge (the old
              animate-bounce stomped the rotation transform — the arrow
              pointed right on mobile while bobbing vertically). Collapses
              under reduced motion. */}
          <div className="flex items-center justify-center" aria-hidden="true">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-[0_10px_30px_-8px_rgba(37,99,235,0.6)]">
              <span className="flex rotate-90 lg:rotate-0">
                <IconArrowRight className="gs-nudge h-5 w-5" />
              </span>
            </span>
          </div>

          {/* AFTER — one cohesive, glowing Greekstack card that replaces them all.
              Wrapped in the shimmer ring so it visibly "wins" the comparison. */}
          <Reveal delay={120}>
            <ShimmerBorder inline={false} rounded="rounded-3xl" className="p-[1.5px]">
              <div className="group relative overflow-hidden rounded-[calc(1.5rem-1.5px)] gs-glass p-6 sm:p-7">
                {/* always-lit top seam */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0"
                />
                {/* soft corner bloom — shared card language */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10"
                />
                <div className="relative flex items-center gap-3">
                  {/* Inline SVG mark (was a raw PNG that could 404 / fail to
                      decode on mobile and show a broken-image icon). */}
                  <GreekstackLogo
                    title=""
                    aria-hidden
                    className="h-10 w-10 shrink-0 rounded-xl shadow-sm ring-1 ring-black/5"
                  />
                  <div>
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                      With Greekstack
                    </span>
                  </div>
                </div>
                <p className="relative mt-4 text-lg font-semibold leading-snug text-foreground">
                  One branded site. One login. Every part of your chapter.
                </p>
                {/* Greek-key gold accent — a tasteful "Greek life" flourish on the
                    winning card. Left-aligned to the copy, decorative. */}
                <GreekKey className="relative mt-3" width="w-24" gold />
                {/* The capabilities the six tools above were doing — now unified. */}
                <ul className="relative mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    "Recruitment & rush",
                    "Dues & payments",
                    "Roster & members",
                    "Forms & voting",
                    "Events & calendar",
                    "Files, announcements & alumni",
                  ].map((c) => (
                    <li key={c} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-sky-500/10 ring-1 ring-blue-500/25">
                        <IconCheck className="h-3 w-3 text-blue-700" />
                      </span>
                      <span className="text-sm font-medium text-foreground/90">{c}</span>
                    </li>
                  ))}
                </ul>
                <p className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-800">
                  <IconUnlimited className="h-4 w-4 text-blue-700" />
                  Your letters, your colors, your subdomain — never priced per seat.
                </p>
              </div>
            </ShimmerBorder>
          </Reveal>
        </div>

        {/* Beat-closing path: the comparison just made the case — offer the
            switch while it's fresh, with the demo as the no-commitment out. */}
        <Reveal delay={140} className="mt-12 flex flex-col items-center justify-center gap-3">
          <Magnetic>
            <Button asChild variant="platform" size="lg" className="gs-sheen cta-shine">
              <Link href="/onboard">
                Make the switch — first month free
                <IconArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </Magnetic>
          <Link
            href="/app?demo=true"
            className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-blue-700"
          >
            Or poke around the demo first
            <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ────────────────────────── How it works ────────────────────────── */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-border bg-secondary/30 py-12 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Live in three steps
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            From zero to a branded chapter site
          </h2>
          <p className="mt-4 text-foreground/80">
            No developers, no design agency, no months-long build. Just three steps.
          </p>
        </Reveal>

        {/* Selling point: pick your school + letters and the whole site themes
            itself instantly. (The live BrandItDemo that used to prove this here
            now stars one beat earlier in <DemoShowcase> — this card carries the
            claim forward into the steps without repeating the demo.) */}
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

        <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
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
                  <GlyphTile name={s.img} size="lg" className="transition-transform duration-300 ease-gs-spring group-hover:scale-105 group-hover:-rotate-3" />
                </div>
                <span className="mt-4 block text-xs font-bold tracking-[0.2em] text-blue-700">
                  STEP {s.step}
                </span>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-12 flex flex-col items-center justify-center gap-3">
          <Magnetic>
            <Button asChild variant="platform" size="lg" className="gs-sheen cta-shine">
              <Link href="/onboard">
                Launch your chapter — free
                <IconArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </Magnetic>
          {/* The demo path stays one tap away at the end of every beat. */}
          <Link
            href="/app?demo=true"
            className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-blue-700"
          >
            Not ready? Walk through the interactive demo first
            <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
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
        <span className="inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
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
                textClassName="gs-gradient-text"
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
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden py-12 sm:py-28">
      {/* Faint masked grid band for quiet depth behind the plan card — matches
          the Features/Proof treatment so the page reads as one system. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      {/* Soft top gradient divider */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      {/* Cursor-tracking glow, subtle, fine-pointer-only. */}
      {/* (spotlight removed — compositing) */}

      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Simple, honest pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="gs-gradient-text">Waive fees or start free.</span> Then pick what fits.
          </h2>
          <p className="mt-4 text-pretty text-base text-foreground/80">
            Waive the monthly platform fee entirely by choosing our Dues-Share plan, or start free for a month on the Platform plan ($50/month + $200 per rush cycle, or $800/year annual). Same product, same support, every feature — unlimited members, no per-seat math.
          </p>
        </Reveal>

        {/* Three clean plan cards — the recommended Platform card (first month free,
            monthly-vs-yearly) wears the shimmer ring + ribbon, with a Dues-Share card
            and a Custom card. Centered + capped so cards never stretch awkwardly. */}
        <Reveal3D
          stagger={0.1}
          className="mx-auto mt-14 grid max-w-6xl grid-cols-1 items-stretch gap-6 md:grid-cols-3"
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
              <span className="inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
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
          <p className="text-sm text-foreground/80">
            On any plan, card processing runs on Stripe at its standard rate
            {" "}(2.9% + 30&cent;) with <span className="font-semibold text-foreground">zero Greekstack markup</span>{" "}
            on dues or donations. Not sure which model fits? Talk it through with the owner.
          </p>
          <div className="mx-auto mt-6 grid w-full max-w-[22rem] grid-cols-1 gap-3 sm:w-fit sm:max-w-none sm:grid-flow-col sm:auto-cols-fr">
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/contact" className="group/btn">
                <IconTalkToSales className="h-5 w-5 text-blue-700" />
                Talk to sales
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/contact#book" className="group/btn">
                <IconBookCall className="h-5 w-5 text-blue-700" />
                Book a 15-min call
              </Link>
            </Button>
          </div>
          {/* Price anxiety's antidote: try before any commitment. */}
          <p className="mt-5 text-sm text-muted-foreground">
            Want to see what the money buys first?{" "}
            <Link
              href="/app?demo=true"
              className="font-semibold text-blue-700 underline-offset-4 hover:underline"
            >
              Explore the full app in the demo
            </Link>{" "}
            — no sign-up.
          </p>
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
        "group relative flex h-full flex-col overflow-hidden liquid-glass bg-white/70 backdrop-blur-md p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-16px_rgba(15,23,42,0.22),0_44px_80px_-44px_rgba(37,99,235,0.55)] " +
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
        <span className="relative mb-4 inline-flex w-fit items-center rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
          Most popular
        </span>
      )}

      <div className="relative flex items-center gap-3">
        <IconChip icon={plan.icon} tone="platform" size="md" className="transition-transform duration-300 ease-gs-spring group-hover:scale-105" />
        <span className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
          {plan.name}
        </span>
      </div>

      <p className="relative mt-3 min-h-[2.5rem] text-sm leading-relaxed text-foreground/80">
        {plan.tagline}
      </p>

      {/* Lead price — the first thing the eye lands on (e.g. "Free" for the
          first month, or "Custom"). The monthly-vs-yearly choice renders below
          as two clear rows so it's obvious what happens after the free month. */}
      <div className="relative mt-5 flex flex-wrap items-end gap-x-1.5 gap-y-2">
        <span className="text-5xl font-bold leading-none tracking-tight gs-gradient-text">
          {plan.price}
        </span>
        {plan.unit && (
          <span className="mb-1 text-base font-medium text-muted-foreground">{plan.unit}</span>
        )}
        {plan.introBadge && (
          <span className="mb-1 ml-1 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/[0.08] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-blue-700">
            {plan.introBadge}
          </span>
        )}
      </div>
      <div className="relative mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.07] px-3 py-1.5 text-[13px] font-medium text-blue-800">
        {plan.billing ? (
          <IconFreeTag className="h-4 w-4 text-blue-700" accent="#0ea5e9" />
        ) : (
          <IconCheckCircle className="h-4 w-4 text-blue-600" />
        )}
        {plan.priceNote}
      </div>

      {/* Then how you pay — a clean monthly-vs-yearly choice. Two stacked rows so
          it's instantly obvious which is the better deal: the yearly row is
          accented (gold "Best value" badge) and folds the rush fees in, while the
          monthly row spells out the $50 + $200-per-rush math. Static + legible —
          no toggle state to fumble, so the comparison reads at a glance. */}
      {plan.billing && (
        <div className="relative mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Then choose how you pay
          </p>
          <div className="space-y-2">
            {/* Monthly */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3.5 py-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  {plan.billing.monthly.price}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {plan.billing.monthly.cadence}
                </span>
              </div>
              <span className="text-right text-[12px] font-medium text-foreground/70">
                {plan.billing.monthly.note}
              </span>
            </div>
            {/* Yearly — the better-value option, accented. */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-500/40 bg-gradient-to-r from-blue-500/[0.10] to-sky-400/[0.12] px-3.5 py-2.5 ring-1 ring-blue-500/15">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  {plan.billing.yearly.price}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {plan.billing.yearly.cadence}
                </span>
                {plan.billing.yearly.badge && (
                  <span className="ml-1 inline-flex items-center rounded-full border border-blue-500/35 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-700">
                    {plan.billing.yearly.badge}
                  </span>
                )}
              </div>
              <span className="text-right text-[12px] font-semibold text-blue-800">
                {plan.billing.yearly.note}
              </span>
            </div>
          </div>
        </div>
      )}

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
    <section id="faq" className="scroll-mt-20 border-y border-border bg-secondary/30 py-12 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Questions, answered
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to know before you <span className="gs-gradient-text">go live</span>
          </h2>
          <p className="mt-4 text-pretty text-foreground/80">
            The real questions chapter officers ask — security, compliance, fees, and getting
            started. Still curious? Your first month is free — launch and see it yourself.
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
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:bg-blue-500/[0.04] hover:text-blue-700 active:bg-blue-500/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-6 sm:text-base"
                    >
                      <span>{item.q}</span>
                      <span
                        aria-hidden="true"
                        className={
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/15 to-sky-500/10 ring-1 ring-blue-500/20 transition-transform duration-300 ease-gs-spring motion-reduce:transition-none " +
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
                    <p className="text-sm leading-relaxed text-foreground/80">{item.a}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Soft conversion nudge under the list. Where buyer doubt peaks we
              offer BOTH paths: explore the product free, or talk to a human via
              the existing book-a-call route (/contact#book — same href the other
              "Book a call" CTAs use). Unobtrusive, on-brand, AA-contrast. */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
            <p className="text-sm text-muted-foreground">Still have questions?</p>
            <div className="flex flex-col items-center gap-2.5 sm:flex-row">
              <Button asChild variant="outline" size="sm">
                <Link href="/contact#book" className="group/btn">
                  <IconBookCall className="h-4 w-4 text-blue-700" />
                  Book a 15-min call
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/onboard" className="group/btn">
                  Or start free &amp; explore
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Greek Stack in Practice (Cinematic Looping Video Card Section) ── */
function PracticeShowcase() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-24 bg-secondary/10 border-t border-b border-border/80">
      {/* Background radial wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_10%,rgba(37,99,235,0.04),transparent_60%)]"
      />
      <div className="container max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
          {/* Left Column: Copy */}
          <div className="flex flex-col justify-center pr-0 md:pr-12">
            <span className="text-blue-700 text-xs font-semibold tracking-wider uppercase mb-2">
              Greek Stack in Practice
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6 tracking-tight">
              One central portal. <span className="gs-gradient-text">Automated ops.</span>
            </h2>
            <p className="text-foreground/80 text-base sm:text-lg leading-relaxed mb-8 font-sans font-light">
              Greekstack powers a wide range of use modes for officers, active members, and alumni wanting a safe, rewarding chapter experience. We run the technical plumbing in the background so you can focus on building brotherhood.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="platform" size="lg" className="gs-sheen">
                <Link href="/onboard">
                  Launch free month
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-blue-500/20 text-blue-700 hover:bg-blue-50/50">
                <Link href="/app?demo=true">Try the live demo</Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Cinematic Video Card */}
          <Reveal delay={100} className="relative rounded-3xl overflow-hidden min-h-[500px] shadow-2xl flex flex-col justify-end group">
            {/* Background Video */}
            <FadingVideo
              src="/brand/gen/gs-showcase-operations.mp4"
              // Static first-frame poster (extracted from the clip itself) so the
              // card paints a real branded frame instantly instead of an empty box
              // while the multi-MB clip streams — and it's the full fallback under
              // prefers-reduced-motion (no autoplaying loop).
              poster="/brand/gen/gs-showcase-operations-poster.jpg"
              className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Overlay Gradient for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none z-10" />
            
            {/* Overlay Content */}
            <div className="relative z-20 p-8 sm:p-10 flex flex-col items-start text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-3 backdrop-blur-sm">
                Chapter Communications
              </span>
              <h3 className="text-white text-3xl font-bold leading-tight mb-3 tracking-tight">
                Automated SMS & Roster Sync
              </h3>
              <p className="text-white/80 text-sm sm:text-base max-w-md mb-6 leading-relaxed">
                Send event notices, study alerts, and double-opt-in rush schedules automatically. Roster updates synchronize permissions in real time.
              </p>
              <Link
                href="/app?demo=true"
                className="inline-flex items-center gap-3 text-white font-semibold hover:text-blue-200 transition-colors group/link"
              >
                <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center transition-colors group-hover/link:bg-white group-hover/link:text-slate-900 text-white">
                  <IconArrowRight className="w-4 h-4" />
                </span>
                See it in action
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Proof ───────────────────────────── */

function Proof() {
  return (
    <section id="proof" className="relative scroll-mt-20 overflow-hidden py-12 sm:py-28">
      {/* Faint masked grid band behind the stat tiles for quiet depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            What you get
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built to make officers&apos; lives easier
          </h2>
          <p className="mt-4 text-pretty text-foreground/80">
            No setup fee, no per-seat math, no contracts — here&apos;s what every chapter starts with.
          </p>
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
                  {typeof s.value === "number" ? (
                    <AnimatedCounter
                      value={s.value}
                      prefix={s.prefix}
                      suffix={s.suffix}
                      decimals={s.decimals}
                    />
                  ) : (
                    s.display
                  )}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.label}</p>
              </div>
            </Reveal3DItem>
          ))}
        </Reveal3D>

        {/* HONEST founder-led trust block (replaces the fabricated "what officers
            tell us" testimonial — there are no real customer quotes yet, so we
            lead with the founder directly instead of inventing social proof).
            Round-9 craft pass: editorial pull-quote treatment in the shared
            card language — glass surface, lit top seam, mirrored corner
            blooms, grain, an oversized serif open-quote, the quote itself in
            the serif identity face, and the gold Greek-key divider standing in
            for a signature rule. The old version (flat gradient card + a
            centered icon chip) read templated next to the rest of the page. */}
        <Reveal delay={120} className="mx-auto mt-14 max-w-3xl">
          <figure className="gs-glass relative overflow-hidden rounded-3xl p-8 text-center sm:p-12">
            {/* always-lit top seam — shared card language */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-sky-400/70 to-amber-400/0"
            />
            {/* mirrored corner blooms — blue in, gold out */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-14 -top-14 h-36 w-36 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-14 -right-14 h-36 w-36 rounded-full bg-gradient-to-tl from-amber-400/10 to-blue-500/10"
            />
            <Grain opacity={0.04} />
            {/* Oversized serif open-quote — the editorial cue that this is a
                voice, not a feature card. Decorative, faint, behind the text. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1 select-none font-serif text-[7rem] font-black leading-none text-blue-600/10 sm:left-6 sm:text-[9rem]"
            >
              &ldquo;
            </span>
            <span className="relative text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              A note from the founder
            </span>
            <blockquote className="relative mx-auto mt-4 max-w-2xl text-pretty font-serif text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
              &ldquo;I built Greekstack because I got tired of running rush out of a spreadsheet and a
              group chat. It&apos;s new, and I&apos;d rather earn your chapter than fake a wall of logos.
              Talk to me directly before you commit — I&apos;ll show you exactly how it&apos;d work for you.&rdquo;
            </blockquote>
            {/* Gold meander rule — the signature line. */}
            <GreekKey className="relative mx-auto mt-6" width="w-24" gold />
            <figcaption className="relative mt-4 text-sm text-foreground/80">
              <span className="font-semibold text-foreground">Greekstack</span> · Founder &amp; chapter alum
            </figcaption>
            <div className="relative mt-7 flex flex-col items-center justify-center gap-3">
              <Magnetic>
                <Button asChild variant="platform" size="lg" className="gs-sheen">
                  <Link href="/contact" className="group/btn">
                    <IconTalkToSales className="h-5 w-5" />
                    Talk to the founder
                    <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                  </Link>
                </Button>
              </Magnetic>
              {/* "Earn it, don't claim it" — the demo IS the proof, keep it one tap away. */}
              <Link
                href="/app?demo=true"
                className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-blue-700"
              >
                Or judge the product yourself — open the demo
                <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
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
          <Reveal className="relative z-10 px-6 py-12 text-center sm:px-12 sm:py-20">
            <div className="mx-auto mb-5 flex justify-center">
              <span className="animate-float">
                <IconChip icon={IconLaunch} tone="platform" size="lg" />
              </span>
            </div>
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Launch your chapter on <span className="gs-gradient-text">Greekstack</span> today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-foreground/80">
              Spin up a fully-branded recruitment and management site the same day. No setup fee, no
              developer, cancel anytime.
            </p>
            {/* Equal-width CTA pair — same grid system as the hero pair: both
                buttons share one rendered width at every viewport. */}
            <div className="mx-auto mt-9 grid w-full max-w-[22rem] grid-cols-1 gap-3 md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
              <Magnetic strength={22} className="w-full">
                <ShimmerBorder rounded="rounded-xl" className="w-full">
                  <Button asChild variant="platform" size="xl" className="gs-sheen cta-shine w-full max-[400px]:px-5">
                    <Link href="/onboard" className="group/btn">
                      Launch your chapter — free
                      <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </ShimmerBorder>
              </Magnetic>
              {/* Crisp white/blue glass — explicit fill so the translucent
                  button can never pick up an off-brand tint from whatever
                  drifts behind it (owner round-9: it read cream/beige). */}
              <Button
                asChild
                variant="glass"
                size="xl"
                className="w-full max-[400px]:px-5 border-blue-200/80 bg-white/70 font-semibold text-blue-800 hover:border-blue-300/80 hover:bg-white/85 hover:text-blue-900"
              >
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

/* A real, multi-column footer (Product / Company / Legal / Contact) replacing
   the old thin single-row strip. Each column is a labelled <nav> for a11y. The
   Contact column carries a real mailto + the compliance/security story, and the
   bottom bar carries the legal line. The "Operator console" /platform/login link
   was REMOVED from this public footer per the brief — operators reach it directly,
   it shouldn't sit on the marketing storefront. */
const FOOTER_COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/app?demo=true", label: "Interactive demo" },
      { href: "#how", label: "How it works" },
      { href: "#features", label: "Features" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "#proof", label: "Why Greekstack" },
      { href: "/contact", label: "Contact" },
      { href: "/support", label: "Support" },
      { href: "/contact#book", label: "Book a call" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

function SiteFooter() {
  // z-10 keeps the footer (translucent bg + text) ABOVE the z-1 letter
  // field — letters must never drift over text (owner round-8 z-stack).
  return (
    <footer className="relative z-10 border-t border-border bg-secondary/30">
      {/* Greek-key (meander) hairline band riding the very top of the footer —
          the second (and final) tasteful placement of the motif, so the page
          closes on the same "Greek life" cue it opened the feature section with.
          Full-bleed + faint + decorative. */}
      <GreekKey
        className="absolute inset-x-0 top-0 mx-auto max-w-5xl"
        width="w-full"
        faint
      />
      <div className="container py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand + one-line pitch + primary CTA. */}
          <div className="space-y-4">
            <Link href="/" className="group inline-flex items-center" aria-label="Greekstack home">
              <GreekstackWordmark
                size="sm"
                markClassName="h-7 w-7 transition-transform duration-300 ease-gs-spring group-hover:rotate-[-6deg]"
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-foreground/80">
              The white-label platform that runs your chapter&apos;s recruitment, dues, events, and
              alumni giving on one branded site.
            </p>
            <Button asChild variant="platform" size="sm" className="gs-sheen">
              <Link href="/onboard" className="group/btn">
                Launch your chapter — free
                <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          {/* Link columns. */}
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading} className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {col.heading}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="link-underline text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact + compliance/security story. */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Contact
            </h3>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="mailto:bensachwitz@gmail.com"
                  className="link-underline text-sm font-medium text-foreground/90 transition-colors hover:text-foreground"
                >
                  bensachwitz@gmail.com
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="link-underline text-sm text-foreground/80 transition-colors hover:text-foreground"
                >
                  Talk to the founder
                </Link>
              </li>
            </ul>
            <p className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-foreground/80">
              <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <span>
                Tenant-isolated data, Stripe-powered payouts, and TCPA / A2P 10DLC-compliant SMS.{" "}
                <Link href="/contact" className="font-semibold text-blue-700 underline-offset-4 hover:underline">
                  Ask about security
                </Link>
                .
              </span>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Greekstack. The white-label Greek-life platform.</p>
          <p>Built for fraternities &amp; sororities — IFC · Panhellenic · NPHC.</p>
        </div>
      </div>
    </footer>
  );
}
