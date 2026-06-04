import { v2 as cloudinary } from "cloudinary";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";

/**
 * Cloudinary integration — ADDITIVE and fully optional.
 *
 * This module layers image upload + delivery optimization on top of the
 * existing Vercel Blob storage. It is INERT unless the Cloudinary env vars are
 * present: every public function degrades to a no-op / safe passthrough when
 * `isCloudinaryConfigured()` is false, so the app builds and behaves EXACTLY as
 * before when Cloudinary is unconfigured.
 *
 * Required server env (all optional):
 *   - CLOUDINARY_CLOUD_NAME
 *   - CLOUDINARY_API_KEY
 *   - CLOUDINARY_API_SECRET
 * Optional public env (for client-side <CldImage> / delivery, if ever needed):
 *   - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *
 * Nothing here touches Blob: callers branch on `isCloudinaryConfigured()` and
 * keep the Blob path byte-for-byte unchanged in the else branch.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

let configured = false;

/**
 * Configure the server SDK once, lazily. Returns true only when all three
 * server credentials are present. Safe to call repeatedly.
 */
function ensureConfigured(): boolean {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) return false;
  if (!configured) {
    cloudinary.config({
      cloud_name: CLOUD_NAME,
      api_key: API_KEY,
      api_secret: API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return true;
}

/**
 * True when the full server-side Cloudinary credential set is present. Upload
 * routes gate on this — false means "use the existing Blob/storage path".
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

/**
 * The public cloud name, preferring the NEXT_PUBLIC_ var (for any client-side
 * <CldImage>) and falling back to the server var. Empty string when unset —
 * callers should treat empty as "not configured".
 */
export function cloudinaryCloudName(): string {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || CLOUD_NAME || "";
}

export type UploadImageInput = Buffer | string;

export interface UploadImageOptions {
  /** Per-tenant folder, e.g. `greekstack/<subdomain>`. */
  folder?: string;
  /** Optional deterministic public id (without folder/extension). */
  publicId?: string;
}

export interface UploadImageResult {
  /** The Cloudinary secure (https) delivery URL. */
  url: string;
  /** The Cloudinary public id (includes folder path, no extension). */
  publicId: string;
}

/**
 * Upload an image to Cloudinary. `input` is either a Buffer (raw bytes) or a
 * data-URI string (`data:image/...;base64,...`). Returns the secure URL +
 * public id. Throws if Cloudinary is unconfigured — callers must gate on
 * `isCloudinaryConfigured()` first.
 */
export async function uploadImage(
  input: UploadImageInput,
  opts: UploadImageOptions = {}
): Promise<UploadImageResult> {
  if (!ensureConfigured()) {
    throw new Error("Cloudinary is not configured");
  }

  const options: UploadApiOptions = {
    resource_type: "image",
    // Cloudinary's auto-format/auto-quality on the *stored* asset's defaults.
    // Delivery-time transforms are applied separately via optimizedUrl().
    overwrite: true,
    invalidate: true,
  };
  if (opts.folder) options.folder = opts.folder;
  if (opts.publicId) options.public_id = opts.publicId;

  const result: UploadApiResponse = await (typeof input === "string"
    ? cloudinary.uploader.upload(input, options)
    : uploadBuffer(input, options));

  return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Buffer upload via upload_stream wrapped in a promise (the SDK's stream API
 * is callback-based). Kept private; uploadImage() picks this for Buffer input.
 */
function uploadBuffer(
  buf: Buffer,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, res) => {
      if (err || !res) {
        reject(err || new Error("Cloudinary upload returned no result"));
        return;
      }
      resolve(res);
    });
    stream.end(buf);
  });
}

export interface OptimizeOptions {
  w?: number;
  h?: number;
  /** Cloudinary crop mode, e.g. "fill" | "thumb" | "scale" | "limit". */
  crop?: string;
  /** Cloudinary gravity, e.g. "face" | "faces" | "auto". */
  gravity?: string;
  /** Quality, default "auto". */
  quality?: string | number;
  /** Format, default "auto". */
  format?: string;
}

/**
 * Match the delivery host shape of a Cloudinary URL:
 *   https://res.cloudinary.com/<cloud>/image/upload/.../<public_id>.<ext>
 * (also tolerates a custom CNAME's `/<cloud>/image/upload/` path layout via the
 * generic `/image/upload/` segment check).
 */
const CLOUDINARY_URL_RE =
  /^https?:\/\/[^/]*res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\//i;

/**
 * True if a string looks like a Cloudinary delivery URL we can re-transform.
 */
export function isCloudinaryUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return CLOUDINARY_URL_RE.test(value);
}

/**
 * Extract the public id (folder path + name, no extension, no version) from a
 * Cloudinary delivery URL. Returns null if the URL doesn't parse as Cloudinary.
 * Strips any existing transformation segment and the leading `v<digits>/`
 * version so we can rebuild a fresh transformed URL.
 */
function publicIdFromUrl(url: string): string | null {
  const m = url.match(/\/(?:image|video|raw)\/upload\/(.+)$/i);
  if (!m) return null;
  let rest = m[1];
  // Drop the trailing extension on the last path segment.
  rest = rest.replace(/\.[a-zA-Z0-9]+$/, "");
  const segments = rest.split("/");
  // Remove a leading transformation segment if present. Transformation segments
  // contain comma- or underscore-delimited param tokens like "w_400,c_fill".
  // A version segment is "v123456". A real public id can contain slashes
  // (folders) but its segments never look like "x_y" transform tokens, so we
  // only strip the FIRST segment when it's clearly a transformation.
  if (segments.length > 1 && /(^|,)[a-z]{1,3}_[^/]+/i.test(segments[0]) && !/^v\d+$/.test(segments[0])) {
    segments.shift();
  }
  // Remove a leading version segment (v123456) if present.
  if (segments.length > 1 && /^v\d+$/.test(segments[0])) {
    segments.shift();
  }
  const publicId = segments.join("/");
  return publicId || null;
}

/**
 * Build an auto-format / auto-quality optimized delivery URL for a Cloudinary
 * asset. Accepts either a Cloudinary delivery URL or a bare public id.
 *
 * SAFETY: returns the input UNCHANGED when Cloudinary is unconfigured or when
 * the input is not a Cloudinary URL/public id we recognize. This guarantees
 * existing Vercel Blob / Instagram-slug values pass through untouched — no
 * regression for non-Cloudinary images.
 *
 * For avatars, pass `{ crop: "fill", gravity: "face" }` to face-crop.
 */
export function optimizedUrl(
  urlOrPublicId: string | null | undefined,
  opts: OptimizeOptions = {}
): string {
  const input = urlOrPublicId || "";
  // Unconfigured → never rewrite anything.
  if (!isCloudinaryConfigured()) return input;
  if (!input) return input;

  let publicId: string | null = null;
  if (isCloudinaryUrl(input)) {
    publicId = publicIdFromUrl(input);
  } else if (!/^https?:\/\//i.test(input) && !input.startsWith("data:")) {
    // Treat a bare, non-URL, non-data-URI token as a public id.
    publicId = input;
  }

  // Not a Cloudinary asset (Blob URL, IG slug, data URI, unparseable) → as-is.
  if (!publicId) return input;

  if (!ensureConfigured()) return input;

  try {
    const transformation: Record<string, unknown> = {
      quality: opts.quality ?? "auto",
      fetch_format: opts.format ?? "auto",
    };
    if (opts.w) transformation.width = opts.w;
    if (opts.h) transformation.height = opts.h;
    if (opts.crop) transformation.crop = opts.crop;
    if (opts.gravity) transformation.gravity = opts.gravity;

    return cloudinary.url(publicId, {
      secure: true,
      transformation: [transformation],
    });
  } catch {
    // Any SDK hiccup → return the original input rather than a broken URL.
    return input;
  }
}
