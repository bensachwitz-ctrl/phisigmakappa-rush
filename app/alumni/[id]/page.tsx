// /alumni/[id] — public alumni profile detail.
// PII fields (email, phone) are NEVER rendered on the public page — they
// only appear inside /admin/alumni for authenticated brothers + officers.

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
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  Briefcase,
  Linkedin,
  Sparkles,
  Lock,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: { welcome?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const row = await prisma.alumniProfile.findUnique({ where: { id: params.id } });
    if (!row || !row.optInDirectory) return {};
    const display = row.preferredName || row.fullName;
    return {
      title: `${display} — ${row.graduationYear} Alumni`,
      description: `${display}, class of ${row.graduationYear}.`,
    };
  } catch {
    return {};
  }
}

export default async function AlumniProfilePage({ params, searchParams }: PageProps) {
  // Chapter-only route: an alum profile belongs to a specific chapter's
  // directory. No chapter on the apex → 404.
  let host = "";
  try {
    host = headers().get("host") || headers().get("x-forwarded-host") || "";
  } catch {}
  if (getSubdomain(host) === null) notFound();

  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);

  let row;
  try {
    row = await prisma.alumniProfile.findUnique({ where: { id: params.id } });
  } catch {
    return notFound();
  }
  if (!row || !row.optInDirectory) return notFound();

  const safe = publicAlumniView(row);
  const display = safe.preferredName || safe.fullName;
  const loc = [safe.city, safe.state].filter(Boolean).join(", ");
  const work = [safe.jobTitle, safe.employer].filter(Boolean).join(" · ");
  const welcome = !!searchParams?.welcome;

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950">
      <PublicNav />

      <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <Link
          href="/alumni"
          className="inline-flex items-center gap-1.5 text-sm text-maroon-700 hover:text-maroon-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to directory
        </Link>

        {welcome && (
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" aria-hidden />
            You&apos;re in. Welcome back to the {id.greekLetters} network.
          </div>
        )}

        <article className="bg-white rounded-2xl border border-maroon-100 p-6 sm:p-8 shadow-sm">
          {/* Identity */}
          <header className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-maroon-900">{display}</h1>
            {safe.preferredName && safe.fullName !== display && (
              <p className="text-sm text-maroon-600 mt-0.5">{safe.fullName}</p>
            )}
            <p className="text-sm text-maroon-700 mt-2 inline-flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" aria-hidden />
              Class of {safe.graduationYear}
              {safe.pledgeClass && <span className="text-maroon-500"> · {safe.pledgeClass}</span>}
            </p>
          </header>

          {/* Where + What */}
          <div className="space-y-3 mb-6">
            {loc && (
              <p className="text-sm text-maroon-800 inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-maroon-600" aria-hidden />
                {loc}
              </p>
            )}
            {work && (
              <p className="text-sm text-maroon-800 inline-flex items-start gap-2 leading-snug">
                <Briefcase className="w-4 h-4 text-maroon-600 mt-0.5 shrink-0" aria-hidden />
                <span>{work}</span>
              </p>
            )}
          </div>

          {/* Bio */}
          {safe.bio && (
            <div className="bg-cream-50 border border-maroon-100 rounded-xl px-4 py-3 mb-6">
              <p className="text-sm text-maroon-800 italic leading-relaxed">{safe.bio}</p>
            </div>
          )}

          {/* LinkedIn — public OK */}
          {safe.linkedinUrl && (
            <a
              href={safe.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-maroon-700 hover:text-maroon-900 underline-offset-4 hover:underline"
            >
              <Linkedin className="w-4 h-4" aria-hidden />
              View on LinkedIn
            </a>
          )}

          {/* Contact info gated */}
          <div className="mt-6 pt-6 border-t border-maroon-100">
            <div className="rounded-xl bg-maroon-50 border border-maroon-200 px-4 py-3 inline-flex items-start gap-2 text-sm text-maroon-800">
              <Lock className="w-4 h-4 mt-0.5 shrink-0 text-maroon-600" aria-hidden />
              <span>
                Email + phone are visible to brothers + officers only.{" "}
                <Link href="/admin/login" className="underline font-medium hover:text-maroon-900">
                  Sign in
                </Link>{" "}
                to view.
              </span>
            </div>
          </div>
        </article>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-sm text-maroon-700 mb-3">
            {id.greekLetters ? `Are you a ${id.greekLetters} alum too?` : "Are you an alum of this chapter too?"}
          </p>
          <Link href="/alumni/join">
            <Button className="bg-maroon-700 hover:bg-maroon-800 text-cream-50">
              Add yourself to the directory
            </Button>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
