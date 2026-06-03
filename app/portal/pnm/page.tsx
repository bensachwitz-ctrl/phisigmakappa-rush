// /portal/pnm — PNM (Potential New Member) portal landing.
// During rush season this lands on rush events + an "apply" CTA. During
// non-rush periods it lands on "join interest list."

import Link from "next/link";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowLeft, Calendar, FileText, Mail, Sparkles } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  return {
    title: `Rush Portal — ${id.greekLetters}`,
    description: `Rush portal for ${id.greekLetters} potential new members.`,
  };
}

export default async function PnmPortalPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium uppercase tracking-wider mb-3">
            <UserPlus className="w-3.5 h-3.5" aria-hidden />
            Rush Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-maroon-900 mb-2">
            Interested in {id.greekLetters}?
          </h1>
          <p className="text-base text-maroon-700">
            Whether you&apos;re scouting from home or already on the rush schedule, here&apos;s
            where you sign up, RSVP, and track your application.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/onboard"
            className="group bg-white rounded-2xl border border-maroon-100 p-5 hover:border-emerald-400 hover:shadow-md transition-all"
          >
            <FileText className="w-6 h-6 text-emerald-700 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-900 mb-1 group-hover:text-emerald-800">
              Submit your application
            </h2>
            <p className="text-sm text-maroon-700">
              5-minute form. The rush chair sees it the moment you submit.
            </p>
          </Link>
          <Link
            href="/#schedule"
            className="group bg-white rounded-2xl border border-maroon-100 p-5 hover:border-emerald-400 hover:shadow-md transition-all"
          >
            <Calendar className="w-6 h-6 text-emerald-700 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-900 mb-1 group-hover:text-emerald-800">
              Rush schedule
            </h2>
            <p className="text-sm text-maroon-700">
              Every event, every date. Bookmark it.
            </p>
          </Link>
          <Link
            href="/#contact"
            className="group bg-white rounded-2xl border border-maroon-100 p-5 hover:border-emerald-400 hover:shadow-md transition-all"
          >
            <Mail className="w-6 h-6 text-emerald-700 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-900 mb-1 group-hover:text-emerald-800">
              Contact the rush chair
            </h2>
            <p className="text-sm text-maroon-700">Question about rush? Reach out direct.</p>
          </Link>
          <div className="bg-cream-100 rounded-2xl border border-maroon-100 border-dashed p-5">
            <Sparkles className="w-6 h-6 text-maroon-400 mb-3" aria-hidden />
            <h2 className="text-base font-semibold text-maroon-600 mb-1">Track your bid</h2>
            <p className="text-sm text-maroon-500">
              Once a bid is sent, it shows up here. You can accept or decline in one tap.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-maroon-900 mb-2">Rush chair?</h2>
          <p className="text-xs text-maroon-700 mb-4">
            Sign in at the chapter admin login to see every PNM, their attendance, and run the bid
            workflow.
          </p>
          <Link href="/admin/login">
            <Button className="bg-maroon-700 hover:bg-maroon-800 text-cream-50">
              Rush chair sign in
            </Button>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
