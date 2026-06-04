/**
 * Centralized image `src` resolver for member headshots / avatars and chapter
 * photos. SELF-CONTAINED + isomorphic (no server-only deps), so it is safe to
 * import from both `"use client"` components and server components — it never
 * pulls the Cloudinary Node SDK into the client bundle.
 *
 * It preserves the EXISTING render behavior exactly and only adds a Cloudinary
 * fast-path on top:
 *
 *   1. Cloudinary delivery URL → rewritten to an auto-format / auto-quality
 *      (and optionally sized / face-cropped) delivery URL served directly from
 *      Cloudinary's transform CDN. Pure string manipulation on the URL — no SDK.
 *   2. Any other absolute URL (Vercel Blob, etc.) → returned UNCHANGED (same as
 *      the prior `/^https?:\/\//.test(x) ? x : ...` branch).
 *   3. A bare slug (Instagram post id, etc.) → `/api/photo/<slug>` proxy, exactly
 *      as before.
 *
 * When Cloudinary isn't in use, branch (1) never fires (no value will be a
 * res.cloudinary.com URL), so every existing value renders byte-for-byte as it
 * does today — zero regression for Blob / Instagram images.
 */

export interface OptimizeOptions {
  w?: number;
  h?: number;
  /** Cloudinary crop mode, e.g. "fill" | "thumb" | "scale" | "limit". */
  crop?: string;
  /** Cloudinary gravity, e.g. "face" | "faces" | "auto". */
  gravity?: string;
  /** Quality token, default "auto". */
  quality?: string | number;
  /** Format token, default "auto". */
  format?: string;
}

/**
 * Matches a Cloudinary delivery URL whose bytes we can re-transform:
 *   https://res.cloudinary.com/<cloud>/image/upload/.../<public_id>.<ext>
 */
const CLOUDINARY_URL_RE =
  /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\//i;

/** True if a string looks like a Cloudinary delivery URL. */
export function isCloudinaryUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return CLOUDINARY_URL_RE.test(value);
}

/**
 * Build the transformation segment, e.g. `f_auto,q_auto,w_160,h_160,c_fill,g_face`.
 * Only includes the params that were supplied; always sets f_auto + q_auto
 * (overridable) for modern-format, right-sized delivery.
 */
function buildTransform(opts: OptimizeOptions): string {
  const parts: string[] = [
    `f_${opts.format ?? "auto"}`,
    `q_${opts.quality ?? "auto"}`,
  ];
  if (opts.w) parts.push(`w_${opts.w}`);
  if (opts.h) parts.push(`h_${opts.h}`);
  if (opts.crop) parts.push(`c_${opts.crop}`);
  if (opts.gravity) parts.push(`g_${opts.gravity}`);
  return parts.join(",");
}

/**
 * Rewrite a Cloudinary delivery URL to apply (or replace) a transformation
 * segment immediately after `/upload/`. Idempotent enough for our use: if the
 * URL already carries a leading transformation segment, it is replaced; a
 * `v<digits>/` version segment and the public id are preserved.
 *
 * Returns the input unchanged if it isn't a recognizable Cloudinary URL.
 */
export function optimizedCloudinaryUrl(
  url: string,
  opts: OptimizeOptions = {}
): string {
  if (!isCloudinaryUrl(url)) return url;
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  let rest = url.slice(idx + marker.length);

  // If the first segment is an existing transformation (contains transform
  // tokens like "w_400,c_fill" and isn't a version "v123"), drop it — we set
  // our own. A folder/public-id segment never matches the transform-token shape.
  const firstSlash = rest.indexOf("/");
  if (firstSlash > 0) {
    const firstSeg = rest.slice(0, firstSlash);
    const looksLikeTransform =
      /(^|,)[a-z]{1,3}_[^/,]+/i.test(firstSeg) && !/^v\d+$/i.test(firstSeg);
    if (looksLikeTransform) {
      rest = rest.slice(firstSlash + 1);
    }
  }

  return `${prefix}${buildTransform(opts)}/${rest}`;
}

/**
 * Resolve the `src` for any stored image value (headshot, chapter photo, slug).
 * See module docstring for the three branches.
 */
export function imageSrc(
  value: string | null | undefined,
  optimize?: OptimizeOptions
): string {
  const v = (value || "").trim();
  if (!v) return "";

  // Cloudinary asset → optimized delivery URL (bypasses /api/photo; Cloudinary
  // is not on that proxy's SSRF allowlist and does its own optimization).
  if (isCloudinaryUrl(v)) {
    return optimizedCloudinaryUrl(v, optimize);
  }

  // Existing behavior preserved: absolute URLs + data URIs pass through; bare
  // slugs go through the photo proxy.
  if (/^https?:\/\//i.test(v) || v.startsWith("data:")) {
    return v;
  }
  return `/api/photo/${v}`;
}

/**
 * Avatar/headshot `src` — same routing as imageSrc(), but Cloudinary assets get
 * a square, face-cropped, auto-format thumbnail. Non-Cloudinary values are
 * untouched (Blob URL as-is, slug → proxy), so existing avatars don't regress.
 *
 * @param size  Pixel box (width = height) for the Cloudinary face-crop. Default 160.
 */
export function avatarSrc(value: string | null | undefined, size = 160): string {
  return imageSrc(value, { w: size, h: size, crop: "fill", gravity: "face" });
}
