import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { Wordmark } from "@/components/brand/wordmark";
import { CheckInForm } from "@/components/site/check-in-form";
import { CalendarDays, MapPin, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

// Public per-event check-in pages must never be indexed (they're door signage,
// not content) and carry no chapter data leak beyond the event basics.
export const metadata: Metadata = {
  title: "Rush check-in",
  robots: { index: false, follow: false, nocache: true },
};

type Lookup =
  | {
      kind: "ok";
      event: { id: string; name: string; location: string | null; startsAt: string };
    }
  | { kind: "not-found" };

async function lookup(code: string): Promise<Lookup> {
  const c = (code || "").trim().toUpperCase();
  // Codes are 8 chars from an unambiguous alphabet; reject anything else fast.
  if (!/^[A-Z2-9]{4,16}$/.test(c)) return { kind: "not-found" };
  try {
    const event = await prisma.event.findUnique({
      where: { checkInCode: c },
      select: { id: true, name: true, location: true, startsAt: true },
    });
    if (!event) return { kind: "not-found" };
    return {
      kind: "ok",
      event: {
        id: event.id,
        name: event.name,
        location: event.location,
        startsAt: event.startsAt.toISOString(),
      },
    };
  } catch {
    return { kind: "not-found" };
  }
}

export default async function CheckInPage({ params }: { params: { code: string } }) {
  const [result, cfg] = await Promise.all([
    lookup(params.code),
    getSiteConfig().catch(() => ({} as Record<string, string>)),
  ]);
  const id = chapterIdentityFromCfg(cfg);
  const attribution = [
    [id.fraternityName, id.greekLetters].filter(Boolean).join(", "),
    id.schoolShort ? `at ${id.schoolShort}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-phisig-mist">
      <div className="container py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Wordmark variant="compact" />
        </Link>
      </div>

      <div className="container max-w-md py-6 sm:py-12">
        {result.kind === "ok" ? (
          <>
            <div className="text-center">
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
                Rush check-in{attribution ? ` · ${attribution}` : ""}
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
                {result.event.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {new Date(result.event.startsAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {new Date(result.event.startsAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {result.event.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {result.event.location}
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Welcome! Check in below so the chapter knows you stopped by. Been
                here before? Just your number does it. New face? Take 20 seconds
                to introduce yourself.
              </p>
            </div>

            <div className="mt-7">
              <CheckInForm code={params.code.toUpperCase()} orgName={attribution || "this chapter"} />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Check-in link not active.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This QR isn&apos;t live yet, or the event has wrapped. Ask a brother
              at the table for a current one.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex text-sm font-medium text-phisig-red hover:underline"
            >
              Go to the chapter site
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
