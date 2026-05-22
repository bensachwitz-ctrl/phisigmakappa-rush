// /api/admin/rushees/[id]/bid — send a bid to one PNM.
//
// Flips Rush.status to BID_EXTENDED + generates a single-use bidToken if
// one doesn't already exist (same logic as /api/admin/rush PATCH). The
// /bid/[token] page handles the PNM's accept/decline.
//
// This is a distinct endpoint from /api/admin/rush PATCH so the detail-page
// "Send bid" button can be a single-purpose POST — no embedded
// status-machine logic on the client. Re-issuing a bid (after a decline)
// is supported via the `regenerate` flag.
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin } from "@/lib/auth";
import { actorFromRequest, auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BID_TOKEN_TTL_DAYS = 14;

const Schema = z.object({
  regenerate: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body || {});
  const regenerate = parsed.success ? !!parsed.data.regenerate : false;

  const before = await prisma.rush.findUnique({
    where: { id: params.id },
    select: { name: true, status: true, bidToken: true, email: true, phone: true },
  });
  if (!before) {
    return NextResponse.json({ ok: false, error: "PNM not found" }, { status: 404 });
  }

  const needsNewToken = !before.bidToken || regenerate;
  const newTokenFields = needsNewToken
    ? {
        bidToken: crypto.randomBytes(16).toString("hex"),
        bidTokenExpiresAt: new Date(Date.now() + BID_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        // Clear any stale response — a re-issue is a fresh decision window.
        bidRespondedAt: null,
        bidResponseChoice: null,
      }
    : {};

  try {
    const updated = await prisma.rush.update({
      where: { id: params.id },
      data: {
        status: "BID_EXTENDED",
        ...newTokenFields,
      },
    });
    await auditAndNotify("rushee.bid.send", {
      actor: actorFromRequest(req, { role: "admin", name: "admin (shared)" }),
      entity: { type: "Rush", id: updated.id, name: updated.name },
      payload: {
        before: { status: before.status, hadToken: !!before.bidToken },
        after: { status: "BID_EXTENDED", regenerated: needsNewToken },
      },
      details: needsNewToken ? "new bid token issued" : "re-sent existing token",
    });
    return NextResponse.json({
      ok: true,
      rush: {
        ...updated,
        bidTokenExpiresAt: updated.bidTokenExpiresAt ? updated.bidTokenExpiresAt.toISOString() : null,
      },
    });
  } catch (err) {
    console.error("[/api/admin/rushees/[id]/bid POST]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
