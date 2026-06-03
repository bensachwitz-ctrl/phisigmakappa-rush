import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { normaliseAlumniInput } from "@/lib/alumni";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    await requireOfficerPermission("alumni", "read");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const alumni = await prisma.alumniProfile
    .findUnique({
      where: { id },
      include: { donations: { orderBy: { recordedAt: "desc" } } },
    })
    .catch(() => null);
  if (!alumni) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, alumni });
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    await requireOfficerPermission("alumni", "write");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = normaliseAlumniInput(raw);
  if ("error" in parsed) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const updated = await prisma.alumniProfile.update({
    where: { id },
    data: parsed as any,
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("alumni.update", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "AlumniProfile",
        id: updated.id,
        name: updated.fullName,
      },
      payload: { after: updated },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, alumni: updated });
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    await requireOfficerPermission("alumni", "write");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const existing = await prisma.alumniProfile.findUnique({ where: { id } }).catch(() => null);
  const deleted = await prisma.alumniProfile.delete({ where: { id } }).catch(() => null);

  if (deleted) {
    try {
      const actor = await getCurrentBrother();
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
      const ua = req.headers.get("user-agent") || null;
      await auditAndNotify("alumni.delete", {
        actor: {
          brotherId: actor?.id ?? null,
          name: actor?.name ?? "Secretary",
          role: "secretary",
          ipAddress: ip,
          userAgent: ua,
        },
        entity: {
          type: "AlumniProfile",
          id,
          name: existing?.fullName ?? id,
        },
        payload: { before: existing },
      });
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ok: true });
}
