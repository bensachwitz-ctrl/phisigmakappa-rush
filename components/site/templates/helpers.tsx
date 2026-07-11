import React from "react";
import { Crest } from "@/components/brand/wordmark";
import { SmartImage } from "@/components/site/smart-image";
import { imageSrc, isCloudinaryUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import { IconCrown as Crown, IconStanding as Trophy, IconService as HandHeart, IconMembers as Users, IconAward as Award, IconStar as Star, IconHeart as Heart, IconGraduation as GraduationCap, IconLibrary as BookOpen, IconMusic as Music, IconBuilding as Building2, IconFlame as Flame, IconShieldCheck as ShieldCheck, IconCalendar as Calendar, IconPin as MapPin } from "@/components/brand/icons";
import { type GsIcon as LucideIcon } from "@/components/brand/icons";

/* ── Chapter-brand motion tokens ──────────────────────────────────────────
   Every decorative animation layer on the page is tinted to the CHAPTER's
   brand, never the platform indigo. These read the same runtime CSS vars the
   rest of the build themes through (set per-tenant in app/layout.tsx), so a
   navy/gold or maroon chapter recolors its orbs, glows, and tilts for free.

 - BRAND_ORB_COLORS: the three drifting hero orbs (FloatingOrbs `colors`).
     --brand-primary* are hex; a solid hex still fades cleanly to transparent
     inside the orb's radial gradient.
 - BRAND_TILT_GLOW: the cursor-following 3D-tilt spotlight. Uses the --primary
     HSL triple so we can dial the alpha down to a tasteful glow (a full-opacity
     hex would read as a harsh wash). */
export const BRAND_ORB_COLORS = [
  "var(--brand-primary)",
  "var(--brand-primary-dark)",
  "var(--brand-primary-soft)",
];
export const BRAND_TILT_GLOW = "hsl(var(--primary) / 0.28)";

// Map config string → icon component
export function iconFor(name: string): React.ElementType {
  const map: Record<string, React.ElementType> = {
    Crown, Trophy, HandHeart, Users, Award, Star, Heart, GraduationCap,
    BookOpen, Music, Building2, Flame, ShieldCheck, Calendar, MapPin,
  };
  return map[name] || Crown;
}

// Same lookup, but typed as LucideIcon for the shared <IconChip> foundation
// component (its `icon` prop is LucideIcon, not the looser React.ElementType).
// All entries above are lucide-react icons, so the cast is safe.
export function chipIconFor(name: string): LucideIcon {
  return iconFor(name) as LucideIcon;
}

/**
 * Standardized section eyebrow — a small brand-tinted pill.
 * Text-only eyebrow pill — clean type, tracking, hairline border. Decorative
 * glyphs were purged from every badge/eyebrow pill (owner round-9: the
 * glyph-in-pill pattern reads as AI slop even with bespoke icons). Brand-toned
 * via phisig-red (the chapter color), so it reads for any tenant palette.
 */
export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-phisig-red/20 bg-phisig-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">
      {children}
    </span>
  );
}

/**
 * BrandShimmer — a slow, premium animated gradient ring tinted to the CHAPTER
 * brand, wrapped around a primary CTA (or the form panel). It mirrors the
 * platform `.gs-shimmer-border` technique but, because that utility is hardwired
 * to the Greekstack blue→sky→gold palette, we recolor it here to the live
 * per-tenant primary (`hsl(var(--primary))`) so the rush site never shows
 * platform colors.
 *
 * Self-contained + additive: the spin reuses the existing `gs-border-spin`
 * keyframe already defined in app/globals.css (we do NOT redefine it). The ring
 * sits OUTSIDE the child via a padding-box mask, so it never clips the button.
 * Reduced-motion-safe: the global `prefers-reduced-motion` block in globals.css
 * already collapses every `animation` to a ~0ms instant, so the ring renders as
 * a static brand gradient with no spin for vestibular-sensitive users. Purely
 * decorative — the real, focusable element is the child.
 */
export function BrandShimmer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // padding-box mask carves the 1.5px ring; the conic gradient is brand-tinted
  // (primary → soft primary → transparent) and shares the global spin keyframe.
  const maskStyle: React.CSSProperties = {
    padding: "1.5px",
    background:
      "conic-gradient(from 0deg, hsl(var(--primary) / 0) 0deg, hsl(var(--primary)) 80deg, hsl(var(--primary) / 0.55) 170deg, hsl(var(--primary) / 0) 300deg)",
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    maskComposite: "exclude",
    animation: "gs-border-spin 6s linear infinite",
  };
  return (
    <span className={cn("relative inline-flex isolate", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
        style={maskStyle}
      />
      {children}
    </span>
  );
}

export function ContactPill({
  icon: Icon, label, sub,
}: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="group rounded-xl border border-border bg-card p-3 lift transition-colors hover:border-phisig-red/30">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-phisig-red shrink-0 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * Renders a chapter photo. The "slug" can be either:
 *   1. An Instagram post code (e.g. "DRzyoVciZCh") — proxied through /api/photo
 *   2. A direct image URL (e.g. https://...vercel-storage.com/...) from the admin upload
 * Falls back to a designed cardinal-red Crest tile if the photo can't load.
 */
export function PostTile({
  slug, caption, icon: Icon, className, priority,
}: {
  slug: string;
  caption: string;
  icon: React.ElementType;
  className?: string;
  priority?: boolean;
}) {
  // No photo configured (white-labeled / unset slug) → render the designed
  // fallback tile only; never request /api/photo/ with an empty slug (404) nor
  // link to a broken instagram.com/p// URL. New chapters with no IG posts hit this.
  if (!slug || !slug.trim()) {
    return (
      <div className={`group relative rounded-2xl overflow-hidden border border-border lift block aspect-square ${className ?? ""}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark flex items-center justify-center pointer-events-none">
          <Crest className="h-20 w-20 text-white/25" aria-hidden="true" />
        </div>
        <span className="absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
          <Icon className="h-3 w-3" aria-hidden="true" /> {caption}
        </span>
      </div>
    );
  }
  const isUrl = /^https?:\/\//.test(slug);
  const cloud = isCloudinaryUrl(slug);
  // Cloudinary assets get a sized auto-format delivery URL + a Cloudinary
  // responsive srcSet. Everything else keeps the exact prior behavior: a full
  // (Blob/IG-CDN) URL renders as-is with no srcSet; a bare slug goes through the
  // /api/photo proxy with its ?w= responsive set.
  const imgSrc = cloud
    ? imageSrc(slug, { w: 960, crop: "limit" })
    : isUrl
      ? slug
      : `/api/photo/${slug}`;
  const cloudSrcSet = cloud
    ? [480, 960, 1280, 1600]
        .map((w) => `${imageSrc(slug, { w, crop: "limit" })} ${w}w`)
        .join(", ")
    : undefined;
  const linkHref = isUrl ? slug : `https://www.instagram.com/p/${slug}/`;
  return (
    <a
      href={linkHref}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`View ${caption} on Instagram`}
      className={`group relative rounded-2xl overflow-hidden border border-border lift block ${className ?? ""}`}
    >
      {/* Fallback layer — cardinal gradient with chapter crest, visible until the
          image loads. <SmartImage> ALSO renders this exact tile if the src is
          empty or 404s, so a missing photo never shows a broken-image glyph. */}
      <div className="absolute inset-0 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark flex items-center justify-center pointer-events-none">
        <Crest className="h-20 w-20 text-white/25" aria-hidden="true" />
      </div>
      <SmartImage
        src={imgSrc}
        // Responsive srcset — phones get a 480-width WebP, tablets 960, 4K
        // displays 1600. Photo proxy honors ?w= and snaps to ALLOWED_WIDTHS;
        // Cloudinary assets emit an equivalent Cloudinary-sized srcSet. A direct
        // (Blob) URL keeps no srcSet, exactly as before.
        srcSet={cloud ? cloudSrcSet : isUrl ? undefined : `/api/photo/${slug}?w=480 480w, /api/photo/${slug}?w=960 960w, /api/photo/${slug}?w=1280 1280w, /api/photo/${slug}?w=1600 1600w`}
        sizes={priority ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 50vw"}
        alt={`Chapter life - ${caption}`}
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className={`relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${priority ? "animate-ken-burns-in" : ""}`}
        fallbackLabel={caption}
        crestClassName="h-20 w-20"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-20" />
      <span className="absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm pointer-events-none">
        <Icon className="h-3 w-3" aria-hidden="true" /> {caption}
      </span>
    </a>
  );
}
