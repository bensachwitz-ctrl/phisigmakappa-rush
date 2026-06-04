import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GREEKSTACK BRAND MARK — the bespoke PNG app-tile.
 * ------------------------------------------------------------------
 * The mark is a premium, pre-rendered graphic: a dark-navy rounded app-tile
 * with a royal-blue "GS" monogram seated under a gold pediment. It lives on disk
 * at /brand/greekstack-mark.png (512×512) and is served straight from /public —
 * no inline SVG, no Satori dependency, so the brand can never drift between the
 * site, the favicon pipeline, or an OG card: every surface points at the one
 * canonical file.
 *
 * `GreekstackLogo` renders that file as a plain <img>:
 *   • rounded corners (the source already has a rounded silhouette; the radius
 *     here just keeps the AA edge crisp on every background);
 *   • EXPLICIT intrinsic width/height (512×512) so the browser reserves the
 *     correct square box and the painted size is driven purely by the height /
 *     width utility classes — locking the aspect ratio means ZERO layout shift;
 *   • alt="" because the mark is decorative wherever it appears beside the
 *     "Greekstack" wordmark (the text carries the name); a standalone `title`
 *     prop still flows through to the element's `title`/`aria-label` for the
 *     rare icon-only placement.
 *
 * The exported surface — names, props, and signatures (`GreekstackLogo`,
 * `GreekstackWordmark`) — is UNCHANGED, so every existing consumer keeps working
 * without edits. The old inline-SVG "Stacked G" mark (and its `variant="mono"`
 * single-ink path) has been removed; `variant` is accepted and ignored for
 * source compatibility.
 */

type LogoVariant = "tile" | "mono";

const MARK_SRC = "/brand/greekstack-mark.png";

export function GreekstackLogo({
  className,
  title = "Greekstack",
  // `variant` is retained for prop-compatibility with prior callers but no
  // longer changes the rendering — the mark is a single bespoke graphic.
  variant: _variant,
  loading = "eager",
  ...rest
}: {
  className?: string;
  title?: string;
  variant?: LogoVariant;
  loading?: "eager" | "lazy";
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "className" | "title" | "src" | "alt" | "loading">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- public pages use the
    // <img> proxy pattern, not next/image (see next.config.js images note).
    <img
      src={MARK_SRC}
      alt=""
      // Decorative by default; expose the name to AT only when a caller is using
      // the mark on its own (passes a title) so an icon-only logo still announces.
      aria-label={title}
      width={512}
      height={512}
      decoding="async"
      loading={loading}
      // The utilities control the PAINTED size (e.g. h-8 w-8); the intrinsic
      // 512×512 above keeps the box square so there's no reflow as it loads.
      className={cn("inline-block rounded-[22%] object-contain", className || "h-8 w-8")}
      {...rest}
    />
  );
}

/**
 * GREEKSTACK WORDMARK LOCKUP — the PNG mark + "Greekstack".
 *
 * The "Greek" reads in the foreground ink and "stack" in the platform gradient,
 * so the name itself encodes the brand split. Premium, confident tracking with
 * a hair of negative letter-spacing; the mark and type scale together so the
 * lockup stays optically balanced at every size, with mark-to-text spacing tuned
 * per preset.
 *
 * Props (unchanged signature — safe for all existing consumers):
 *   • size       — preset that scales BOTH the mark and the type together.
 *   • variant    — "default" (gradient "stack") | "mono" (single-ink, footer-safe).
 *   • className   — wrapper overrides.
 *   • markClassName / textClassName — escape hatches for fine control.
 */
const SIZE_MAP = {
  sm: { mark: "h-7 w-7", text: "text-base", gap: "gap-2" },
  md: { mark: "h-8 w-8", text: "text-xl", gap: "gap-2.5" },
  lg: { mark: "h-10 w-10", text: "text-2xl", gap: "gap-3" },
  xl: { mark: "h-12 w-12", text: "text-3xl", gap: "gap-3.5" },
} as const;

export function GreekstackWordmark({
  className,
  size = "md",
  variant = "default",
  markClassName,
  textClassName,
  title = "Greekstack",
}: {
  className?: string;
  size?: keyof typeof SIZE_MAP;
  variant?: "default" | "mono";
  markClassName?: string;
  textClassName?: string;
  title?: string;
}) {
  const s = SIZE_MAP[size];
  const mono = variant === "mono";
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <GreekstackLogo title={title} className={markClassName || s.mark} />
      <span
        className={cn(
          // -0.02em tracking + tight leading = a settled, premium wordmark.
          "font-bold leading-none tracking-[-0.02em]",
          textClassName || s.text
        )}
      >
        {mono ? (
          <span>Greekstack</span>
        ) : (
          <>
            <span className="text-foreground">Greek</span>
            <span className="gs-gradient-text">stack</span>
          </>
        )}
      </span>
    </span>
  );
}
