// /portal/alumni — alumni portal landing.
// Self-service update flow + alumni weekend RSVP wired in the next pass.
// For now, the alumni public surface (signup + directory) is fully live and
// this page funnels alumni there.

import Link from "next/link";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, UserPlus, Search, Heart, Calendar } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  return {
    title: `Alumni Portal — ${id.greekLetters}`,
    description: `Alumni portal for ${id.greekLetters} graduated brothers.`,
  };
}

export default async function AlumniPortalPage() {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-sm text-maroon-700 hover:text-maroon-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to portals
        </Link>

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium uppercase tracking-wider mb-3">
            <GraduationCap className="w-3.5 h-3.5" aria-hidden />
            Alumni Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-maroon-900 mb-2">
            Stay connected, brother.
          </h1>
          <p className="text-base text-maroon-700">
            The {id.greekLetters} alumni network is live. Add yourself, browse who&apos;s where, and
            RSVP for alumni weekend.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/alumni/join"
            className="group bg-white rounded-2xl border border-maroon-100 p-5 hover:border-amber-300 hover:shadow-md transition-all"
          >
            <UserPlus className="w-6 h-6 text-amber-700 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-900 mb-1 group-hover:text-amber-800">
              Add yourself
            </h2>
            <p className="text-sm text-maroon-700">
              60-second form. Required: name + grad year. Optional: everything else.
            </p>
          </Link>
          <Link
            href="/alumni"
            className="group bg-white rounded-2xl border border-maroon-100 p-5 hover:border-amber-300 hover:shadow-md transition-all"
          >
            <Search className="w-6 h-6 text-amber-700 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-900 mb-1 group-hover:text-amber-800">
              Browse alumni
            </h2>
            <p className="text-sm text-maroon-700">
              See who&apos;s in your city, your industry, or your decade.
            </p>
          </Link>
          <div className="bg-cream-100 rounded-2xl border border-maroon-100 border-dashed p-5">
            <Calendar className="w-6 h-6 text-maroon-400 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-600 mb-1">Alumni weekend RSVP</h2>
            <p className="text-sm text-maroon-500">
              Coming next: RSVP to homecoming + alumni-only events.
            </p>
          </div>
          <div className="bg-cream-100 rounded-2xl border border-maroon-100 border-dashed p-5">
            <Heart className="w-6 h-6 text-maroon-400 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-600 mb-1">Mentor an active</h2>
            <p className="text-sm text-maroon-500">
              Coming next: opt in to mentor an active brother in your field.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-maroon-900 mb-2">Alumni officer?</h2>
          <p className="text-xs text-maroon-700 mb-4">
            Sign in at the chapter admin login for full alumni roster + CSV export + email blasts.
          </p>
          <Link href="/admin/login">
            <Button className="bg-maroon-700 hover:bg-maroon-800 text-cream-50">
              Officer sign in
            </Button>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
