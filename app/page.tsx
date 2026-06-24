import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSubdomain, getRegistrySubdomain, isTenantActive } from "@/lib/prisma";
import MarketingLandingPage from "@/components/site/marketing-landing";
import ChapterLandingPage, { generateMetadata as generateChapterMetadata } from "@/components/site/chapter-landing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let host = "";
  try {
    host = headers().get("host") || "";
  } catch {}

  const subdomain = getSubdomain(host);

  if (!subdomain) {
    return {
      title: "Greekstack — The White-Label Chapter Management Platform",
      description: "Run recruitment, dues, events, treasury, and alumni for your fraternity or sorority on one branded site — live the same day. First month free, no credit card.",
    };
  }

  return generateChapterMetadata();
}

/**
 * Shown in place of a chapter site when the operator has suspended that chapter
 * (registry isActive=false). Kept brand-neutral — a suspended chapter must not
 * leak its identity or any data, and the platform should look intentional, not
 * broken.
 */
function ChapterInactivePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          This chapter is not currently active
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This chapter&apos;s site is temporarily unavailable. If you&apos;re a chapter
          administrator, please contact Greekstack support to restore access.
        </p>
      </div>
    </main>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  let host = "";
  try {
    host = headers().get("host") || "";
  } catch {}

  const subdomain = getSubdomain(host);

  if (!subdomain) {
    return <MarketingLandingPage />;
  }

  // Enforce the registry's isActive flag: a suspended chapter (toggled off in
  // the platform console) serves a neutral "not active" page instead of its
  // site. The lookup MUST use the hyphen-preserving registry key — getSubdomain
  // above returns the schema form ("phi_sig"), which never matches a hyphenated
  // registry row ("phi-sig"), so a suspended hyphenated chapter would wrongly
  // keep serving. Resilient by design — isTenantActive returns true on any
  // registry error, so a live chapter never goes dark from a transient failure.
  const active = await isTenantActive(getRegistrySubdomain(host) ?? subdomain);
  if (!active) {
    return <ChapterInactivePage />;
  }

  return <ChapterLandingPage searchParams={searchParams} />;
}
