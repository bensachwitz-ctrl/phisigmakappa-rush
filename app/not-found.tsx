import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { IconHome as Home, IconCalendar as Calendar, IconCompass as Compass } from "@/components/brand/icons";
import { getChapterIdentity } from "@/lib/chapter-identity";

export const metadata = {
  title: "Not found",
};

export default async function NotFound() {
  // Recruit noun is org-type-aware ("Rush" for a fraternity, "Recruitment" for a
  // sorority / pro / co-ed org). getChapterIdentity reads cfg and never throws,
  // so the 404 stays resilient even if the config lookup fails.
  const { terms } = await getChapterIdentity();
  return (
    <AnimatedBackground variant="aurora-grid" tone="brand" className="min-h-screen bg-background">
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="container py-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <Wordmark variant="compact" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-lg text-center animate-slide-up">
            {/* Decorative chip — a soft brand-tinted compass to signal "off the map" */}
            <div className="relative mx-auto mb-6 w-fit">
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-2xl bg-[hsl(var(--primary)/0.18)] blur-2xl"
              />
              <IconChip icon={Compass} tone="brand" size="lg" className="animate-float" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/20 bg-brand-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">
              404 · Not found
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
              That page doesn&apos;t exist.
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-muted-foreground leading-relaxed">
              Maybe a stale link. Try the {terms.recruit.toLowerCase()} page or jump to the schedule.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="group cta-shine press">
                <Link href="/">
                  <Home className="h-4 w-4" /> Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="press bg-white/70 backdrop-blur">
                <Link href="/#schedule">
                  <Calendar className="h-4 w-4" /> {terms.recruit} schedule
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
