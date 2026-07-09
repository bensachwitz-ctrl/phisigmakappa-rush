import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSubdomain, getRegistrySubdomain, isTenantActive } from "@/lib/prisma";
import { isPendingBilling, chapterLiveMetadataGate } from "@/lib/chapter-live-guard";
import {
  ChapterInactivePage,
  ChapterLaunchingSoonPage,
} from "@/components/site/chapter-status";
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

  // GO-LIVE METADATA GATE — the chapter home BODY already renders the neutral
  // inactive / launching-soon page for a suspended / pending-billing chapter, but
  // generateMetadata is a separate execution path and would still emit the chapter's
  // identity <title>/OG. Gate it too; a live chapter → null, keep identity metadata.
  const gated = await chapterLiveMetadataGate();
  if (gated) return gated;

  return generateChapterMetadata();
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
    // Distinguish a chapter whose PUBLIC subdomain simply hasn't gone live yet
    // because billing is pending (card-free monthly — CARD-REQUIRED-TO-PUBLISH)
    // from an operator HARD-suspend. A pending-billing chapter shows the upbeat
    // "launching soon" page (with a path to /admin/billing); everything else shows
    // the neutral operator-suspend page. `subdomain` here is the schema-form key
    // getSubdomain returns, which is exactly what getTenantClient expects.
    const pending = await isPendingBilling(subdomain);
    return pending ? <ChapterLaunchingSoonPage /> : <ChapterInactivePage />;
  }

  return <ChapterLandingPage searchParams={searchParams} />;
}
