import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/prisma";
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
      title: "Greekstack — The White-Label Greek Life SaaS Engine",
      description: "Coordinate recruitment pipelines, automated dues collection splits, anti-hazing reporting, and chapter operations on a single multi-tenant platform.",
    };
  }

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

  return <ChapterLandingPage searchParams={searchParams} />;
}
