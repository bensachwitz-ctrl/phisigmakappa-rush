import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Users, Trophy } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-dot-grid opacity-40" aria-hidden />
        <div className="absolute right-[-80px] top-[-40px] -z-10 hidden lg:block opacity-70">
          <Seal className="w-[420px] h-[420px]" />
        </div>
        <div className="container py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-phisig-red-soft px-3 py-1 text-xs font-medium text-phisig-red">
              <span className="h-1.5 w-1.5 rounded-full bg-phisig-red animate-pulse" />
              Rush Spring 2026 — Now Open
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
              Brotherhood. Scholarship. <span className="text-phisig-red">Character.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Phi Sigma Kappa at the University of South Carolina is looking for
              the next generation of men of distinction. Register below to receive
              event invitations and meet the chapter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="#register">
                  Register for rush <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#schedule">View schedule</Link>
              </Button>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <Stat icon={<Users className="h-4 w-4" />} value="60+" label="Active brothers" />
              <Stat icon={<Trophy className="h-4 w-4" />} value="3.4" label="Chapter GPA" />
              <Stat icon={<ShieldCheck className="h-4 w-4" />} value="1873" label="Founded" />
            </dl>
          </div>
        </div>
      </section>

      <div className="hr-soft" />

      {/* Register */}
      <section id="register" className="container py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Register</h2>
          <p className="mt-3 text-muted-foreground">
            Takes 60 seconds. We'll email you with event details and what to expect next.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <RushForm />
        </div>
      </section>

      <div className="hr-soft" />

      {/* Schedule */}
      <section id="schedule" className="container py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Schedule</h2>
          <p className="mt-3 text-muted-foreground">
            All public rush events. Private events are by invitation only.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <ScheduleList />
        </div>
      </section>

      <div className="hr-soft" />

      {/* About */}
      <section id="about" className="container py-16 sm:py-24 scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              About the chapter
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Phi Sigma Kappa was founded in 1873 at Massachusetts Agricultural
              College on the principles of <span className="text-foreground font-medium">Brotherhood</span>,{" "}
              <span className="text-foreground font-medium">Scholarship</span>, and{" "}
              <span className="text-foreground font-medium">Character</span>.
              The Eta-Pentaton chapter at the University of South Carolina carries
              that legacy forward — building men who lead in the classroom, the
              community, and beyond.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Our brothers come from every walk of life — student-athletes,
              entrepreneurs, future doctors, future engineers — united by a
              commitment to one another and to the standards of this fraternity.
            </p>

            <ul className="mt-8 space-y-3">
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

          <div className="relative aspect-[4/5] sm:aspect-[5/6] rounded-2xl border border-border overflow-hidden bg-gradient-to-b from-phisig-red-soft to-white flex items-center justify-center">
            <Seal className="w-3/4 h-3/4" />
            <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-border bg-white/90 backdrop-blur p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Cardinal Principles
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">
                Brotherhood · Scholarship · Character
              </p>
            </div>
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
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
