"use client";

import { Instagram, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Real post slugs pulled live from instagram.com/phisig_usc.
// Sorted newest-first; image proxy at /api/photo/[slug] fetches the og:image
// from each post on demand and edge-caches the result.
const POSTS = [
  { slug: "DXzzTaFjSyj", caption: "Brother of the Month — Michael McCarthy", tag: "Leadership" },
  { slug: "DXHwOJCkUbi", caption: "Annual paintball at Trigger Tyme", tag: "Brotherhood" },
  { slug: "DW9-fTTibRF", caption: "Alpha Phi pledge class initiated", tag: "Pledge class" },
  { slug: "DWmioxGCaBG", caption: "Spring formal in New Orleans", tag: "Formals" },
  { slug: "DU80cXJidhH", caption: "Cantina 76 percent night for L&L Society", tag: "Service" },
  { slug: "DUyvfpokpy6", caption: "Polar Plunge raised $700 for Special Olympics SC", tag: "Philanthropy" },
  { slug: "DUBvmpfktF3", caption: "3.45 chapter GPA · 3.50 NM GPA", tag: "Scholarship" },
  { slug: "DT0irEWEdT-", caption: "Chapter celebration", tag: "Brotherhood" },
  { slug: "DSXMOLhERFH", caption: "Spring Rush 2026 — sign up", tag: "Rush" },
  { slug: "DSGFt3REoty", caption: "Brother of the Month — John Chiffriller", tag: "Leadership" },
  { slug: "DRzyoVciZCh", caption: "2026 Executive Board", tag: "Leadership" },
  { slug: "DRxIVRXkYCn", caption: "Williams-Brice game day", tag: "Game Day" },
];

export function InstagramFeed({
  count = 9,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const posts = POSTS.slice(0, count);
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 stagger", className)}>
      {posts.map((p, i) => (
        <Link
          key={p.slug}
          href={`https://www.instagram.com/p/${p.slug}/`}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "group relative aspect-square rounded-2xl overflow-hidden border border-border bg-secondary lift",
            i === 0 && "sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[400px]"
          )}
        >
          <img
            src={`/api/photo/${p.slug}`}
            alt={p.caption}
            loading={i < 3 ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-90" aria-hidden />

          {/* Top-right Instagram badge */}
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
            <Instagram className="h-3 w-3" /> @phisig_usc
          </span>

          {/* Bottom caption */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 pointer-events-none">
            <span className="inline-block rounded-full bg-phisig-red text-white px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              {p.tag}
            </span>
            <p className={cn(
              "mt-2 text-white font-medium leading-snug",
              i === 0 ? "text-base sm:text-lg max-w-md" : "text-xs sm:text-sm line-clamp-2"
            )}>
              {p.caption}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function InstagramStrip() {
  const posts = POSTS.slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`https://www.instagram.com/p/${p.slug}/`}
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary lift"
          >
            <img
              src={`/api/photo/${p.slug}`}
              alt={p.caption}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </Link>
        ))}
      </div>
      <div className="text-center">
        <Link
          href="https://www.instagram.com/phisig_usc/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
        >
          <Instagram className="h-4 w-4" /> See more on @phisig_usc
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
