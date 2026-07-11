import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { getSubdomain } from "@/lib/prisma";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Item 2 — per-section image upload. Unlike the raw /api/upload-photo passthrough,
// this route PROCESSES the image server-side with sharp before storing it: it
// downscales to a sane max dimension, re-encodes to a web-optimized format, and
// strips EXIF/metadata (privacy + size). So a chapter photographer's 8MB phone
// photo lands as a ~200KB web asset on Vercel Blob, and every section's hero/photo
// slot gets a fast, correctly-oriented image without the admin resizing anything.

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB in; sharp shrinks it hard on the way out
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif", "image/avif"];
// Per-section target max dimension. The hero is full-bleed (wants more pixels);
// portrait cards (about/spotlight) and logos need far fewer. Data-driven so a new
// section slot just adds a key; unknown sections fall back to a safe default.
const SECTION_MAX_DIM: Record<string, number> = {
  hero: 2000,
  about: 1200,
  spotlight: 1200,
  logo: 512,
  default: 1600,
};

function maxDimFor(section: string | null): number {
  return (section && SECTION_MAX_DIM[section]) || SECTION_MAX_DIM.default;
}

/**
 * POST /api/upload-section-image — admin-only. Accepts multipart `file` (+ an
 * optional `section` hint) and returns a public URL to a sharp-optimized WebP.
 * Cloudinary is used when configured; else Vercel Blob; else a data-URL mock in
 * dev with no BLOB token. Non-admins get 403 even when signed in as a brother.
 */
export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const section = (form.get("section") as string | null)?.toString().slice(0, 40) || null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }
    const blob = file as File;
    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 15 MB)" }, { status: 413 });
    }
    if (blob.type && !ALLOWED.includes(blob.type)) {
      return NextResponse.json({ ok: false, error: "Only JPG, PNG, WEBP, HEIC, GIF, AVIF allowed" }, { status: 415 });
    }

    const inputBuf = Buffer.from(await blob.arrayBuffer());
    const maxDim = maxDimFor(section);

    // sharp pipeline: auto-rotate from EXIF, downscale (never upscale), re-encode
    // to WebP, and drop metadata. `failOn: "none"` keeps a slightly-corrupt phone
    // photo from hard-failing the whole upload.
    let processed: Buffer;
    let contentType = "image/webp";
    try {
      processed = await sharp(inputBuf, { failOn: "none" })
        .rotate()
        .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      // If sharp can't decode it (rare), fall back to the original bytes so the
      // admin still gets their image rather than an opaque failure.
      processed = inputBuf;
      contentType = blob.type || "image/jpeg";
    }

    // Cloudinary path (additive) — only when configured.
    if (isCloudinaryConfigured()) {
      const subdomain =
        getSubdomain(req.headers.get("host") || req.headers.get("x-forwarded-host")) || "apex";
      const { url } = await uploadImage(processed, {
        folder: `greekstack/${subdomain}/site`,
      });
      return NextResponse.json({ ok: true, url, provider: "cloudinary" });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      // Dev mock — return a data URL so the admin can still preview locally.
      return NextResponse.json({
        ok: true,
        url: `data:${contentType};base64,${processed.toString("base64")}`,
        mode: "mock",
      });
    }

    const ext = contentType === "image/webp" ? "webp" : (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const slot = section ? `${section}-` : "";
    const filename = `site/${slot}${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { url } = await put(filename, processed, {
      access: "public",
      addRandomSuffix: false,
      contentType,
      token,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    errorSink(err, { route: "/api/upload-section-image", outcome: "upload_failed" });
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
