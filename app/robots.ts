import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app";
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
