"use client";

/**
 * SmartImage — a hardened <img> that can NEVER render a broken-image
 * placeholder. The owner reported a broken "Chapter announcement" image on a
 * generated chapter site: that happens when a per-chapter photo slug doesn't
 * resolve through the /api/photo proxy (or the config value is empty), so the
 * native <img> shows the browser's broken-image glyph.
 *
 * This wrapper guarantees a graceful, ON-BRAND outcome instead:
 *   • Empty/whitespace `src` → never attempts a load; renders the fallback.
 *   • Runtime load error (404 / blocked / decode fail) → swaps to the fallback.
 *
 * The fallback is a cardinal-gradient tile with the chapter Crest (recolored per
 * tenant via the --brand-red CSS var) — the SAME branded empty-state language
 * already used by the Instagram feed + hero collage, so a missing photo looks
 * deliberate, not broken. Transparent by construction (no baked dark box).
 *
 * Drop-in: same props as <img>; pass a `label` for an optional caption chip and
 * `fallbackClassName` to tune the gradient layer. Decorative crest is aria-hidden.
 */

import * as React from "react";
import { Crest } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

export interface SmartImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Optional caption shown on the fallback tile (e.g. "Chapter life"). */
  fallbackLabel?: string;
  /** Extra classes for the fallback gradient layer. */
  fallbackClassName?: string;
  /** Crest size class on the fallback (default h-16 w-16). */
  crestClassName?: string;
}

export function SmartImage({
  src,
  alt = "",
  className,
  fallbackLabel,
  fallbackClassName,
  crestClassName,
  ...rest
}: SmartImageProps) {
  const cleanSrc = typeof src === "string" ? src.trim() : src;
  const hasSrc = Boolean(cleanSrc);
  const [failed, setFailed] = React.useState(false);

  // If the src changes (e.g. tenant reskin in the demo), give it another chance.
  React.useEffect(() => {
    setFailed(false);
  }, [cleanSrc]);

  const showFallback = !hasSrc || failed;

  if (showFallback) {
    return (
      <span
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-brand-red via-brand-red-dark to-brand-red-dark text-white",
          fallbackClassName,
        )}
        aria-hidden={alt ? undefined : true}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        <Crest className={cn("text-white/30", crestClassName || "h-16 w-16")} aria-hidden="true" />
        {fallbackLabel ? (
          <span className="mt-2 text-[11px] font-semibold tracking-wide text-white/80">
            {fallbackLabel}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cleanSrc as string}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

/**
 * AvatarImage — a circular headshot that falls back to brand-gradient initials
 * if the photo is missing or 404s. Used for e-board / member cards where the
 * fallback must be an inline circle (not an absolute-positioned overlay), so it
 * can't use <SmartImage>'s overlay fallback. Mirrors the existing initials tile
 * those cards already render when no headshot is configured.
 */
export function AvatarImage({
  src,
  alt = "",
  initials,
  className,
  fallbackClassName,
  ...rest
}: SmartImageProps & { initials: string }) {
  const cleanSrc = typeof src === "string" ? src.trim() : src;
  const hasSrc = Boolean(cleanSrc);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [cleanSrc]);

  if (!hasSrc || failed) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-red to-brand-red-dark text-white font-semibold",
          fallbackClassName || className,
        )}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cleanSrc as string}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

export default SmartImage;
