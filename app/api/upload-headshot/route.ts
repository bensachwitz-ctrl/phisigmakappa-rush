import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(req: Request) {
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
