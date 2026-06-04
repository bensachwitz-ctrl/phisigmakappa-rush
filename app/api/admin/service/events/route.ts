import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().nullable(),
  partnerOrg: z.string().max(200).optional().nullable(),
  partnerUrl: z.string().url().max(500).optional().nullable(),
  eventDate: z.string().min(4),
  hoursPerSlot: z.number().nonnegative().max(24).optional(),
  status: z.enum(["proposed", "approved", "completed", "canceled"]).optional(),
});

/** GET /api/admin/service/events?status=proposed */
export async function GET(req: Request) {
  const denied = await guardOfficer("service", "read");
  if (denied) return denied;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where: any = {};
  if (status) where.status = status;
  const events = await prisma.serviceEvent.findMany({
    where,
    orderBy: [{ eventDate: "desc" }],
    include: { _count: { select: { hours: true } } },
  });
  return NextResponse.json({ ok: true, events });
}

/** POST /api/admin/service/events — philanthropy chair only. */
export async function POST(req: Request) {
  const denied = await guardOfficer("service", "write");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const eventDate = new Date(parsed.data.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid eventDate." }, { status: 400 });
  }
  const me = getCurrentBrotherId();
  const created = await prisma.serviceEvent.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      partnerOrg: parsed.data.partnerOrg ?? null,
      partnerUrl: parsed.data.partnerUrl ?? null,
      eventDate,
      hoursPerSlot: parsed.data.hoursPerSlot ?? null,
      status: parsed.data.status ?? "proposed",
      approvedById: parsed.data.status === "approved" ? me : null,
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("service.event.create", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Service Chair",
        role: "service-chair",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ServiceEvent",
        id: created.id,
        name: created.title,
      },
      payload: { after: created },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, event: created });
}
