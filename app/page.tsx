import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal, Crest } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Users, Trophy, Heart,
  GraduationCap, Sparkles, Quote, Star, Calendar,
  MapPin, Award, Zap, Music, BookOpen, HandHeart,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

/* Verified-stable Unsplash IDs (popular, high view counts → unlikely to be removed) */
const HERO_PHOTO =
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=2400&q=80"; // university hall — graduation
const ABOUT_PHOTO =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80"; // university campus arch
const TESTIMONIAL_PHOTO =
  "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=80"; // friends laughing

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80",
    label: "Brotherhood",
    icon: Users,
  },
  {
    src: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
    label: "Game Day",
    icon: Trophy,
  },
  {
    src: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
    label: "Formals",
    icon: Award,
  },
  {
    src: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80",
    label: "Philanthropy",
    icon: HandHeart,
  },
  {
    src: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=1200&q=80",
    label: "Scholarship",
    icon: BookOpen,
  },
  {
    src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80",
    label: "Socials",
    icon: Music,
  },
];

const VALUES = [
  { icon: Users, title: "Brotherhood", body: "Lifelong friendships built on mutual respect and showing up for each other." },
  { icon: GraduationCap, title: "Scholarship", body: "3.4 chapter GPA. Study halls, mentorship, alumni network across every field." },
  { icon: Heart, title: "Character", body: "We measure men by what they do — service, integrity, courage in conviction." },
];

const USC_FACTS = [
  { value: "60+", label: "Active brothers", icon: Users },
  { value: "3.4", label: "Chapter GPA", icon: GraduationCap },
  { value: "150+", label: "Years strong", icon: ShieldCheck, sub: "Founded 1873" },
  { value: "$25k+", label: "Raised for charity", icon: HandHeart, sub: "2025 alone" },
];

const TIMELINE = [
  { week: "Week 1", title: "Open events", body: "Meet the chapter — cookouts, tailgates, low-pressure hangs." },
  { week: "Week 2", title: "Brotherhood nights", body: "Smaller events. Get to know individual brothers." },
  { week: "Week 3", title: "Invite-only", body: "Formal dinners and one-on-ones with the executive board." },
  { week: "Week 4", title: "Bid Night", body: "Bids extended. Welcome ceremony for accepting members." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-phisig-red-soft via-white to-phisig-red-soft/50">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-95"
          style={{ backgroundImage: `url(${HERO_PHOTO})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/95 via-white/80 to-white/40" aria-hidden />
        <div className="absolute inset-0 -z-10 vignette" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-dot-grid opacity-30" aria-hidden />
        <div className="absolute right-[-100px] top-[-40px] -z-10 hidden lg:block opacity-90 animate-float">
          <Seal className="w-[460px] h-[460px]" />
        </div>

        <div className="container py-16 sm:py-24 lg:py-32">
          <div className="max-w-2xl animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-phisig-red-soft px-3 py-1 text-xs font-medium text-phisig-red">
              <span className="h-1.5 w-1.5 rounded-full bg-phisig-red animate-pulse" />
              Rush Spring 2026 — Now Open
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02]">
              The chapter that built
              <br className="hidden sm:block" /> the men of <span className="text-phisig-red">Carolina</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Phi Sigma Kappa, Eta-Pentaton at the University of South Carolina. Sixty-second
              sign-up — three questions, that's it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="group shadow-lg shadow-phisig-red/20 animate-glow">
                <Link href="#register">
                  Register for rush
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#schedule">View schedule</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> 800 Lincoln St, Columbia SC
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Reply within 24h
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Eta-Pentaton chapter
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="border-y border-border bg-phisig-red text-white">
        <div className="container py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 stagger">
          {USC_FACTS.map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-3xl font-semibold tracking-tight leading-none">{s.value}</div>
                <div className="mt-1 text-xs opacity-85">{s.label}</div>
                {s.sub && <div className="text-[10px] opacity-65 mt-0.5">{s.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── VALUES ─── */}
      <section className="container py-16 sm:py-20">
        <div className="grid md:grid-cols-3 gap-8 stagger">
          {VALUES.map((v) => (
            <div key={v.title} className="lift rounded-2xl border border-border bg-card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-phisig-red text-white shadow-md shadow-phisig-red/20">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── REGISTER ─── */}
      <section id="register" className="bg-phisig-mist border-y border-border">
        <div className="container py-20 sm:py-28 scroll-mt-20">
          <div className="max-w-2xl mx-auto text-center mb-10 animate-slide-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Sparkles className="h-3 w-3" /> Step into the chapter
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">Register</h2>
            <p className="mt-3 text-muted-foreground">
              Three steps. Sixty seconds. Brothers fill in the rest from your social profiles.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <RushForm />
          </div>
        </div>
      </section>

      {/* ─── BROTHERHOOD GALLERY ─── */}
      <section className="container py-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 items-end mb-10">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Heart className="h-3 w-3" /> The chapter
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              A year in the life.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Tailgates at Williams-Brice, formals downtown, philanthropy with The Special
            Olympics, study halls, brotherhood you can count on — all of it, all year.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 stagger">
          {GALLERY.map((g, i) => (
            <div
              key={g.src}
              className={`photo-zoom relative rounded-2xl overflow-hidden border border-border bg-secondary lift ${
                i === 0 ? "md:col-span-2 md:row-span-2 md:min-h-[420px]" : "aspect-[4/3]"
              }`}
            >
              <div
                role="img"
                aria-label={g.label}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${g.src})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" aria-hidden />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-medium shadow">
                <g.icon className="h-3 w-3 text-phisig-red" /> {g.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW RUSH WORKS ─── */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container py-20">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Calendar className="h-3 w-3" /> How rush works
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Four weeks. Zero pressure.
            </h2>
            <p className="mt-3 text-muted-foreground">
              We're not interested in hazing or hoops. We're interested in finding the right men.
            </p>
          </div>
          <ol className="grid md:grid-cols-4 gap-4 stagger">
            {TIMELINE.map((t, i) => (
              <li key={t.week} className="relative rounded-xl border border-border bg-card p-5 lift">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                  {t.week}
                </span>
                <h3 className="mt-1.5 text-base font-semibold">{t.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
                <span className="absolute top-5 right-5 text-2xl font-semibold text-phisig-red opacity-15">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── SCHEDULE ─── */}
      <section id="schedule" className="container py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <Calendar className="h-3 w-3" /> Rush calendar
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">Upcoming events</h2>
          <p className="mt-3 text-muted-foreground">
            All public events. Private events go out by text/email after you register.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <ScheduleList />
        </div>
      </section>

      {/* ─── TESTIMONIAL ─── */}
      <section className="border-y border-border bg-gradient-to-b from-phisig-red-soft/40 to-background">
        <div className="container py-20 grid lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
          <div className="animate-slide-up">
            <Quote className="h-8 w-8 text-phisig-red mb-4 -translate-x-1" />
            <blockquote className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
              "Phi Sig isn't a four-year decision — it's a forty-year one. The brothers
              I met during rush are the same guys standing next to me at every wedding,
              every promotion, every milestone."
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-phisig-red text-phisig-red" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">A. Mitchell ʼ22</span> · Eta-Pentaton alumnus, finance
              </p>
            </div>
          </div>
          <div className="relative aspect-square rounded-3xl overflow-hidden border border-border bg-white photo-zoom">
            <div
              role="img"
              aria-label="Brotherhood"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${TESTIMONIAL_PHOTO})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 backdrop-blur p-3 flex items-center gap-3">
              <Crest className="h-7 w-7 text-phisig-red" />
              <div className="text-xs">
                <div className="font-semibold">Eta-Pentaton</div>
                <div className="text-muted-foreground">University of South Carolina</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="container py-20 sm:py-28 scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <ShieldCheck className="h-3 w-3" /> About the chapter
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
              Founded in 1873.<br/> Built for what's next.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Phi Sigma Kappa was founded at Massachusetts Agricultural College on three
              cardinal principles. The Eta-Pentaton chapter at the University of South
              Carolina carries that legacy forward — building men who lead in the
              classroom, the community, and beyond.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Our brothers come from every walk of life — student-athletes, entrepreneurs,
              future doctors, future engineers — united by a commitment to one another and
              the standards of this fraternity.
            </p>

            <ul className="mt-8 space-y-3 stagger">
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
          </div>

          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden border border-border bg-secondary tilt">
              <div
                role="img"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${ABOUT_PHOTO})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <Seal className="w-20 h-20 -ml-1" />
                <p className="mt-3 text-xs uppercase tracking-[0.18em] opacity-80">Eta-Pentaton</p>
                <p className="text-2xl font-semibold tracking-tight">University of South Carolina</p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden sm:block w-52 rounded-2xl border border-border bg-white shadow-xl p-4 animate-float">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Cardinal Principles
              </p>
              <p className="mt-1.5 text-sm font-semibold tracking-tight leading-snug">
                Brotherhood<br/>Scholarship<br/>Character
              </p>
            </div>
            <div className="absolute -top-6 -right-6 hidden sm:flex h-20 w-20 items-center justify-center rounded-full bg-phisig-red text-white shadow-xl shadow-phisig-red/30 animate-pulse-ring">
              <span className="text-center leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.16em] opacity-80">Since</span>
                <span className="block text-lg font-semibold">1873</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="container pb-24">
        <div className="rounded-3xl bg-phisig-red text-white p-10 sm:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
          <div className="absolute -right-12 -bottom-12 opacity-10">
            <Seal className="w-[340px] h-[340px] text-white" />
          </div>
          <div className="relative max-w-2xl">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">
              Take the first step.
            </h2>
            <p className="mt-4 text-white/80 max-w-md">
              Three questions. Sixty seconds. The brotherhood is waiting.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-7 group">
              <Link href="#register">
                Register now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
