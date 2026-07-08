import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSubdomain } from "@/lib/prisma";
import { chapterLiveGate } from "@/components/site/chapter-status";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Scheduler } from "@/components/site/scheduler";
import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
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
    <div className="min-h-screen bg-cream-50 text-maroon-950">
      <PublicNav />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-8 sm:py-16">
        <header className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maroon-100 text-maroon-700 text-xs font-medium uppercase tracking-wider mb-3">
            <CalendarDays className="w-3.5 h-3.5" aria-hidden />
            Calendar Booking
          </div>
          <h1 className="text-2xl sm:text-5xl font-bold tracking-tight text-maroon-900 mb-3">
            Book an appointment
          </h1>
          <p className="text-base sm:text-lg text-maroon-700 max-w-2xl mx-auto">
            Select a meeting type, date, and time slot. We will automatically sync the event to our calendar and send you details.
          </p>
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
