// /portal/brothers — brother login + dashboard placeholder.
// Real auth wiring queued for next commit (uses lib/portal-auth.ts).
// For now this is the landing that explains what's coming + collects
// magic-link signup interest so brothers know the portal is in flight.

import Link from "next/link";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, CreditCard, Calendar, ClipboardList, Bell } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  return {
    title: `Brothers Portal — ${id.greekLetters}`,
    description: `Active brother portal for ${id.greekLetters} chapter.`,
  };
}

const FEATURES = [
  { icon: CreditCard, label: "Pay dues", description: "Stripe-secured, one-tap." },
  { icon: Calendar, label: "RSVP", description: "Chapter, social, philanthropy events." },
  { icon: ClipboardList, label: "Service hours", description: "Log + see your total." },
  { icon: Bell, label: "Announcements", description: "Filtered to what's relevant to you." },
];

export default async function BrothersPortalPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maroon-100 text-maroon-700 text-xs font-medium uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" aria-hidden />
            Brothers Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-maroon-900 mb-2">
            Welcome back, brother.
          </h1>
          <p className="text-base text-maroon-700">
            The {id.greekLetters} brothers portal is coming online this rush cycle. Sign in below
            once your treasurer activates magic-link login — for now, officers use the admin login
            below.
          </p>
        </header>

        {/* Feature preview */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="bg-white rounded-xl border border-maroon-100 p-4 flex items-start gap-3"
              >
                <Icon className="w-5 h-5 text-maroon-600 mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-maroon-900 leading-tight">{f.label}</p>
                  <p className="text-xs text-maroon-600 mt-0.5">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin override */}
        <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-maroon-900 mb-2">Are you an officer?</h2>
          <p className="text-xs text-maroon-700 mb-4">
            Sign in at the chapter admin login to access this portal as an officer with full CRUD.
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
