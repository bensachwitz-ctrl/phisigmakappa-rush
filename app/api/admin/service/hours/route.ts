import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/service/hours?status=submitted
 *
 * Philanthropy chair approval queue. Default returns the submitted (pending)
 * rows; pass `?status=approved` or `?status=rejected` for history scans.
 */
export async function GET(req: Request) {
  const denied = await guardOfficer("service", "read");
  if (denied) return denied;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "submitted";
  const memberId = url.searchParams.get("memberId");
  const where: any = { status };
  if (memberId) where.memberId = memberId;

  const hours = await prisma.serviceHourLog.findMany({
    where,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    include: {
      member: { select: { id: true, name: true, status: true } },
      serviceEvent: { select: { id: true, title: true, partnerOrg: true } },
    },
  });
  return NextResponse.json({ ok: true, hours });
}
