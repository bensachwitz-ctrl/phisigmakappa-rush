import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/alumni/[id]/donations
 *
 * Log a donation against an existing AlumniProfile. The `recordedById` is set
 * to the current brother's id when present so audit trails survive deletion
 * of the alumni row only (cascade onDelete=CASCADE).
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    await requireOfficerPermission("alumni", "write");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const alumniId = ctx.params?.id;
  if (!alumniId) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const amountDollars = Number(raw?.amountDollars ?? raw?.amount);
  const amountCents = Math.round(amountDollars * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ ok: false, error: "amount must be a positive number" }, { status: 400 });
  }
  const campaign = typeof raw?.campaign === "string" ? raw.campaign.trim().slice(0, 200) : null;
  const notes = typeof raw?.notes === "string" ? raw.notes.trim().slice(0, 2000) : null;

  // Confirm parent exists; cleaner 404 than a Prisma foreign-key error.
  const parent = await prisma.alumniProfile.findUnique({ where: { id: alumniId } }).catch(() => null);
  if (!parent) return NextResponse.json({ ok: false, error: "alumni not found" }, { status: 404 });

  const recordedById = getCurrentBrotherId();
  const created = await prisma.alumniDonation.create({
    data: {
      alumniId,
      amountCents,
      campaign,
      notes,
      recordedById: recordedById || undefined,
    },
  });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("alumni.donation.record", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "AlumniDonation",
        id: created.id,
        name: parent.fullName,
      },
      payload: {
        amountCents,
        campaign,
        alumniId,
      },
      details: `($${(amountCents / 100).toFixed(2)})`,
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, donation: created });
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    await requireOfficerPermission("alumni", "read");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const alumniId = ctx.params?.id;
  if (!alumniId) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const donations = await prisma.alumniDonation
    .findMany({ where: { alumniId }, orderBy: { recordedAt: "desc" } })
    .catch(() => []);
  return NextResponse.json({ ok: true, donations });
}
