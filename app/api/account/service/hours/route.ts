import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother, getCurrentBrotherIdAsync } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostSchema = z.object({
  description: z.string().min(2).max(2000),
  hoursLogged: z.number().positive().max(24),
  performedAt: z.string().min(4),
  serviceEventId: z.string().optional().nullable(),
});

/** GET /api/account/service/hours — own log (most recent first). */
export async function GET() {
  const me = await getCurrentBrotherIdAsync();
  if (!me) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const hours = await prisma.serviceHourLog.findMany({
    where: { memberId: me },
    orderBy: [{ performedAt: "desc" }],
    include: { serviceEvent: { select: { id: true, title: true, partnerOrg: true } } },
  });
  return NextResponse.json({ ok: true, hours });
}

/** POST /api/account/service/hours — member logs hours. */
export async function POST(req: Request) {
  const me = await getCurrentBrotherIdAsync();
  if (!me) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const performedAt = new Date(parsed.data.performedAt);
  if (Number.isNaN(performedAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid performedAt." }, { status: 400 });
  }
  let serviceEventId: string | null = null;
  if (parsed.data.serviceEventId) {
    const ev = await prisma.serviceEvent.findUnique({ where: { id: parsed.data.serviceEventId } });
    if (ev) serviceEventId = ev.id;
  }
  const created = await prisma.serviceHourLog.create({
    data: {
      memberId: me,
      description: parsed.data.description,
      hoursLogged: parsed.data.hoursLogged as any,
      performedAt,
      serviceEventId,
      status: "submitted",
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("service.hour_log", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Brother",
        role: "member",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ServiceHourLog",
        id: created.id,
        name: actor?.name ?? me,
      },
      payload: {
        hours: parsed.data.hoursLogged,
        performedAt: performedAt.toISOString(),
        description: parsed.data.description,
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, hours: created });
}
