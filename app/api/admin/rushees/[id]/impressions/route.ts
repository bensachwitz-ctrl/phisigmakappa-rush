// /api/admin/rushees/[id]/impressions — append an impression note.
//
// Members and admins can both leave impressions (vote-like — every brother
// in the chapter has a voice in the rush conversation). Author identity:
//   • If a per-brother session is active → uses that brother's name.
//   • Otherwise (shared admin session) → "admin (shared)".
//
// We deliberately store authorName as a denormalized string rather than an
// FK to Brother so the note survives if the brother who left it later
// leaves the chapter. AuditLog follows the same pattern — see lib/audit.ts.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isSameOrigin, getCurrentBrother } from "@/lib/auth";
import { guardBillingWrite } from "@/lib/billing-guard";
import { actorFromRequest, auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  tone: z.enum(["positive", "neutral", "concern"]),
  note: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
  }
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const me = await getCurrentBrother();
  const authorName = me?.name || "admin (shared)";

  try {
    const rush = await prisma.rush.findUnique({
      where: { id: params.id },
      select: { name: true },
    });
    if (!rush) {
      return NextResponse.json({ ok: false, error: "PNM not found" }, { status: 404 });
    }
    const created = await prisma.rushImpression.create({
      data: {
        rushId: params.id,
        authorName,
        tone: parsed.data.tone,
        note: parsed.data.note ? parsed.data.note.trim() : null,
      },
    });
    await auditAndNotify("rushee.impression", {
      actor: actorFromRequest(req, {
        brotherId: me?.id || null,
        name: authorName,
        role: me ? "member" : "admin",
      }),
      entity: { type: "Rush", id: params.id, name: rush.name },
      payload: { tone: parsed.data.tone, note: parsed.data.note || null },
      details: `(${parsed.data.tone})`,
    });
    return NextResponse.json({
      ok: true,
      impression: { ...created, createdAt: created.createdAt.toISOString() },
    });
  } catch (err) {
    console.error("[/api/admin/rushees/[id]/impressions POST]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
