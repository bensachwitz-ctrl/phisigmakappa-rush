"use client";

import { Instagram, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Real post slugs pulled live from instagram.com/phisig_usc.
// Sorted newest-first; image proxy at /api/photo/[slug] fetches the og:image
// from each post on demand and edge-caches the result.
//
// `objectPosition` is per-post crop control. Default is "center 60%" (subjects
// in action photos usually live in the lower 2/3 — center-center crops too
// much sky on outdoor shots). Override per post if a specific image still
// lands wrong (faces high, action high, vertical hero shots).
const POSTS: { slug: string; caption: string; tag: string; objectPosition?: string }[] = [
  { slug: "DUyvfpokpy6", caption: "Polar Plunge raised $700 for Special Olympics SC", tag: "Philanthropy", objectPosition: "center 65%" },
  { slug: "DXHwOJCkUbi", caption: "Annual paintball at Trigger Tyme", tag: "Brotherhood", objectPosition: "center 80%" },
  { slug: "DRxIVRXkYCn", caption: "No Shave November — $1,600 raised for Movember (men's health & mental-health awareness)", tag: "Philanthropy", objectPosition: "center 80%" },
  { slug: "DWmioxGCaBG", caption: "Chapter formal — third-party vendor, sober transportation", tag: "Formals", objectPosition: "center 50%" },
  { slug: "DU80cXJidhH", caption: "Dry fundraiser dinner — donations to the Leukemia & Lymphoma Society", tag: "Service" },
  { slug: "DUBvmpfktF3", caption: "Above-average chapter GPA", tag: "Scholarship" },
  { slug: "DXzzTaFjSyj", caption: "Brother of the Month spotlight", tag: "Leadership", objectPosition: "center 40%" },
  { slug: "DW9-fTTibRF", caption: "Welcome to our newest brothers", tag: "New members", objectPosition: "center 45%" },
  { slug: "DT0irEWEdT-", caption: "Chapter celebration", tag: "Brotherhood" },
  { slug: "DSXMOLhERFH", caption: "Fall Rush 2026 — sign up", tag: "Rush" },
  { slug: "DSGFt3REoty", caption: "Brother of the Month spotlight", tag: "Leadership", objectPosition: "center 40%" },
  // Removed slug DRzyoVciZCh ("Chapter leadership") — its og:image was scraping as
  // the generic Instagram app icon, not the actual post photo. If/when the chapter
  // posts a real leadership photo, add a fresh slug back here.
];

const DEFAULT_OBJECT_POSITION = "center 60%";

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
          rel="noreferrer noopener"
          aria-label={`Open ${p.caption} on Instagram`}
          className={cn(
            "group relative rounded-2xl overflow-hidden border border-border bg-secondary lift",
            // Feature tile (first card) gets Instagram's native portrait ratio (4:5)
            // and spans 2x2 on tablet+ so it gets the visual weight it deserves.
            // Other tiles are square — IG's smaller tile shape — so face/subject
            // photos crop predictably.
            i === 0
              ? "aspect-[4/5] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[480px]"
              : "aspect-square"
          )}
        >
          <img
            src={`/api/photo/${p.slug}?w=640`}
            srcSet={`/api/photo/${p.slug}?w=320 320w, /api/photo/${p.slug}?w=480 480w, /api/photo/${p.slug}?w=640 640w, /api/photo/${p.slug}?w=960 960w`}
            sizes={i === 0 ? "(min-width: 1024px) 480px, 50vw" : "(min-width: 1024px) 240px, 33vw"}
            alt={`Phi Sigma Kappa Gamma Triton at USC — ${p.caption}`}
            width={520}
            height={i === 0 ? 650 : 520}
            // The IG feed is ~3 viewports below the fold, so every tile is
            // eligible for lazy-loading. Only the hero PostTile in app/page.tsx
            // gets loading=eager + fetchpriority=high (LCP candidate).
            loading="lazy"
            decoding="async"
            className="photo-grade absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ objectPosition: p.objectPosition || DEFAULT_OBJECT_POSITION }}
          />
          {/* Two-way gradient overlay so caption + IG badge both stay legible
              regardless of where the photo's bright/dark areas land. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" aria-hidden />

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
              "mt-2 text-white font-medium leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]",
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
            rel="noreferrer noopener"
            aria-label={`Open ${p.caption} on Instagram`}
            className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary lift"
          >
            <img
              src={`/api/photo/${p.slug}?w=320`}
              srcSet={`/api/photo/${p.slug}?w=320 320w, /api/photo/${p.slug}?w=480 480w, /api/photo/${p.slug}?w=640 640w`}
              sizes="(min-width: 640px) 25vw, 50vw"
              alt={`Phi Sigma Kappa Gamma Triton at USC — ${p.caption}`}
              width={320}
              height={320}
              loading="lazy"
              className="photo-grade absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ objectPosition: p.objectPosition || DEFAULT_OBJECT_POSITION }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </Link>
        ))}
      </div>
      <div className="text-center">
        <Link
          href="https://www.instagram.com/phisig_usc/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
        >
          <Instagram className="h-4 w-4" /> See more on @phisig_usc
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
