import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { getSubdomain } from "@/lib/prisma";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];

/**
 * Direct photo upload for admin Site Settings.
 * Returns a public Vercel Blob URL the admin can paste into any photo slot.
 * Admin-only — non-admins get 403 even if logged in as a brother.
 */
export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }
    const blob = file as File;
    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 10 MB)" }, { status: 413 });
    }
    if (blob.type && !ALLOWED.includes(blob.type)) {
      return NextResponse.json({ ok: false, error: "Only JPG, PNG, WEBP, HEIC, GIF allowed" }, { status: 415 });
    }

    // Cloudinary path (additive) — only when configured. Stores the photo under
    // a per-tenant folder and returns the secure URL. Skipped entirely when
    // Cloudinary is unset, leaving the Blob/mock path below unchanged.
    if (isCloudinaryConfigured()) {
      const subdomain =
        getSubdomain(
          req.headers.get("host") || req.headers.get("x-forwarded-host"),
        ) || "apex";
      const buf = Buffer.from(await blob.arrayBuffer());
      const { url } = await uploadImage(buf, {
        folder: `greekstack/${subdomain}/site`,
      });
      return NextResponse.json({ ok: true, url, provider: "cloudinary" });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      // Mock for dev — return a data URL so the admin can preview
      const buf = Buffer.from(await blob.arrayBuffer());
      const b64 = buf.toString("base64");
      return NextResponse.json({ ok: true, url: `data:${blob.type || "image/jpeg"};base64,${b64}`, mode: "mock" });
    }

    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const filename = `site/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { url } = await put(filename, blob, {
      access: "public",
      addRandomSuffix: false,
      contentType: blob.type || "image/jpeg",
      token,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    // Log the real error server-side; return a generic message to the client.
    errorSink(err, { route: "/api/upload-photo", outcome: "upload_failed" });
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
