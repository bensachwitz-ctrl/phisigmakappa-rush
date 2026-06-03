import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { MEMBER_STATUSES } from "@/lib/member-lifecycle";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  scheduledAt: z.string().min(4).optional(),
  duration: z.number().int().positive().max(600).optional(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed", "canceled"]).optional(),
  requiredFor: z.array(z.enum(MEMBER_STATUSES)).optional(),
});

/** GET /api/admin/meetings/[id] — meeting detail + full attendance roster. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireOfficerPermission("brothers", "read");
  const meeting = await prisma.chapterMeeting.findUnique({
    where: { id: params.id },
    include: {
      attendance: {
        orderBy: [{ status: "asc" }],
        include: { member: { select: { id: true, name: true, email: true, status: true } } },
      },
    },
  });
  if (!meeting) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, meeting });
}

/** PATCH /api/admin/meetings/[id] — edit a meeting. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireOfficerPermission("brothers", "write");
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const existing = await prisma.chapterMeeting.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const data: any = {};
  if (parsed.data.title) data.title = parsed.data.title;
  if (parsed.data.scheduledAt) {
    const d = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid scheduledAt." }, { status: 400 });
    }
    data.scheduledAt = d;
  }
  if (parsed.data.duration !== undefined) data.duration = parsed.data.duration;
  if (parsed.data.location !== undefined) data.location = parsed.data.location;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.requiredFor) data.requiredFor = parsed.data.requiredFor as any;

  const updated = await prisma.chapterMeeting.update({ where: { id: params.id }, data });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    const action =
      parsed.data.status === "canceled" ? "meeting.cancel" : "meeting.update";
    await auditAndNotify(action, {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChapterMeeting",
        id: updated.id,
        name: updated.title,
      },
      payload: { before: existing, after: updated },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, meeting: updated });
}

/** DELETE /api/admin/meetings/[id] — only allowed for scheduled meetings with no attendance. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await requireOfficerPermission("brothers", "write");
  const existing = await prisma.chapterMeeting.findUnique({
    where: { id: params.id },
    include: { _count: { select: { attendance: true } } },
  });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (existing._count.attendance > 0) {
    return NextResponse.json(
      { ok: false, error: "Cannot delete a meeting with attendance records. Cancel it instead." },
      { status: 400 }
    );
  }
  await prisma.chapterMeeting.delete({ where: { id: params.id } });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("meeting.delete", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ChapterMeeting",
        id: existing.id,
        name: existing.title,
      },
      payload: { before: existing },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
