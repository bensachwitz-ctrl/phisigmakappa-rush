import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma, getSubdomain } from "@/lib/prisma";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(req: Request) {
  // Per-IP throttle. This route is intentionally public (rushees upload their
  // own headshot during onboarding before they have a session), so we can't
  // gate on auth — instead we cap at 10 uploads / hour per IP. Real PNMs
  // upload one headshot, maybe re-try once. Anything past that is abuse.
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  if (ipAddress) {
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await prisma.rushSubmitLog.count({
        where: { ipAddress, status: "HEADSHOT_UPLOAD", createdAt: { gte: since } },
      });
      if (recent >= 10) {
        return NextResponse.json(
          { ok: false, error: "Too many uploads. Try again in an hour." },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
    } catch {
      // Fail open on DB error so a glitch doesn't break legit onboarding.
    }
  }

  // Reject non-multipart bodies cleanly (415 instead of letting formData()
  // throw and falling into the catch-all 500). This keeps debugging signal
  // clean and avoids leaking framework errors.
  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, error: "Expected multipart/form-data" },
      { status: 415 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const blob = file as File;
    if (blob.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 8 MB)" },
        { status: 413 }
      );
    }
    if (blob.type && !ALLOWED.includes(blob.type)) {
      return NextResponse.json(
        { ok: false, error: "Only JPG, PNG, WEBP, HEIC images allowed" },
        { status: 415 }
      );
    }

    if (ipAddress) {
      prisma.rushSubmitLog.create({
        data: { ipAddress, status: "HEADSHOT_UPLOAD" },
      }).catch(() => {});
    }

    // Cloudinary path (additive) — only when configured. Uploads under a
    // per-tenant folder and persists the returned secure URL. When Cloudinary
    // is unset, this branch is skipped entirely and the existing Blob/mock path
    // below runs byte-for-byte unchanged.
    if (isCloudinaryConfigured()) {
      const subdomain =
        getSubdomain(
          req.headers.get("host") || req.headers.get("x-forwarded-host"),
        ) || "apex";
      const buf = Buffer.from(await blob.arrayBuffer());
      const { url } = await uploadImage(buf, {
        folder: `greekstack/${subdomain}/headshots`,
      });
      return NextResponse.json({ ok: true, url, provider: "cloudinary" });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      // Mock mode — return a data URL so dev can keep working without Vercel Blob.
      const buf = Buffer.from(await blob.arrayBuffer());
      const b64 = buf.toString("base64");
      const mime = blob.type || "image/jpeg";
      return NextResponse.json({
        ok: true,
        url: `data:${mime};base64,${b64}`,
        mode: "mock",
      });
    }

    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const filename = `headshots/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const { url } = await put(filename, blob, {
      access: "public",
      addRandomSuffix: false,
      contentType: blob.type || "image/jpeg",
      token,
    });

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("[/api/upload-headshot]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
