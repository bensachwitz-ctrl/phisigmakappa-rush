import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { guardOfficerOrAdmin } from "@/lib/permissions";
import { guardBillingWrite } from "@/lib/billing-guard";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ShiftSchema = z.object({
  day: z.string().min(2).max(40),
  shiftHours: z.string().min(2).max(100),
  memberId: z.string().min(1),
});

export async function GET() {
  // Returns chapter-wide PII (every pledge's + shift member's email/phone), so
  // it needs the officer/admin floor (the API twin of the /admin layout
  // boundary), not isAdminAuthed() alone — which any valid member-login cookie
  // passes, letting a bounced plain member read the roster's contact details.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;

  try {
    // 1. Fetch all sober shifts with the assigned member details
    const shifts = await prisma.soberDriverShift.findMany({
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 2. Fetch all new members/pledges in the chapter roster
    const pledges = await prisma.brother.findMany({
      where: {
        status: "PLEDGE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        major: true,
        hometown: true,
        headshotUrl: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ ok: true, shifts, pledges });
  } catch (err: any) {
    console.error("[sober-schedule GET]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  // Billing WRITE guard (P1): a locked-out chapter may not edit the sober schedule.
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;

  try {
    const body = await req.json();
    const parsed = ShiftSchema.parse(body);

    // Upsert the shift: we identify a shift uniquely by day and shiftHours
    // so we don't end up with duplicate slots on the same night.
    const existing = await prisma.soberDriverShift.findFirst({
      where: {
        day: parsed.day,
        shiftHours: parsed.shiftHours,
      },
    });

    let shift;
    if (existing) {
      shift = await prisma.soberDriverShift.update({
        where: { id: existing.id },
        data: {
          memberId: parsed.memberId,
        },
      });
    } else {
      shift = await prisma.soberDriverShift.create({
        data: {
          day: parsed.day,
          shiftHours: parsed.shiftHours,
          memberId: parsed.memberId,
        },
      });
    }

    const member = await prisma.brother.findUnique({
      where: { id: parsed.memberId },
      select: { name: true },
    });

    await audit({
      action: "SOBER_DRIVER_ASSIGNED",
      subjectType: "SoberDriver",
      subjectId: shift.id,
      subjectName: member?.name || parsed.memberId,
      details: `${parsed.day} (${parsed.shiftHours})`,
      req,
    });

    return NextResponse.json({ ok: true, shift });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input", issues: err.flatten() }, { status: 400 });
    }
    console.error("[sober-schedule POST]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  // Billing WRITE guard (P1): a locked-out chapter may not edit the sober schedule.
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing shift ID" }, { status: 400 });
    }

    const shift = await prisma.soberDriverShift.findUnique({
      where: { id },
      include: { member: { select: { name: true } } },
    });

    if (!shift) {
      return NextResponse.json({ ok: false, error: "Shift not found" }, { status: 404 });
    }

    await prisma.soberDriverShift.delete({
      where: { id },
    });

    await audit({
      action: "SOBER_DRIVER_REMOVED",
      subjectType: "SoberDriver",
      subjectId: id,
      subjectName: shift.member.name,
      details: `${shift.day} (${shift.shiftHours})`,
      req,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[sober-schedule DELETE]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
