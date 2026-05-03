import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal, Crest } from "@/components/brand/wordmark";
import { Scene } from "@/components/brand/scene";
import { InstagramFeed } from "@/components/site/instagram-feed";
import { StickyCTA } from "@/components/site/sticky-cta";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Users, Trophy, Heart,
  GraduationCap, Sparkles, Quote, Star, Calendar,
  MapPin, Award, Zap, Music, BookOpen, HandHeart,
  Instagram, Mail, Phone, Building2, Flame, Crown,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const VALUES = [
  { icon: Users, title: "Brotherhood", body: "Lifelong friendships built on mutual respect and showing up for each other." },
  { icon: GraduationCap, title: "Scholarship", body: "3.4 chapter GPA. Study halls, mentorship, alumni network across every field." },
  { icon: Heart, title: "Character", body: "We measure men by what they do — service, integrity, courage in conviction." },
];

const USC_FACTS = [
  { value: "60+", label: "Active brothers", icon: Users },
  { value: "3.45", label: "Chapter GPA", icon: GraduationCap, sub: "3.50 NM GPA" },
  { value: "150+", label: "Years strong", icon: ShieldCheck, sub: "Founded 1873" },
  { value: "$25k+", label: "Raised for charity", icon: HandHeart, sub: "2025 alone" },
];

const TIMELINE = [
  { week: "Week 1", title: "Open events", body: "Cookouts, tailgates, low-pressure hangs at the house." },
  { week: "Week 2", title: "Brotherhood", body: "Smaller events. Get to know individual brothers." },
  { week: "Week 3", title: "Invite-only", body: "Formal dinners and one-on-ones with the e-board." },
  { week: "Week 4", title: "Bid Night", body: "Bids extended. Welcome ceremony for new members." },
];

const HIGHLIGHTS = [
  { icon: HandHeart, label: "Special Olympics SC partners" },
  { icon: Trophy, label: "Polar Plunge fundraisers" },
  { icon: Building2, label: "On-campus chapter house" },
  { icon: GraduationCap, label: "3.45 Chapter GPA" },
  { icon: Flame, label: "Annual paintball + NOLA formal" },
  { icon: Star, label: "#DamnProud" },
];

const RECENT = [
  { tag: "Philanthropy", title: "Polar Plunge raised $700 for Special Olympics SC", icon: HandHeart },
  { tag: "Brotherhood", title: "Annual paintball at Trigger Tyme before finals", icon: Trophy },
  { tag: "Formals", title: "Spring formal in New Orleans — #BeignetsWithTheBoys", icon: Award },
  { tag: "Service", title: "Cantina 76 percent night for Leukemia & Lymphoma Society", icon: Heart },
];

const EBOARD = [
  { name: "Mark Laughery", role: "President" },
  { name: "Jake Benoudiz", role: "Vice President" },
  { name: "Mitchell West", role: "Secretary" },
  { name: "Charlie Moore", role: "Treasurer" },
  { name: "Joshua Barteet", role: "Sentinel" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Background photo from chapter Instagram (proxied) */}
        <div className="absolute inset-0 -z-30">
          <img
            src="/api/photo/DRzyoVciZCh"
            alt=""
            className="w-full h-full object-cover object-top opacity-60 lg:opacity-50"
          />
        </div>
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white/90 via-white/75 to-white/40" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/85 to-white/0 lg:to-white/10" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-dot-grid opacity-30" aria-hidden />
        <div className="absolute -right-16 -top-8 -z-10 hidden lg:block opacity-95 animate-float">
          <Seal className="w-[480px] h-[480px]" />
        </div>
        <div className="absolute right-[18%] top-[12%] -z-10 hidden md:block animate-float [animation-delay:1s] opacity-15">
          <span className="text-[160px] font-serif font-bold text-phisig-red leading-none">Φ</span>
        </div>

        <div className="container py-14 sm:py-20 lg:py-28">
          <div className="max-w-2xl animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-white/90 backdrop-blur px-3 py-1 text-xs font-medium text-phisig-red shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-phisig-red animate-pulse" />
              Rush Spring 2026 — Now Open
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02]">
              The chapter that built<br className="hidden sm:block" />
              the men of <span className="text-phisig-red">Carolina</span>.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
              Phi Sigma Kappa, Gamma Triton at the University of South Carolina.
              Sixty-second sign-up — three questions, that's it.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="group shadow-lg shadow-phisig-red/25 animate-glow">
                <Link href="#register">
                  Register for rush
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#schedule">View schedule</Link>
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> 800 Lincoln St, Columbia SC
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Reply within 24h
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Gamma Triton chapter
              </span>
              <Link
                href="https://www.instagram.com/phisig_usc/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-phisig-red hover:underline"
              >
                <Instagram className="h-3.5 w-3.5" /> @phisig_usc
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="relative bg-phisig-red text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
        <div className="absolute -right-20 -top-20 opacity-10">
          <Seal className="w-[300px] h-[300px] text-white" />
        </div>
        <div className="relative container py-8 sm:py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 stagger">
          {USC_FACTS.map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight leading-none">{s.value}</div>
                <div className="mt-1 text-xs opacity-85">{s.label}</div>
                {s.sub && <div className="text-[10px] opacity-65 mt-0.5">{s.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HIGHLIGHTS BANNER ─── */}
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

      {/* ─── VALUES ─── */}
      <section className="container py-14 sm:py-18">
        <div className="max-w-2xl mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <ShieldCheck className="h-3 w-3" /> Three principles
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
            Brotherhood. Scholarship. Character.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 stagger">
          {VALUES.map((v, i) => (
            <div key={v.title} className="lift rounded-2xl border border-border bg-card p-6 relative overflow-hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-phisig-red text-white shadow-md shadow-phisig-red/20">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              <span className="absolute top-5 right-6 font-serif text-5xl font-bold text-phisig-red opacity-10 leading-none select-none">
                {["Φ", "Σ", "Κ"][i]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── REGISTER ─── */}
      <section id="register" className="bg-phisig-mist border-y border-border scroll-mt-20">
        <div className="container py-14 sm:py-20">
          <div className="max-w-2xl mx-auto text-center mb-8 animate-slide-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Sparkles className="h-3 w-3" /> Step into the chapter
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">Register</h2>
            <p className="mt-2 text-muted-foreground">
              Three steps. Sixty seconds. Brothers fill in the rest from your social profiles.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <RushForm />
          </div>
        </div>
      </section>

      {/* ─── INSTAGRAM FEED — real photos from @phisig_usc ─── */}
      <section className="container py-14 sm:py-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Instagram className="h-3 w-3" /> @phisig_usc
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">A year in the life.</h2>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Polar Plunge for Special Olympics, paintball before finals, formal in New Orleans,
            tailgates at Williams-Brice. The Gamma Triton chapter shows up — all year.{" "}
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

      {/* ─── HOW RUSH WORKS ─── */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container py-14 sm:py-18">
          <div className="max-w-2xl mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Calendar className="h-3 w-3" /> How rush works
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
              Four weeks. Zero pressure.
            </h2>
            <p className="mt-2 text-muted-foreground max-w-xl">
              We're not interested in hazing or hoops. We're interested in finding the right men.
            </p>
          </div>
          <ol className="grid md:grid-cols-4 gap-3 sm:gap-4 stagger">
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

      {/* ─── SCHEDULE ─── */}
      <section id="schedule" className="container py-14 sm:py-20 scroll-mt-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Calendar className="h-3 w-3" /> Rush calendar
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">Upcoming events</h2>
          </div>
          <p className="text-muted-foreground max-w-xl">
            All public events. Private events go out by text and email after you register.
          </p>
        </div>
        <div className="max-w-3xl">
          <ScheduleList />
        </div>
      </section>

      {/* ─── TESTIMONIAL + ABOUT (combined for density) ─── */}
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

      {/* ─── 2026 EXECUTIVE BOARD ─── */}
      <section className="border-t border-border">
        <div className="container py-14 sm:py-18">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
                <Crown className="h-3 w-3" /> 2026 leadership
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
                Meet the e-board.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xl">
              The Gamma Triton chapter elects its leadership annually. These are the brothers
              running the show in 2026 — happy to talk to any rush who wants to learn more.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 stagger">
            {EBOARD.map((m) => (
              <div
                key={m.name}
                className="relative rounded-2xl border border-border bg-card p-5 lift overflow-hidden"
              >
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white flex items-center justify-center text-base font-semibold shadow-md shadow-phisig-red/20">
                  {m.name.split(" ").map((s) => s[0]).join("")}
                </div>
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-phisig-red font-semibold">
                    {m.role}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{m.name}</p>
                </div>
                <span className="absolute -bottom-3 -right-3 font-serif text-5xl font-bold text-phisig-red opacity-10 leading-none select-none">
                  ΦΣΚ
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              Phi Sigma Kappa was founded at Massachusetts Agricultural College on three
              cardinal principles. The Gamma Triton chapter at the University of South
              Carolina carries that legacy forward — building men who lead in the
              classroom, the community, and beyond.
            </p>

            <ul className="mt-6 space-y-2.5 stagger">
              {[
                "Top-tier academic support and mentorship",
                "Year-round philanthropy with The Special Olympics",
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
              <ContactPill icon={MapPin} label="800 Lincoln St" sub="Columbia, SC" />
              <ContactPill icon={Mail} label="rush@phisig-usc.com" sub="Rush questions" />
              <ContactPill icon={Instagram} label="@phisig_usc" sub="Daily chapter life" />
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden border border-border bg-gradient-to-b from-phisig-red-soft to-white flex items-center justify-center tilt">
              <Seal className="w-[78%] h-[78%]" />
            </div>
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

      {/* ─── FINAL CTA ─── */}
      <section className="container pb-16 sm:pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-phisig-red via-phisig-red-dark to-[#7a0a1f] text-white p-10 sm:p-16 relative overflow-hidden shadow-2xl shadow-phisig-red/20">
          <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
          <div className="absolute -right-12 -bottom-12 opacity-15">
            <Seal className="w-[420px] h-[420px] text-white" />
          </div>
          <div className="absolute right-[8%] top-[12%] opacity-10 hidden sm:block">
            <span className="text-[120px] font-serif font-bold text-white leading-none">ΦΣΚ</span>
          </div>
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/90">
              <Sparkles className="h-3 w-3" /> Spring 2026 rush
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
              Take the first step.
            </h2>
            <p className="mt-3 text-white/85 max-w-md text-base sm:text-lg">
              Three questions. Sixty seconds. The brotherhood is waiting.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="group">
                <Link href="#register">
                  Register now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white bg-white/5 hover:bg-white/15 hover:text-white">
                <Link href="https://www.instagram.com/phisig_usc/" target="_blank">
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
