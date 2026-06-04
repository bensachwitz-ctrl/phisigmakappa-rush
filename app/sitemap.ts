import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/**
 * Per-tenant base URL derived from the live request Host header, so each
 * chapter's sitemap lists URLs on THAT chapter's domain. Falls back to the
 * NEUTRAL Greekstack apex (never a chapter reference host like
 * phisigmakappa.vercel.app, which would leak one chapter's host into every
 * other deploy's sitemap). Mirrors app/layout.tsx requestHost/resolveMetadataBase.
 */
function resolveBase(): string {
  let host: string | null = null;
  try {
    const h = headers();
    host = h.get("host") || h.get("x-forwarded-host");
  } catch {
    /* no request context */
  }
  if (host) {
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    return `${proto}://${host}`;
  }
  return "https://greeklifesystems.vercel.app";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveBase();
  const now = new Date();
  // No fragment URLs (#register, #schedule, #about) — Google treats fragments
  // as duplicates of the parent URL and dilutes ranking authority across the
  // homepage with "duplicate content" warnings in Search Console. Real routes
  // only.
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/parents`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
