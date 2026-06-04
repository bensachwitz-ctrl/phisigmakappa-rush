// /alumni/join — public alumni signup landing.
// RSC shell, form is a client child.

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSubdomain } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import AlumniJoinForm from "./_form";
import { ArrowLeft, Users } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);
  return {
    title: `Join the ${id.greekLetters} Alumni Network`,
    description: `60-second signup to stay in the ${id.greekLetters} alumni directory. Optional mentor toggle for active brothers to reach out.`,
  };
}

export default async function AlumniJoinPage() {
  // Chapter-only route: signup adds the alum to a specific chapter's directory.
  // No chapter on the apex → 404.
  let host = "";
  try {
    host = headers().get("host") || headers().get("x-forwarded-host") || "";
  } catch {}
  if (getSubdomain(host) === null) notFound();

  const cfg = await getSiteConfig();
  const id = chapterIdentityFromCfg(cfg);

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

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maroon-100 text-maroon-700 text-xs font-medium uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" aria-hidden />
            {id.greekLetters} Alumni
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-maroon-900 mb-2">
            Stay in the network.
          </h1>
          <p className="text-base text-maroon-700">
            60 seconds to add yourself. You can update or remove at any time by emailing the alumni
            chair — and active brothers can reach out if you opt in for mentorship.
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-maroon-100 p-6 sm:p-8 shadow-sm">
          <AlumniJoinForm />
        </div>

        <p className="text-xs text-maroon-500 text-center mt-6">
          By submitting you opt into the public directory (name + grad year + city + role visible
          publicly; contact info stays private to brothers + officers).
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
