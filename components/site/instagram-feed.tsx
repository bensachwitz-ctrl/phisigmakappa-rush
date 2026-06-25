"use client";

import { Instagram, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Crest } from "@/components/brand/wordmark";
import { SmartImage } from "@/components/site/smart-image";
import { cn } from "@/lib/utils";

// A single feed tile. Driven by the per-chapter `feed.json` repeater in
// SiteConfig — NEVER hardcoded — so no tenant ever ships another chapter's real
// Instagram posts. `slug` is an IG post code (proxied via /api/photo/[slug]) or
// a full image URL; `objectPosition` is per-post crop control (defaults to
// "center 60%": subjects in action photos usually live in the lower 2/3, so a
// dead-center crop tends to keep too much sky on outdoor shots).
export type FeedPost = {
  slug: string;
  caption: string;
  tag: string;
  objectPosition?: string;
};

const DEFAULT_OBJECT_POSITION = "center 60%";

// Resolve a post's image source: a full http(s) URL renders as-is; a bare slug
// goes through the /api/photo proxy with a responsive ?w= set.
function isUrl(slug: string) {
  return /^https?:\/\//.test(slug);
}
function imgFor(slug: string, w: number) {
  return isUrl(slug) ? slug : `/api/photo/${slug}?w=${w}`;
}
function srcSetFor(slug: string, widths: number[]) {
  if (isUrl(slug)) return undefined;
  return widths.map((w) => `/api/photo/${slug}?w=${w} ${w}w`).join(", ");
}
function hrefFor(slug: string, fallbackUrl: string) {
  return isUrl(slug) ? slug : `https://www.instagram.com/p/${slug}/`;
}

// White-label empty state — when a chapter hasn't wired its own feed yet we
// render the designed cardinal-gradient Crest tile (brand-tinted via the
// --phisig-red CSS var, so it recolors per tenant) instead of leaking another
// chapter's photos. Mirrors the PostTile fallback used in the hero collage.
function CrestFallbackTile({
  className,
  label = "Chapter life",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden border border-border lift block",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark flex items-center justify-center pointer-events-none">
        <Crest className="h-16 w-16 text-white/25" aria-hidden="true" />
      </div>
      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
        <Instagram className="h-3 w-3" aria-hidden="true" /> {label}
      </span>
    </div>
  );
}

export function InstagramFeed({
  posts = [],
  handle,
  handleUrl,
  count = 9,
  className,
}: {
  /** Per-chapter feed tiles from the `feed.json` SiteConfig repeater. */
  posts?: FeedPost[];
  /** Chapter IG handle (e.g. "@kappadelta_clemson") from cfg. */
  handle?: string;
  /** Chapter IG profile URL from cfg. */
  handleUrl?: string;
  count?: number;
  className?: string;
}) {
  const visible = posts.slice(0, count);

  // No posts configured for this tenant → branded Crest empty-state grid so the
  // section still reads as designed (never another chapter's photos, never a
  // broken /api/photo//404). The fallback fills the same 2×2 feature footprint.
  if (visible.length === 0) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 stagger", className)}>
        <CrestFallbackTile className="aspect-[4/5] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[480px]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <CrestFallbackTile key={i} className="aspect-square" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 stagger", className)}>
      {visible.map((p, i) => (
        <Link
          key={`${p.slug}-${i}`}
          href={hrefFor(p.slug, handleUrl || "")}
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
          <SmartImage
            src={imgFor(p.slug, 640)}
            srcSet={srcSetFor(p.slug, [320, 480, 640, 960])}
            sizes={i === 0 ? "(min-width: 1024px) 480px, 50vw" : "(min-width: 1024px) 240px, 33vw"}
            alt={`Chapter life - ${p.caption}`}
            width={520}
            height={i === 0 ? 650 : 520}
            // The IG feed is ~3 viewports below the fold, so every tile is
            // eligible for lazy-loading.
            loading="lazy"
            decoding="async"
            className="photo-grade absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ objectPosition: p.objectPosition || DEFAULT_OBJECT_POSITION }}
            fallbackLabel={p.tag}
          />
          {/* Two-way gradient overlay so caption + IG badge both stay legible
              regardless of where the photo's bright/dark areas land. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" aria-hidden />

          {/* Top-right Instagram badge — chapter handle from cfg (white-label). */}
          {handle && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
              <Instagram className="h-3 w-3" /> {handle}
            </span>
          )}

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

export function InstagramStrip({
  posts = [],
  handle,
  handleUrl,
}: {
  posts?: FeedPost[];
  handle?: string;
  handleUrl?: string;
}) {
  const visible = posts.slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visible.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <CrestFallbackTile key={i} className="aspect-square" />
            ))
          : visible.map((p, i) => (
              <Link
                key={`${p.slug}-${i}`}
                href={hrefFor(p.slug, handleUrl || "")}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`Open ${p.caption} on Instagram`}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary lift"
              >
                <SmartImage
                  src={imgFor(p.slug, 320)}
                  srcSet={srcSetFor(p.slug, [320, 480, 640])}
                  sizes="(min-width: 640px) 25vw, 50vw"
                  alt={`Chapter life - ${p.caption}`}
                  width={320}
                  height={320}
                  loading="lazy"
                  className="photo-grade absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{ objectPosition: p.objectPosition || DEFAULT_OBJECT_POSITION }}
                  crestClassName="h-12 w-12"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </Link>
            ))}
      </div>
      {handle && handleUrl && (
        <div className="text-center">
          <Link
            href={handleUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
          >
            <Instagram className="h-4 w-4" /> See more on {handle}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
