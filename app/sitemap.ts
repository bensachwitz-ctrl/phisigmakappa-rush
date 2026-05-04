import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app";
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
