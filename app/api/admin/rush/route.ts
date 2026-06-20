import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { guardOfficer, guardOfficerOrAdmin } from "@/lib/permissions";
import { RUSH_STATUSES } from "@/lib/utils";
import { audit } from "@/lib/audit";

// Bid token TTL — long enough for a thoughtful decision, short enough that
// an uncollected token doesn't sit as a phishing surface forever.
const BID_TOKEN_TTL_DAYS = 14;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(RUSH_STATUSES).optional(),
  notes: z.string().max(4000).optional(),
});

const DeleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  // PNM roster read — officer/admin floor (API twin of the /admin layout
  // boundary), not isAdminAuthed() alone, so a plain member-login cookie can't
  // pull the rush pipeline straight from the JSON.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;
  const rushes = await prisma.rush.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rushes });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Status changes (ACCEPTED / DROPPED / BID_EXTENDED) and notes are
  // chapter business decisions — admins or officers holding rushPipeline:write.
  // Members vote on rushees but don't change their status.
  const denied = await guardOfficer("rushPipeline", "write");
  if (denied) return denied;
  try {
    const body = await req.json();
    const data = PatchSchema.parse(body);
    // Capture the prior state for the audit trail before we mutate.
    const before = await prisma.rush.findUnique({
      where: { id: data.id },
      select: { status: true, notes: true, name: true, bidToken: true },
    });

    // Auto-generate a bid token the FIRST time status flips to BID_EXTENDED.
    // Re-extending after a decline doesn't regenerate — keeps token churn
    // low. To re-issue, admin must explicitly null the token first (future
    // "Re-issue bid link" button) — for now status change is the trigger.
    const isFirstBidExtension =
      data.status === "BID_EXTENDED" &&
      before?.status !== "BID_EXTENDED" &&
      !before?.bidToken;
    const bidTokenFields = isFirstBidExtension
      ? {
          // 32 hex chars = 128 bits of entropy. Crypto-strong, URL-safe.
          bidToken: crypto.randomBytes(16).toString("hex"),
          bidTokenExpiresAt: new Date(Date.now() + BID_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        }
      : {};

    const updated = await prisma.rush.update({
      where: { id: data.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(typeof data.notes === "string" ? { notes: data.notes } : {}),
        ...bidTokenFields,
      },
    });
    // Audit — best-effort, never blocks the response.
    if (before && data.status && before.status !== data.status) {
      await audit({
        action: "RUSH_STATUS",
        subjectType: "Rush",
        subjectId: data.id,
        subjectName: updated.name,
        details: `${before.status} → ${data.status}`,
        req,
      });
    }
    if (isFirstBidExtension) {
      await audit({
        action: "BID_TOKEN_GENERATED",
        subjectType: "Rush",
        subjectId: data.id,
        subjectName: updated.name,
        details: `expires ${updated.bidTokenExpiresAt?.toISOString().slice(0, 10)}`,
        req,
      });
    }
    if (before && typeof data.notes === "string" && before.notes !== data.notes) {
      await audit({
        action: "RUSH_NOTES",
        subjectType: "Rush",
        subjectId: data.id,
        subjectName: updated.name,
        details: `notes updated (${(data.notes || "").length} chars)`,
        req,
      });
    }
    return NextResponse.json({ ok: true, rush: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    console.error("[/api/admin/rush PATCH]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const denied = await guardOfficer("rushPipeline", "write");
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id } = DeleteSchema.parse(body);
    // Capture name for audit BEFORE deletion (cascade removes the row).
    const victim = await prisma.rush.findUnique({ where: { id }, select: { name: true, status: true } });
    await prisma.rush.delete({ where: { id } });
    await audit({
      action: "RUSH_DELETED",
      subjectType: "Rush",
      subjectId: id,
      subjectName: victim?.name || null,
      details: victim?.status ? `last status: ${victim.status}` : null,
      req,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    console.error("[/api/admin/rush DELETE]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
