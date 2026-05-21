import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentSession } from "@/lib/auth";
import { getCurrentOfficerPermissions, hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 25 MB cap — bylaws + national documents are typically PDFs well under this.
// Larger archives (initiation video, etc.) belong in Vercel Blob direct upload,
// not this admin proxy. Mirrors lib/upload-photo for shape; expands MIME allow list.
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  if (!session.isAdmin) {
    const perms = await getCurrentOfficerPermissions();
    if (!hasPermission(perms, "documents", "write")) {
      return NextResponse.json({ ok: false, error: "Documents permission required" }, { status: 403 });
    }
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }
    const blob = file as File;
    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 25 MB)" }, { status: 413 });
    }
    if (blob.type && !ALLOWED.includes(blob.type)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported file type: ${blob.type}` },
        { status: 415 }
      );
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      // Dev mock: return a data URL preview + mock metadata so the admin form
      // still works without blob storage credentials. Mirrors the photo upload
      // mock branch.
      const buf = Buffer.from(await blob.arrayBuffer());
      const b64 = buf.toString("base64");
      return NextResponse.json({
        ok: true,
        mode: "mock",
        url: `data:${blob.type || "application/pdf"};base64,${b64}`,
        fileName: blob.name || "untitled",
        fileSize: blob.size,
        mimeType: blob.type || "application/octet-stream",
      });
    }

    const baseName = (blob.name || "doc").replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `library/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${baseName}`;
    const { url } = await put(filename, blob, {
      access: "public",
      addRandomSuffix: false,
      contentType: blob.type || "application/octet-stream",
      token,
    });
    return NextResponse.json({
      ok: true,
      url,
      fileName: blob.name || baseName,
      fileSize: blob.size,
      mimeType: blob.type || "application/octet-stream",
    });
  } catch (err: any) {
    console.error("[/api/admin/library/upload]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Upload failed" }, { status: 500 });
  }
}
