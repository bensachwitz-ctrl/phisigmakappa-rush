import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sober-driver scheduling is a RISK-MANAGEMENT function. Owner spec: "Risk Mgmt
// = select + log sober driver." Both the read (roster + shift PII) and the write
// (select/log a driver) are gated on the `risk` officer domain — read on
// risk:read, write on risk:write — so a non-super-admin Risk Manager who holds
// risk:write can BOTH load and save the schedule. Chapter admins pass via
// SUPER_ADMIN_PERMISSIONS (guardOfficer returns them for isAdmin sessions); a
// plain member with no risk access is 403'd. guardOfficer's write path also
// enforces the platform-billing lockout (assertBillingActive), so a locked-out
// chapter can read but not edit — no separate billing guard needed.
//
// (Previously the writes gated on isAdminRole() — super-admin ONLY — so a Risk
// Manager holding risk:write could not save; and the UI lived only on the
// rushPipeline-gated /admin/rushees page, so they could not reach it either. The
// select/log UI is now also surfaced at /admin/risk/sober-drivers.)

const ShiftSchema = z.object({
  day: z.string().min(2).max(40),
  shiftHours: z.string().min(2).max(100),
  memberId: z.string().min(1),
});

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  // Returns chapter-wide PII (every pledge's + shift member's email/phone). Gate
  // on risk:read so only a risk officer/admin can load it.
  const denied = await guardOfficer("risk", "read");
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
  // WRITE gated on risk:write (admins pass via SUPER_ADMIN_PERMISSIONS). This is
  // the fix for a Risk Manager who holds risk:write but not super-admin: the old
  // isAdminRole() gate rejected them. guardOfficer also enforces the billing
  // WRITE lockout (a locked-out chapter may not edit the sober schedule).
  const denied = await guardOfficer("risk", "write");
  if (denied) return denied;

  try {
    const body = await req.json();
    const parsed = ShiftSchema.parse(body);

    // SECURITY: only a PLEDGE may be assigned as sober driver. The GET list and
    // the scheduler dropdown only ever OFFER pledges, but a risk:write officer
    // can bypass the client and POST an arbitrary memberId — so re-validate the
    // target here before writing. The `prisma` client is already scoped to the
    // request's tenant SCHEMA, so this lookup can only see THIS chapter's
    // brothers (no cross-tenant leak; there is no chapterId column to filter
    // on). A missing member — or one whose status isn't PLEDGE — is rejected 400
    // (mirrors the route's other bad-request responses) and NO shift is written.
    const member = await prisma.brother.findUnique({
      where: { id: parsed.memberId },
      select: { name: true, status: true },
    });
    if (!member || member.status !== "PLEDGE") {
      return NextResponse.json(
        { ok: false, error: "Selected member is not an assignable pledge" },
        { status: 400 },
      );
    }

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

    await audit({
      action: "SOBER_DRIVER_ASSIGNED",
      subjectType: "SoberDriver",
      subjectId: shift.id,
      subjectName: member.name || parsed.memberId,
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
  // WRITE gated on risk:write (admins pass via SUPER_ADMIN_PERMISSIONS);
  // guardOfficer also enforces the billing WRITE lockout.
  const denied = await guardOfficer("risk", "write");
  if (denied) return denied;

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
