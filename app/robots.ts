import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/**
 * Per-tenant base URL derived from the live request Host header, so each
 * chapter's robots.txt points its sitemap at THAT chapter's domain. Falls back
 * to the NEUTRAL Greekstack apex (never a chapter reference host like
 * chapter.greekstack.vercel.app, which would leak one chapter's host into every
 * other deploy's robots.txt). Mirrors app/layout.tsx requestHost/resolveMetadataBase.
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
  return "https://greekstack.vercel.app";
}

export default function robots(): MetadataRoute.Robots {
  const base = resolveBase();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/admin",
          // /onboard/[token] pages already ship `noindex,nofollow,nocache`
          // metadata, but adding a Disallow line is defense-in-depth — a
          // misbehaving crawler that ignores robots metas still won't even
          // request these one-time-use invite URLs from us.
          "/onboard",
          // /bid/[token] — single-use PNM bid-response landing. Same
          // reasoning as /onboard; the page also ships noindex metas.
          "/bid",
          "/api/bid",
          // /api/rush, /api/upload-headshot, /api/photo are public POST/GET
          // endpoints for the rush funnel — there's nothing for a crawler
          // to index (they return JSON or proxied images), and disallowing
          // them avoids wasting crawl budget on millions of cache-key
          // variants like /api/photo/[slug]?w=320.
          "/api/rush",
          "/api/onboard",
          "/api/upload-headshot",
          "/api/photo",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
