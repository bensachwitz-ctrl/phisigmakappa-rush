import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/incidents?status=submitted&severity=high
 *
 * Risk officer list view. Anonymous reports surface with `reporterId=null`
 * and `isAnonymous=true` — the UI must label these "Anonymous" and MUST NOT
 * attempt to re-derive the reporter (no IP lookup, no audit-log cross-ref).
 */
export async function GET(req: Request) {
  await requireOfficerPermission("risk", "read");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");
  const category = url.searchParams.get("category");
  const where: any = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (category) where.category = category;

  const incidents = await prisma.incidentReport.findMany({
    where,
    orderBy: [{ reportedAt: "desc" }],
    select: {
      id: true,
      receiptCode: true,
      category: true,
      severity: true,
      status: true,
      isAnonymous: true,
      subject: true,
      reportedAt: true,
      occurredAt: true,
      resolvedAt: true,
      reporterId: true,
      // Reporter relation is NEVER returned in the list view to keep
      // anonymous reports anonymous in roster scans.
    },
  });
  return NextResponse.json({ ok: true, incidents });
}
