import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSubdomain } from "@/lib/prisma";
import { chapterLiveGate } from "@/components/site/chapter-status";
import { chapterLiveMetadataGate } from "@/lib/chapter-live-guard";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Scheduler } from "@/components/site/scheduler";
import { CalendarDays, ShieldCheck, MailCheck } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // GO-LIVE METADATA GATE — a suspended / pending-billing chapter must not leak its
  // greekLetters + fraternityName through the title/description/OG here (separate
  // execution path from the body's chapterLiveGate). Live/apex → null, keep identity.
  const gated = await chapterLiveMetadataGate();
  if (gated) return gated;

  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  const title = `Schedule an Event — ${id.greekLetters}`;
  const description = `Schedule a rush coffee chat, alumni mentorship slot, or meeting with the active brothers of ${id.fraternityName} at ${id.schoolShort}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "/schedule",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: id.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}

export default async function SchedulePage() {
  // Chapter-only route: booking targets a specific chapter's calendar, which
  // doesn't exist on the apex. 404 on the apex (no subdomain).
  let host = "";
  try {
    host = headers().get("host") || headers().get("x-forwarded-host") || "";
  } catch {}
  if (getSubdomain(host) === null) notFound();

  // GO-LIVE GATE — a suspended or still-pending-billing chapter must not serve any
  // public route, only "/". Render the same launching-soon / inactive state as
  // app/page.tsx before touching chapter data.
  const gate = await chapterLiveGate();
  if (gate) return gate;

  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  const calDiyUrl = cfg["calendar.calDiyUrl"] || "";

  return (
    <div className="relative min-h-screen overflow-x-clip bg-cream-50 text-maroon-950">
      {/* Soft, chapter-tinted ambient wash behind the header. Static (no motion)
          and brand-token-driven (maroon-* is bound to the live --brand-primary
          ramp), so it recolors per tenant and never adds an off-brand platform hue. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[440px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-11rem] h-96 w-96 -translate-x-1/2 rounded-full bg-maroon-500/10 blur-3xl" />
        <div className="absolute right-[-7rem] top-2 h-72 w-72 rounded-full bg-maroon-400/10 blur-3xl" />
      </div>

      <PublicNav />

      <div className="relative max-w-5xl mx-auto px-3 sm:px-4 py-10 sm:py-20">
        <header className="text-center mb-12 sm:mb-14">
          {/* Classical eyebrow: the chapter's own identity, set in the Cinzel
              display face (inscriptional caps). Replaces the generic "Calendar
              Booking" chip. */}
          <p className="flex flex-wrap items-center justify-center gap-x-[0.45em] gap-y-1 font-display text-[11px] font-semibold uppercase leading-none tracking-[0.28em] text-maroon-700 sm:text-xs">
            <CalendarDays className="h-3.5 w-3.5 text-maroon-600" aria-hidden />
            <span>Schedule with {id.fraternityShort || "the chapter"}</span>
          </p>
          {/* Brand hairline divider with a centered diamond: a restrained
              classical accent, tinted in the chapter color (not platform blue). */}
          <span aria-hidden className="mx-auto mt-4 mb-6 flex w-28 items-center justify-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-maroon-300" />
            <span className="h-1.5 w-1.5 rotate-45 rounded-[1px] bg-maroon-500" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-maroon-300" />
          </span>
          <h1 className="mx-auto max-w-3xl text-[clamp(2rem,5.6vw,3.5rem)] font-bold leading-[1.04] tracking-tight text-maroon-900 [text-wrap:balance]">
            Grab time with the chapter.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty font-serif text-lg italic leading-relaxed text-maroon-700 sm:text-xl">
            Pick a meeting type, a day, and a time. We&apos;ll sync it straight to the chapter calendar and email you the details.
          </p>
          {/* Trust chips: two calm reassurances, brand-token surfaces. */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-xs text-maroon-700">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-maroon-200 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur">
              <MailCheck className="h-3.5 w-3.5 text-maroon-600" aria-hidden />
              Instant email confirmation
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-maroon-200 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-maroon-600" aria-hidden />
              Synced to the chapter calendar
            </span>
          </div>
        </header>

        <Scheduler
          calDiyUrl={calDiyUrl} 
          chapterShort={id.fraternityShort} 
          schoolShort={id.schoolShort}
          tagline={id.tagline}
        />
      </div>

      <PublicFooter />
    </div>
  );
}
