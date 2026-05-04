import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal, Crest } from "@/components/brand/wordmark";
import { Scene } from "@/components/brand/scene";
import { InstagramFeed } from "@/components/site/instagram-feed";
import { StickyCTA } from "@/components/site/sticky-cta";
import { Reveal, CountUp } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { getSiteConfig } from "@/lib/site-config";
import {
  ArrowRight, ShieldCheck, Users, Trophy, Heart,
  GraduationCap, Sparkles, Quote, Star, Calendar,
  MapPin, Award, Zap, Music, BookOpen, HandHeart,
  Instagram, Mail, Phone, Building2, Flame, Crown,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const VALUES = [
  { icon: Users, title: "Brotherhood", body: "Lifelong friendships built on mutual respect and showing up for each other." },
  { icon: GraduationCap, title: "Scholarship", body: "Study halls, mentorship, and an alumni network across every field. Chapter GPA above the all-fraternity average." },
  { icon: Heart, title: "Character", body: "We measure men by what they do — service, integrity, and courage in conviction." },
];

const TIMELINE = [
  { week: "Week 1", title: "Open events", body: "Cookouts, brotherhood events, low-pressure hangs at the house. Show up — no commitment, no application." },
  { week: "Week 2", title: "Closed events", body: "Invite-only smaller events. Spend more time with individual brothers and start to feel out the fit." },
  { week: "Week 3", title: "Interviews & Bid Day", body: "One-on-ones with the e-board, then bids extended. Welcome ceremony for new members." },
];

const FAQ = [
  {
    q: "Do I need to be a freshman?",
    a: "Nope. We rush freshmen, sophomores, juniors, and transfers. If you're at USC and looking for a brotherhood, we want to meet you.",
  },
  {
    q: "Is there a GPA requirement?",
    a: "We expect a minimum 2.5 to receive a bid. Our chapter average is well above that — scholarship is one of our three cardinal principles.",
  },
  {
    q: "How much does it cost?",
    a: "Dues cover house fees, philanthropy, formals, and chapter operations. We'll walk you through every line item before you accept a bid — no surprises.",
  },
  {
    q: "Is there hazing?",
    a: "Zero. Phi Sigma Kappa nationally and our chapter take a hard line against hazing. New-member education is built around brotherhood, history, and leadership development. Concerns can be reported anonymously to our chapter advisor or to Phi Sigma Kappa national HQ.",
  },
  {
    q: "What's the time commitment?",
    a: "About 4–6 hours/week of required programming during the semester (chapter meeting, study hall, occasional service). The rest is optional — go as hard or as easy as you want.",
  },
  {
    q: "Can I rush if I'm already in another organization?",
    a: "Yes — we have brothers on the rugby team, in the business school, in honors college, in ROTC. Phi Sig adds to your USC experience, it doesn't replace it.",
  },
];

const HIGHLIGHTS = [
  { icon: HandHeart, label: "Special Olympics SC partners" },
  { icon: Trophy, label: "Polar Plunge fundraisers" },
  { icon: Building2, label: "On-campus chapter house" },
  { icon: GraduationCap, label: "Above-average chapter GPA" },
  { icon: Flame, label: "Brotherhood events year-round" },
  { icon: Star, label: "#DamnProud" },
];

const RECENT = [
  { tag: "Philanthropy", title: "Polar Plunge raised $700 for Special Olympics SC", icon: HandHeart },
  { tag: "Brotherhood", title: "Annual paintball at Trigger Tyme before finals", icon: Trophy },
  { tag: "Formals", title: "Chapter formal — third-party vendor, sober transportation", icon: Award },
  { tag: "Service", title: "Dry fundraiser dinner for Leukemia & Lymphoma Society", icon: Heart },
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

export default async function Home({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const cfg = await getSiteConfig();
  const boothParam = searchParams?.booth;
  const booth = (Array.isArray(boothParam) ? boothParam[0] : boothParam) === "1";

  // Booth mode = single-purpose tablet kiosk. Render only the rush form.
  // No hero, no marketing sections, no Instagram feed, no footer chrome — every
  // pixel below the form is a distraction at a 30-second walk-up on bumpy 4G.
  if (booth) {
    return (
      <main className="min-h-screen bg-phisig-mist">
        <PublicNav booth />
        <section className="container py-6 sm:py-10">
          <div className="max-w-2xl mx-auto text-center mb-6 animate-slide-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Sparkles className="h-3 w-3" /> Phi Sigma Kappa at USC · Booth
            </span>
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
    { ...parseStat(cfg["stats.brothers"]), label: "Active brothers", icon: Users },
    { ...parseStat(cfg["stats.gpa"]), label: "Chapter GPA", icon: GraduationCap, sub: "Above the all-fraternity average" },
    { ...parseStat(cfg["stats.years"]), label: "Years strong", icon: ShieldCheck, sub: "Founded 1873" },
    { ...parseStat(cfg["stats.charity"]), label: "Raised for charity", icon: HandHeart, sub: cfg["philanthropy.beneficiaryShort"] },
  ];
  const eboard = [1, 2, 3, 4, 5]
    .map((n) => ({
      name: cfg[`eboard.${n}.name`] || "",
      role: cfg[`eboard.${n}.role`] || "",
      headshotUrl: cfg[`eboard.${n}.headshotUrl`] || "",
    }))
    .filter((m) => m.name && m.role);

  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-30 bg-gradient-to-br from-phisig-red-soft via-white to-phisig-red-soft/40" aria-hidden />
        <div className="absolute inset-0 -z-20 bg-dot-grid opacity-30" aria-hidden />
        <div className="absolute right-[6%] top-[6%] -z-10 hidden md:block animate-float [animation-delay:1s] opacity-[0.07] select-none pointer-events-none">
          <Crest className="h-[280px] w-[280px] text-phisig-red" />
        </div>

        <div className="container py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
            <div className="max-w-2xl animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-white/95 backdrop-blur px-3 py-1 text-xs font-medium text-phisig-red shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-phisig-red animate-pulse" />
              {cfg["hero.eyebrow"]}
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] [text-wrap:balance]">
              {cfg["hero.h1.lead"]}{" "}<br className="hidden sm:block" />
              {cfg["hero.h1.tail"]}{" "}<span className="text-phisig-red">{cfg["hero.h1.highlight"]}</span>.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
              {cfg["hero.subline"]}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="group shadow-lg shadow-phisig-red/25 animate-glow">
                <Link href={cfg["hero.cta.href"] || "#register"}>
                  {cfg["hero.cta.label"] || "Get on the interest list"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#about">About the chapter</Link>
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {cfg["contact.address"]}, {cfg["contact.cityState"]}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Reply within 24h
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Gamma Triton chapter
              </span>
              <Link
                href={cfg["contact.instagramUrl"]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-phisig-red hover:underline"
              >
                <Instagram className="h-3.5 w-3.5" /> {cfg["contact.instagramHandle"]}
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
              <div className="absolute -right-4 -top-4 hidden lg:flex h-20 w-20 items-center justify-center rounded-full bg-phisig-red text-white shadow-xl shadow-phisig-red/30 z-10 pointer-events-none">
                <span className="text-center leading-tight">
                  <span className="block text-[9px] uppercase tracking-[0.16em] opacity-80">Since</span>
                  <span className="block text-base font-semibold">1873</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      {cfg["show.statsStrip"] !== "false" && (
      <section className="relative bg-phisig-red text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
        <div className="absolute -right-20 -top-20 opacity-10">
          <Seal className="w-[300px] h-[300px] text-white" />
        </div>
        <div className="relative container py-10 sm:py-14 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="flex items-center gap-4">
              <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0">
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
      <section className="border-b border-border bg-secondary/30 overflow-hidden">
        <div className="container py-4 flex flex-wrap items-center gap-x-8 gap-y-2 justify-center text-xs sm:text-sm text-muted-foreground">
          {HIGHLIGHTS.map((h, i) => (
            <span key={h.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <h.icon className="h-3.5 w-3.5 text-phisig-red" />
              <span>{h.label}</span>
              {i < HIGHLIGHTS.length - 1 && <span className="hidden sm:inline opacity-30 ml-2">·</span>}
            </span>
          ))}
        </div>
      </section>
      )}

      {/* ─── VALUES ─── */}
      {cfg["show.values"] !== "false" && (
      <section className="container py-14 sm:py-18">
        <div className="max-w-2xl mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <ShieldCheck className="h-3 w-3" /> Three principles
          </span>
          <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
            Brotherhood. Scholarship. Character.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 stagger">
          {VALUES.map((v) => (
            <div key={v.title} className="lift rounded-2xl border border-border bg-card p-6 relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-gradient-to-br from-phisig-red-soft/60 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-lg shadow-phisig-red/25">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="relative mt-5 text-xl font-semibold tracking-tight">{v.title}</h3>
              <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              <Crest className="absolute -bottom-4 -right-4 h-20 w-20 text-phisig-red opacity-[0.08]" />
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ─── REGISTER ─── */}
      <section id="register" className="bg-phisig-mist border-y border-border scroll-mt-20">
        <div className="container py-14 sm:py-20">
          <div className="max-w-2xl mx-auto text-center mb-8 animate-slide-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Sparkles className="h-3 w-3" /> Get on the list
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">Register your interest</h2>
            <p className="mt-2 text-muted-foreground">
              Three steps. Sixty seconds. The Fall '26 rush schedule drops in August —
              we'll text and email everyone on this list the moment it's live.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <RushForm />
          </div>
        </div>
      </section>

      {/* ─── INSTAGRAM FEED — real photos from @phisig_usc ─── */}
      {cfg["show.instagramFeed"] !== "false" && (
      <section className="container py-14 sm:py-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Instagram className="h-3 w-3" /> @phisig_usc
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">A year in the life.</h2>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Polar Plunge for Special Olympics, paintball before finals, the chapter formal
            (FIPG-compliant, third-party vendor, sober transportation), and dry tailgates at
            Williams-Brice. The Gamma Triton chapter shows up — all year.{" "}
            <span className="text-phisig-red font-medium">#DamnProud</span>
          </p>
        </div>
        <InstagramFeed count={9} />

        {/* Recent activity strip */}
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RECENT.map((r) => (
            <div key={r.title} className="rounded-xl border border-border bg-card p-4 lift">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                <r.icon className="h-3 w-3" /> {r.tag}
              </div>
              <p className="mt-2 text-sm font-medium leading-snug">{r.title}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="https://www.instagram.com/phisig_usc/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
          >
            <Instagram className="h-4 w-4" /> Follow @phisig_usc for the latest
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
      )}

      {/* ─── HOW RUSH WORKS ─── */}
      {cfg["show.timeline"] !== "false" && (
      <section className="border-y border-border bg-secondary/40">
        <div className="container py-14 sm:py-18">
          <div className="max-w-2xl mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Calendar className="h-3 w-3" /> How rush works
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
              Three weeks. Zero pressure.
            </h2>
            <p className="mt-2 text-muted-foreground max-w-xl">
              We're not interested in hazing or hoops. We're interested in finding the right men.
            </p>
          </div>
          <ol className="grid md:grid-cols-3 gap-3 sm:gap-4 stagger">
            {TIMELINE.map((t, i) => (
              <li
                key={t.week}
                className="relative rounded-xl border border-border bg-card p-5 lift"
              >
                <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  {t.week}
                </span>
                <h3 className="mt-1.5 text-base font-semibold">{t.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
                <span className="absolute top-4 right-5 text-2xl font-semibold text-phisig-red opacity-15">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < TIMELINE.length - 1 && (
                  <span className="hidden md:block absolute top-1/2 -right-2.5 h-0.5 w-5 bg-phisig-red/30" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
      )}

      {/* ─── SCHEDULE ─── */}
      <section id="schedule" className="container py-14 sm:py-20 scroll-mt-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Calendar className="h-3 w-3" /> Fall '26 calendar
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
              Upcoming events
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Full Fall '26 rush schedule drops in August. Get on the interest list above —
            we'll text everyone the second it's live. Private events go out by invitation only.
          </p>
        </div>
        <div className="max-w-3xl">
          <ScheduleList />
        </div>
      </section>

      {/* ─── TESTIMONIAL + ABOUT (combined for density) ─── */}
      {cfg["show.testimonial"] !== "false" && (
      <section className="border-t border-border bg-gradient-to-b from-phisig-red-soft/40 via-background to-background">
        <div className="container py-14 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-slide-up">
              <Quote className="h-8 w-8 text-phisig-red mb-3" />
              <blockquote className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                "Phi Sig isn't a four-year decision — it's a forty-year one. The brothers
                I met during rush are the same guys standing next to me at every wedding,
                every promotion, every milestone."
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-phisig-red text-white flex items-center justify-center font-semibold text-sm">
                  AM
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className="h-3 w-3 fill-phisig-red text-phisig-red" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-foreground font-medium">A. Mitchell '22</span> · Gamma Triton alumnus, finance
                  </p>
                </div>
              </div>
            </div>
            <Scene theme="tradition" size="tall" caption="Founded 1873. Gamma Triton at USC since 1975." />
          </div>
        </div>
      </section>
      )}

      {/* ─── BROTHER SPOTLIGHT ─── */}
      {cfg["show.spotlight"] !== "false" && (
      <section className="container py-14 sm:py-18">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Star className="h-3 w-3" /> Brother of the Month
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
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
                  <CheckCircle2 className="h-4 w-4 text-phisig-red shrink-0 mt-0.5" />
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
              rel="noreferrer"
              className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-border bg-secondary lift shadow-xl shadow-phisig-red/10 block"
            >
              <img
                src={/^https?:\/\//.test(cfg["spotlight.slug"]) ? cfg["spotlight.slug"] : `/api/photo/${cfg["spotlight.slug"]}?v=3`}
                alt={`Brother of the Month — ${cfg["spotlight.name"]}`}
                width={640}
                height={800}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                  <Star className="h-3 w-3" /> {cfg["spotlight.month"]} · Brother of the Month
                </span>
                <p className="mt-2 text-white text-xl font-semibold tracking-tight">
                  {cfg["spotlight.name"]}
                </p>
                <p className="text-white/80 text-xs">
                  {cfg["spotlight.role"]}
                </p>
              </div>
            </a>
            <div className="absolute -top-3 -left-3 hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/30 rotate-[-6deg] pointer-events-none">
              <Star className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ─── EXECUTIVE BOARD ─── */}
      {cfg["show.eboard"] !== "false" && eboard.length > 0 && (
      <section className="border-t border-border">
        <div className="container py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
                <Crown className="h-3 w-3" /> Chapter leadership
              </span>
              <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
                Meet the e-board.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xl">
              The Gamma Triton chapter elects its leadership annually. These are the brothers
              running the show — happy to talk to any rush who wants to learn more.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 stagger">
            {eboard.map((m) => (
              <div
                key={m.name}
                className="relative rounded-2xl border border-border bg-card p-5 lift overflow-hidden"
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
                <Crest className="absolute -bottom-3 -right-3 h-16 w-16 text-phisig-red opacity-10" />
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ─── ABOUT THE CHAPTER ─── */}
      <section id="about" className="container py-14 sm:py-20 scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <ShieldCheck className="h-3 w-3" /> About the chapter
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
              Founded in 1873.<br/> Built for what's next.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Phi Sigma Kappa was founded at Massachusetts Agricultural College in 1873 on three
              cardinal principles: Brotherhood, Scholarship, and Character. The Gamma Triton chapter
              chartered at the University of South Carolina in 1975 and has built USC men around those
              same principles for fifty years — leaders in the classroom, in the community, and beyond.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Parents and prospective members:{" "}
              <span className="font-medium text-foreground">{cfg["contact.advisorName"]}</span>
              {cfg["contact.advisorTitle"] && (<>, {cfg["contact.advisorTitle"]}</>)} —{" "}
              <a href={`mailto:${cfg["contact.advisorEmail"]}`} className="text-phisig-red hover:underline font-medium">
                {cfg["contact.advisorEmail"]}
              </a>{cfg["contact.rushPhone"] && (
                <>{" "}· <a href={`tel:${cfg["contact.rushPhone"].replace(/[^\d+]/g, "")}`} className="text-phisig-red hover:underline font-medium">{cfg["contact.rushPhone"]}</a></>
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

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ContactPill icon={MapPin} label={cfg["contact.address"]} sub={cfg["contact.cityState"]} />
              <ContactPill icon={Mail} label={cfg["contact.rushEmail"]} sub="Rush questions" />
              <ContactPill icon={Instagram} label={cfg["contact.instagramHandle"]} sub="Daily chapter life" />
            </div>

            <div className="mt-8 rounded-xl border border-phisig-red/20 bg-phisig-red-soft/40 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-phisig-red mt-0.5 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-foreground">Zero-tolerance anti-hazing policy.</p>
                  <p className="mt-1 text-muted-foreground">
                    Phi Sigma Kappa national and the Gamma Triton chapter strictly prohibit hazing in any form. Our new-member education is built around brotherhood, leadership, and chapter history — never humiliation, intimidation, or harm. Concerns can be reported anonymously to <span className="text-foreground font-medium">{cfg["contact.advisorName"]}</span> at <a className="text-phisig-red hover:underline" href={`mailto:${cfg["contact.advisorEmail"]}`}>{cfg["contact.advisorEmail"]}</a>, or via the national anti-hazing hotline{" "}
                    <a className="text-phisig-red hover:underline font-medium" href={cfg["antiHazing.hotlineUrl"]} target="_blank" rel="noreferrer">{cfg["antiHazing.hotline"]}</a>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <a
              href={/^https?:\/\//.test(cfg["about.slug"]) ? cfg["about.slug"] : `https://www.instagram.com/p/${cfg["about.slug"]}/`}
              target="_blank"
              rel="noreferrer"
              className="aspect-[4/5] rounded-3xl overflow-hidden border border-border bg-secondary tilt shadow-xl block relative"
            >
              <img
                src={/^https?:\/\//.test(cfg["about.slug"]) ? cfg["about.slug"] : `/api/photo/${cfg["about.slug"]}?v=3`}
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
                  <Award className="h-3 w-3" /> {cfg["about.caption"] || "Chapter formal"}
                </span>
                <p className="mt-3 text-xl font-semibold tracking-tight leading-snug">
                  Brotherhood you can count on — every weekend, every milestone, every year.
                </p>
                <p className="mt-1 text-xs text-white/80">#DamnProud · {cfg["contact.instagramHandle"] || "@phisig_usc"}</p>
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
        <div className="container py-14 sm:py-20">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
                <Sparkles className="h-3 w-3" /> FAQ
              </span>
              <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
                Common questions.
              </h2>
              <p className="mt-3 text-muted-foreground max-w-md">
                Got something else? DM us on{" "}
                <Link
                  href={cfg["contact.instagramUrl"]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-phisig-red hover:underline font-medium"
                >
                  {cfg["contact.instagramHandle"]}
                </Link>{" "}
                or email{" "}
                <a href={`mailto:${cfg["contact.rushEmail"]}`} className="text-foreground font-medium hover:underline">{cfg["contact.rushEmail"]}</a>.
              </p>
            </div>
            <ul className="space-y-3">
              {FAQ.map((item, i) => (
                <li
                  key={item.q}
                  className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-phisig-red/40 hover:shadow-md"
                >
                  <details className="cursor-pointer">
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 list-none">
                      <span className="text-base font-medium tracking-tight">{item.q}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-phisig-red-soft text-phisig-red shrink-0 transition-transform group-open:rotate-45">
                        <ArrowRight className="h-3.5 w-3.5 -rotate-45 group-open:rotate-0 transition-transform" />
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
      <section className="container py-14 sm:py-18">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <a
            href="https://www.instagram.com/p/DRxIVRXkYCn/"
            target="_blank"
            rel="noreferrer"
            className="relative aspect-[5/4] rounded-3xl overflow-hidden border border-border bg-secondary lift order-2 lg:order-1 block"
          >
            <img
              src="/api/photo/DRxIVRXkYCn?v=3"
              alt="Phi Sigma Kappa brothers on Williams-Brice Stadium game day at the University of South Carolina"
              loading="lazy"
              width={800}
              height={640}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                <MapPin className="h-3 w-3" /> Game day · Williams-Brice
              </span>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                Williams-Brice gameday — dry tailgate, every home game.
              </p>
            </div>
          </a>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <MapPin className="h-3 w-3" /> Where we live
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
              The house at {cfg["contact.address"]}.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The Phi Sigma Kappa chapter house sits on Lincoln Street, a block off Greek Village
              and walking distance to Russell House and the Horseshoe. It's where the cookouts,
              chapter meetings, and Bid Nights happen — and where most rushes meet the chapter
              for the first time.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <Link
                href={cfg["contact.mapsUrl"]}
                target="_blank"
                rel="noreferrer"
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <MapPin className="h-3 w-3" /> Address
                </div>
                <p className="mt-1.5 text-sm font-semibold">{cfg["contact.address"]}</p>
                <p className="text-xs text-muted-foreground">{cfg["contact.cityState"]}</p>
              </Link>
              <Link
                href={cfg["contact.instagramUrl"]}
                target="_blank"
                rel="noreferrer"
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <Instagram className="h-3 w-3" /> Daily updates
                </div>
                <p className="mt-1.5 text-sm font-semibold">{cfg["contact.instagramHandle"]}</p>
                <p className="text-xs text-muted-foreground">Follow for chapter life</p>
              </Link>
              <Link
                href={`mailto:${cfg["contact.rushEmail"]}`}
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <Mail className="h-3 w-3" /> Rush questions
                </div>
                <p className="mt-1.5 text-sm font-semibold">{cfg["contact.rushEmail"]}</p>
                <p className="text-xs text-muted-foreground">We reply within 24h</p>
              </Link>
              <Link
                href="https://sc.edu/about/offices_and_divisions/fraternity_and_sorority_life/chapters/index.php"
                target="_blank"
                rel="noreferrer"
                className="lift rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  <Building2 className="h-3 w-3" /> USC chapter info
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
        <div className="rounded-3xl bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark text-white p-10 sm:p-16 relative overflow-hidden shadow-2xl shadow-phisig-red/20">
          <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
          <div className="absolute -right-12 -bottom-12 opacity-15">
            <Seal className="w-[420px] h-[420px] text-white" />
          </div>
          <div className="absolute right-[8%] top-[12%] opacity-10 hidden sm:block">
            <Crest className="h-32 w-32 text-white" />
          </div>
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/90">
              <Sparkles className="h-3 w-3" /> Fall Rush 2026
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
              Get on the interest list.
            </h2>
            <p className="mt-3 text-white/85 max-w-md text-base sm:text-lg">
              Three questions. Sixty seconds. We'll text the second the schedule drops in August.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="group">
                <Link href={cfg["hero.cta.href"] || "#register"}>
                  Sign me up
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white bg-white/5 hover:bg-white/15 hover:text-white">
                <Link href={cfg["contact.instagramUrl"]} target="_blank">
                  <Instagram className="h-4 w-4" /> Follow us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <StickyCTA />
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

function ContactPill({
  icon: Icon, label, sub,
}: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 lift">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-phisig-red shrink-0" />
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
  const imgSrc = isUrl ? slug : `/api/photo/${slug}?v=3`;
  const linkHref = isUrl ? slug : `https://www.instagram.com/p/${slug}/`;
  return (
    <a
      href={linkHref}
      target="_blank"
      rel="noreferrer"
      aria-label={`View ${caption} on Instagram`}
      className={`group relative rounded-2xl overflow-hidden border border-border lift block ${className ?? ""}`}
    >
      {/* Fallback layer — cardinal gradient with chapter crest, visible until image loads */}
      <div className="absolute inset-0 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark flex items-center justify-center pointer-events-none">
        <Crest className="h-20 w-20 text-white/25" />
      </div>
      <img
        src={imgSrc}
        alt={`Phi Sigma Kappa Gamma Triton chapter at USC — ${caption}`}
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        // @ts-expect-error: fetchPriority is a valid HTML attribute, types still catching up.
        fetchpriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className="relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-20" />
      <span className="absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
        <Icon className="h-3 w-3" /> {caption}
      </span>
    </a>
  );
}
