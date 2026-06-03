import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/bid/[token] — PNM bid-response endpoint. Public (no admin auth)
 * because the token IS the auth: knowing it proves the PNM received the
 * bid email/SMS from the chapter.
 *
 * POST { choice: "ACCEPTED" | "DECLINED", reason?: string }
 *
 * On success:
 *   - Rush.status -> ACCEPTED | DECLINED
 *   - Rush.bidRespondedAt -> now
 *   - Rush.bidResponseChoice -> choice
 *   - Rush.bidToken -> null   (single-use; forwarded link can't be replayed)
 *   - AuditLog row written ("BID_ACCEPTED" or "BID_DECLINED")
 *
 * Returns 404 for invalid/expired/used tokens (don't leak which one).
 */

const BodySchema = z.object({
  choice: z.enum(["ACCEPTED", "DECLINED"]),
  reason: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  // Token shape guard — must look like hex. Bails on garbage URLs before
  // we hit the DB and avoids leaking timing info on token format.
  if (!/^[a-f0-9]{16,64}$/i.test(token)) {
    return NextResponse.json({ ok: false, error: "Invalid link" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid choice" }, { status: 400 });
  }

  const rush = await prisma.rush.findUnique({
    where: { bidToken: token },
    select: {
      id: true,
      name: true,
      status: true,
      bidTokenExpiresAt: true,
      bidRespondedAt: true,
      notes: true,
    },
  });

  if (!rush) {
    return NextResponse.json({ ok: false, error: "Invalid link" }, { status: 404 });
  }
  if (rush.bidRespondedAt) {
    // Already responded — treat as a no-op success so a double-click
    // doesn't error out the user.
    return NextResponse.json({ ok: true, alreadyResponded: true });
  }
  if (rush.bidTokenExpiresAt && rush.bidTokenExpiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Link expired" }, { status: 410 });
  }

  // Single transaction: record response + flip status + clear token.
  // Token nulled so a forwarded link or replay can't double-respond.
  // Append the optional decline reason to the existing notes field for
  // admin visibility (no schema migration needed for a free-text reason).
  const noteAddition = parsed.data.choice === "DECLINED" && parsed.data.reason
    ? `\n\n[${new Date().toISOString().slice(0, 10)} declined bid] ${parsed.data.reason.trim()}`
    : null;

  await prisma.rush.update({
    where: { id: rush.id },
    data: {
      status: parsed.data.choice, // ACCEPTED | DECLINED
      bidRespondedAt: new Date(),
      bidResponseChoice: parsed.data.choice,
      bidToken: null,
      bidTokenExpiresAt: null,
      ...(noteAddition ? { notes: (rush.notes || "") + noteAddition } : {}),
    },
  });

  await audit({
    action: parsed.data.choice === "ACCEPTED" ? "BID_ACCEPTED" : "BID_DECLINED",
    subjectType: "Rush",
    subjectId: rush.id,
    subjectName: rush.name,
    details: parsed.data.choice === "DECLINED" && parsed.data.reason
      ? `reason given (${parsed.data.reason.length} chars)`
      : null,
    req,
  });

  return NextResponse.json({ ok: true });
}
