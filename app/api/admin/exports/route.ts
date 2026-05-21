import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/exports — list past export runs. */
export async function GET() {
  try {
    await requireOfficerPermission("payments", "read");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const runs = await prisma.hqExportRun
    .findMany({ orderBy: { createdAt: "desc" }, take: 100 })
    .catch(() => []);
  return NextResponse.json({ ok: true, runs });
}
