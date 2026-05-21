import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { MEMBER_STATUSES } from "@/lib/member-lifecycle";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().min(2).max(200),
  scheduledAt: z.string().min(4),
  duration: z.number().int().positive().max(600).optional(), // minutes; cap at 10h
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  requiredFor: z.array(z.enum(MEMBER_STATUSES)).optional(),
});

/** GET /api/admin/meetings?from=ISO&to=ISO&status=scheduled */
export async function GET(req: Request) {
  await requireOfficerPermission("brothers", "read");
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");
  const where: any = {};
  if (status) where.status = status;
  if (from || to) {
    where.scheduledAt = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) where.scheduledAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) where.scheduledAt.lte = d;
    }
  }
  const meetings = await prisma.chapterMeeting.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    include: { _count: { select: { attendance: true } } },
  });
  return NextResponse.json({ ok: true, meetings });
}

/** POST /api/admin/meetings — secretary/president only. */
export async function POST(req: Request) {
  await requireOfficerPermission("brothers", "write");
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid scheduledAt." }, { status: 400 });
  }
  const created = await prisma.chapterMeeting.create({
    data: {
      title: parsed.data.title,
      scheduledAt,
      duration: parsed.data.duration ?? 60,
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
      requiredFor: (parsed.data.requiredFor || ["ACTIVE", "INITIATE", "PLEDGE"]) as any,
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("meeting.create", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChapterMeeting",
        id: created.id,
        name: created.title,
      },
      payload: { after: created },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, meeting: created });
}
