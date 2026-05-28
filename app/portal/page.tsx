// /portal — three-door hub for Brothers / Alumni / PNM logins.
// Each portal has its own login + dashboard. The admin login (existing
// /admin/login) overrides all three so the chapter president sees admin
// versions of every portal with full CRUD.

import Link from "next/link";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Users, GraduationCap, UserPlus, Shield, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  return {
    title: `${id.greekLetters} Portal — Sign in`,
    description: `Sign in to your ${id.greekLetters} ${id.fraternityShort} portal. Brothers, alumni, and PNMs each have their own dashboard.`,
  };
}

interface PortalCard {
  href: string;
  title: string;
  description: string;
  icon: typeof Users;
  accentClass: string;
}

const PORTALS: PortalCard[] = [
  {
    href: "/portal/brothers",
    title: "Brothers",
    description: "Active members. Pay dues, RSVP, log service hours, browse the alumni network.",
    icon: Users,
    accentClass: "from-maroon-700 to-maroon-900",
  },
  {
    href: "/portal/alumni",
    title: "Alumni",
    description: "Graduated brothers. Update what you're up to, RSVP for alumni weekend, mentor an active.",
    icon: GraduationCap,
    accentClass: "from-amber-600 to-amber-800",
  },
  {
    href: "/portal/pnm",
    title: "PNMs",
    description: "Potential new members. See rush events, RSVP, submit your application, track your bid.",
    icon: UserPlus,
    accentClass: "from-emerald-700 to-emerald-900",
  },
];

export default async function PortalHubPage() {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 overflow-x-hidden">
      <PublicNav />

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-8 sm:py-16">
        <header className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maroon-100 text-maroon-700 text-xs font-medium uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" aria-hidden />
            Portal
          </div>
          <h1 className="text-2xl sm:text-5xl font-bold tracking-tight text-maroon-900 mb-3">
            Sign in to your portal
          </h1>
          <p className="text-base sm:text-lg text-maroon-700 max-w-2xl mx-auto">
            Pick the door that matches you. Each portal has its own dashboard tailored to where you
            are in the {id.fraternityShort} journey.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.href}
                href={p.href}
                className="group bg-white rounded-2xl border border-maroon-100 p-5 sm:p-6 hover:border-maroon-300 hover:shadow-md transition-all relative overflow-hidden active:scale-[0.98]"
              >
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${p.accentClass} opacity-10 group-hover:opacity-20 transition-opacity`}
                  aria-hidden
                />
                <div className="relative">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${p.accentClass} text-cream-50 mb-4 shadow-sm`}
                  >
                    <Icon className="w-6 h-6" aria-hidden />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-maroon-900 mb-2 group-hover:text-maroon-700 transition">
                    {p.title}
                  </h2>
                  <p className="text-sm text-maroon-700 mb-5 leading-relaxed">{p.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-maroon-800 group-hover:gap-2.5 transition-all">
                    Enter
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Admin override note */}
        <div className="mt-12 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-start gap-3 bg-white border border-maroon-100 rounded-2xl px-5 py-4 text-left shadow-sm">
            <Shield className="w-5 h-5 text-maroon-600 mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-maroon-900 mb-1">Chapter officer?</p>
              <p className="text-xs text-maroon-700 leading-relaxed">
                Sign in at{" "}
                <Link href="/admin/login" className="underline font-medium hover:text-maroon-900">
                  /admin/login
                </Link>{" "}
                instead. Admin sessions see every portal with full CRUD and a banner showing what
                you&apos;re overriding.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
