import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/prisma";

/**
 * Per-tenant base URL derived from the live request Host header, so each
 * chapter's sitemap lists URLs on THAT chapter's domain. Falls back to the
 * NEUTRAL Greekstack apex (never a chapter reference host like
 * chapter.greekstack.vercel.app, which would leak one chapter's host into every
 * other deploy's sitemap). Mirrors app/layout.tsx requestHost/resolveMetadataBase.
 */
function resolveContext(): { base: string; isApex: boolean } {
  let host: string | null = null;
  try {
    const h = headers();
    host = h.get("host") || h.get("x-forwarded-host");
  } catch {
    /* no request context */
  }
  if (host) {
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    // getSubdomain() is the single source of truth for apex-vs-tenant routing
    // (lib/prisma) — null === the neutral marketing apex; a string === a chapter
    // subdomain. Branching on it here keeps the sitemap in lockstep with which
    // pages actually render (and DON'T 404) on each host.
    return { base: `${proto}://${host}`, isApex: getSubdomain(host) === null };
  }
  // No request context (e.g. build) → assume the neutral apex.
  return { base: "https://greekstack.vercel.app", isApex: true };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const { base, isApex } = resolveContext();
  const now = new Date();

  // No fragment URLs (#register, #schedule, #about) — Google treats fragments
  // as duplicates of the parent URL and dilutes ranking authority across the
  // homepage with "duplicate content" warnings in Search Console. Real routes
  // only — and ONLY routes that actually resolve on THIS host, so no entry ever
  // 404s. /onboard is intentionally omitted: it's a noindex + robots-Disallow
  // signup flow, so it must not be advertised in the sitemap.
  if (isApex) {
    // APEX (marketing) — the chapter-only routes (/parents, /schedule) 404 here,
    // so they're excluded; the real indexable apex pages are listed instead.
    return [
      { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
      { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
      { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
      { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
      { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ];
  }

  // TENANT (a chapter subdomain) — the public-facing chapter pages.
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/parents`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/schedule`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
