import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/exports/[id]/download
 *
 * In production (blob token set), the route in /run wrote to Vercel Blob and
 * stored the URL on `HqExportRun.fileUrl` — this route just redirects there.
 *
 * In dev (no blob token), the body was stashed in SiteConfig under
 * `hq-export-mock:<runId>` and this route streams that text body back. Lets
 * the admin UI show "Download" in dev without blob credentials.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    await requireOfficerPermission("payments", "read");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const run = await prisma.hqExportRun.findUnique({ where: { id } }).catch(() => null);
  if (!run) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  if (run.status !== "complete") {
    return NextResponse.json({ ok: false, error: `run is ${run.status}` }, { status: 409 });
  }
  // Prod path: blob URL set, redirect.
  if (run.fileUrl && !run.fileUrl.startsWith("/api/")) {
    return NextResponse.redirect(run.fileUrl);
  }
  // Dev path: stream the stashed body.
  const mock = await prisma.siteConfig
    .findUnique({ where: { key: `hq-export-mock:${id}` } })
    .catch(() => null);
  if (!mock) return NextResponse.json({ ok: false, error: "body missing" }, { status: 404 });
  const isHtml = run.exportType === "annual_report";
  const ext = isHtml ? "html" : "csv";
  const contentType = isHtml ? "text/html; charset=utf-8" : "text/csv; charset=utf-8";
  return new NextResponse(mock.value, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${run.exportType}-${run.termCode}.${ext}"`,
    },
  });
}
