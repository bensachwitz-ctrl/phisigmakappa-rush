// /alumni — PUBLIC alumni directory landing.
//
// Shows the opt-in directory (PII-stripped at the DB layer via
// publicAlumniView) with light client-side filters. Brothers + admins
// see the full contact info inside /admin/alumni — this is the
// outward-facing surface so prospective alumni can see the network is
// alive before they fill out /alumni/join.

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma, getSubdomain } from "@/lib/prisma";
import { publicAlumniView } from "@/lib/alumni";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { GraduationCap, MapPin, Briefcase, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import { IconSpark } from "@/components/brand/icons";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  return {
    title: `${id.greekLetters} Alumni Network — ${id.fraternityName}`,
    description: `Stay connected with ${id.greekLetters} alumni. See who's where, what they're doing, and how to reach them.`,
  };
}

interface AlumniRow {
  id: string;
  fullName: string;
  preferredName: string | null;
  graduationYear: number;
  city: string | null;
  state: string | null;
  employer: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  bio: string | null;
}

async function loadAlumni(): Promise<AlumniRow[]> {
  try {
    const rows = await prisma.alumniProfile.findMany({
      where: { optInDirectory: true },
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
      take: 500,
    });
    return rows.map((r) => publicAlumniView(r) as AlumniRow);
  } catch {
    return [];
  }
}

function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

export default async function AlumniDirectoryPage() {
  // Chapter-only route: the public alumni directory belongs to a specific
  // chapter. On the apex (no subdomain) there is no chapter network to show, so
  // 404 rather than render an empty "0 brothers" directory to a prospect.
  let host = "";
  try {
    host = headers().get("host") || headers().get("x-forwarded-host") || "";
  } catch {}
  if (getSubdomain(host) === null) notFound();

  const [cfg, alumni] = await Promise.all([getSiteConfig(), loadAlumni()]);
  const id = chapterIdentityFromCfg(cfg);

  const totalCount = alumni.length;
  const decades = Array.from(new Set(alumni.map((a) => decadeOf(a.graduationYear)))).sort().reverse();

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950">
      <PublicNav />

      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
        {/* Hero */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maroon-100 text-maroon-700 text-xs font-medium uppercase tracking-wider mb-3">
            <IconSpark className="w-3.5 h-3.5" aria-hidden />
            Alumni Network
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-maroon-900 mb-3">
            {totalCount.toLocaleString()} {id.greekLetters} brothers, still connected
          </h1>
          <p className="text-base sm:text-lg text-maroon-700 max-w-2xl mx-auto">
            See where the brotherhood went after graduation, what they're up to, and how to reach
            them. Graduated and not on the list? Add yourself in 60 seconds.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/alumni/join">
              <Button size="lg" className="bg-maroon-700 hover:bg-maroon-800 text-cream-50">
                Join the network
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
              </Button>
            </Link>
          </div>
        </header>

        {/* Decade chips */}
        {decades.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-center" aria-label="Filter by graduation decade">
            <a
              href="#all"
              className="px-3 py-1.5 rounded-full bg-white border border-maroon-200 text-sm font-medium text-maroon-700 hover:bg-maroon-50 transition"
            >
              All
            </a>
            {decades.map((d) => (
              <a
                key={d}
                href={`#${d}`}
                className="px-3 py-1.5 rounded-full bg-white border border-maroon-200 text-sm font-medium text-maroon-700 hover:bg-maroon-50 transition"
              >
                {d}
              </a>
            ))}
          </div>
        )}

        {/* Cards grid */}
        {totalCount === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="text-4xl mb-3" aria-hidden>
              🎓
            </div>
            <p className="text-base font-medium text-maroon-900 mb-1">
              No alumni in the directory yet.
            </p>
            <p className="text-sm text-maroon-700 mb-4">
              Be the first — opt in so future brothers can find you.
            </p>
            <Link href="/alumni/join">
              <Button className="bg-maroon-700 hover:bg-maroon-800 text-cream-50">
                Start the network
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="all">
            {alumni.map((a, i) => {
              // Anchor target so the decade filter chips above actually scroll
              // to the first alum of each decade. Alumni are sorted by year
              // desc, so each decade's members are contiguous — we drop an
              // invisible id marker the first time a new decade appears.
              const decade = decadeOf(a.graduationYear);
              const isFirstOfDecade =
                i === 0 || decadeOf(alumni[i - 1].graduationYear) !== decade;
              return (
                <AlumniCard
                  key={a.id}
                  alum={a}
                  anchorId={isFirstOfDecade ? decade : undefined}
                />
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

function AlumniCard({ alum, anchorId }: { alum: AlumniRow; anchorId?: string }) {
  const display = alum.preferredName || alum.fullName;
  const loc = [alum.city, alum.state].filter(Boolean).join(", ");
  const work = [alum.jobTitle, alum.employer].filter(Boolean).join(" · ");
  return (
    <Link
      id={anchorId}
      href={`/alumni/${alum.id}`}
      style={anchorId ? { scrollMarginTop: "5rem" } : undefined}
      className="group bg-white rounded-2xl border border-maroon-100 p-5 hover:border-maroon-300 hover:shadow-md transition-all block"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-base font-semibold text-maroon-900 leading-tight group-hover:text-maroon-700 transition">
          {display}
        </h2>
        <span className="text-xs font-medium text-maroon-500 shrink-0 inline-flex items-center gap-1">
          <GraduationCap className="w-3.5 h-3.5" aria-hidden />
          {alum.graduationYear}
        </span>
      </div>
      {loc && (
        <p className="text-xs text-maroon-600 mb-1 inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" aria-hidden />
          {loc}
        </p>
      )}
      {work && (
        <p className="text-sm text-maroon-700 mt-2 inline-flex items-start gap-1.5 leading-snug">
          <Briefcase className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          <span>{work}</span>
        </p>
      )}
      {alum.bio && (
        <p className="text-xs text-maroon-600 mt-3 line-clamp-2 italic">{alum.bio}</p>
      )}
    </Link>
  );
}
