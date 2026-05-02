import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal, Crest } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Users, Trophy, Heart,
  GraduationCap, Sparkles, Quote, Star, Calendar,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const HERO_PHOTO = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=80";

const GALLERY = [
  { src: "https://images.unsplash.com/photo-1541178735493-479c1a27ed24?auto=format&fit=crop&w=900&q=80", label: "Brotherhood" },
  { src: "https://images.unsplash.com/photo-1607013251379-e6eecfffe234?auto=format&fit=crop&w=900&q=80", label: "Tailgates" },
  { src: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80", label: "Formals" },
  { src: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=80", label: "Philanthropy" },
  { src: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=900&q=80", label: "Campus" },
  { src: "https://images.unsplash.com/photo-1517486430290-35657bdcef51?auto=format&fit=crop&w=900&q=80", label: "Game Day" },
];

const VALUES = [
  {
    icon: Users,
    title: "Brotherhood",
    body: "Lifelong friendships built on mutual respect, shared standards, and showing up for each other.",
  },
  {
    icon: GraduationCap,
    title: "Scholarship",
    body: "A 3.4 chapter GPA. Study halls, mentorship from upperclassmen, alumni connections in every field.",
  },
  {
    icon: Heart,
    title: "Character",
    body: "We measure men by what they do. Service to community, integrity in conduct, courage in convictions.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_PHOTO})` }}
          aria-hidden
        />
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
              Brotherhood.
              <br className="hidden sm:block" /> Scholarship.{" "}
              <span className="text-phisig-red">Character.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Phi Sigma Kappa at the University of South Carolina is looking for
              the next generation of men of distinction. Sixty-second sign-up below.
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

            <dl className="mt-12 grid grid-cols-3 gap-6 max-w-md stagger">
              <Stat icon={<Users className="h-4 w-4" />} value="60+" label="Active brothers" />
              <Stat icon={<Trophy className="h-4 w-4" />} value="3.4" label="Chapter GPA" />
              <Stat icon={<ShieldCheck className="h-4 w-4" />} value="1873" label="Founded" />
            </dl>
          </div>
        </div>
      </section>

      {/* ─────────── VALUES STRIP ─────────── */}
      <section className="border-y border-border bg-secondary/30">
        <div className="container py-14 grid md:grid-cols-3 gap-6 stagger">
          {VALUES.map((v) => (
            <div key={v.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-phisig-red text-white shadow-md shadow-phisig-red/20 shrink-0">
                <v.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── REGISTER ─────────── */}
      <section id="register" className="container py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center mb-10 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <Sparkles className="h-3 w-3" /> Step into the chapter
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">Register</h2>
          <p className="mt-3 text-muted-foreground">
            Five quick steps. Sixty seconds. We'll email you with what's next.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <RushForm />
        </div>
      </section>

      {/* ─────────── BROTHERHOOD GALLERY ─────────── */}
      <section className="bg-phisig-mist border-y border-border">
        <div className="container py-20">
          <div className="max-w-2xl mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              <Heart className="h-3 w-3" /> The chapter
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              A year in the life of Phi Sig.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tailgates at Williams-Brice, philanthropy with The Special Olympics,
              formals downtown, study halls, brotherhood you can count on.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 stagger">
            {GALLERY.map((g, i) => (
              <div
                key={g.src}
                className={`photo-zoom relative rounded-2xl overflow-hidden border border-border bg-card lift ${
                  i === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
              >
                <div
                  role="img"
                  aria-label={g.label}
                  className="w-full h-full bg-cover bg-center aspect-[4/3] md:aspect-auto md:h-full"
                  style={{ backgroundImage: `url(${g.src})`, minHeight: i === 0 ? 320 : 180 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" aria-hidden />
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-medium">
                  <Crest className="h-3 w-3 text-phisig-red" /> {g.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── SCHEDULE ─────────── */}
      <section id="schedule" className="container py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <Calendar className="h-3 w-3" /> Rush calendar
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">Schedule</h2>
          <p className="mt-3 text-muted-foreground">
            All public rush events. Private events are by invitation.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <ScheduleList />
        </div>
      </section>

      {/* ─────────── TESTIMONIAL ─────────── */}
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
              style={{ backgroundImage: "url(https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=900&q=80)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* ─────────── ABOUT ─────────── */}
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
              Our brothers come from every walk of life — student-athletes,
              entrepreneurs, future doctors, future engineers — united by a
              commitment to one another and the standards of this fraternity.
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
            <div className="aspect-[4/5] rounded-3xl border border-border overflow-hidden bg-gradient-to-b from-phisig-red-soft to-white flex items-center justify-center tilt">
              <Seal className="w-3/4 h-3/4" />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden sm:block w-48 rounded-2xl border border-border bg-white shadow-xl p-4 animate-float">
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

      {/* ─────────── FINAL CTA ─────────── */}
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
              Sixty seconds. Five questions. The brotherhood is waiting.
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

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon} <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-semibold">{value}</div>
    </div>
  );
}
