import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrotherIdAsync } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// W4 — public read-receipt endpoint. A brother POSTs the announcement IDs
// they've seen; we insert AnnouncementRead rows for any (announcementId,
// brotherId) pair that doesn't already exist. The schema's unique
// constraint makes re-opens silent no-ops — the first-open timestamp is
// the source of truth, and double-firing this endpoint (from the same
// session, from a re-render, from a stale tab) can't corrupt the data.
//
// Auth: requires a signed-in brother. We do NOT require admin — every
// brother marks their own reads.
//
// Anonymity invariant: this route is the ONE place outside the admin
// scope where we read getCurrentBrotherId() inside an /api/announcements
// path. It's a self-write, not a leak: the brother can only mark THEIR
// OWN reads. The endpoint can't be used to enumerate other brothers'
// read history.
//
// Idempotent: we use createMany + skipDuplicates so the unique index
// catches the existing rows without erroring.

const Schema = z.object({
  // Array of announcement IDs the client confirmed visible.
  // Cap at 50 per call so a misbehaving client can't flood the DB.
  ids: z.array(z.string().min(1).max(64)).min(1).max(50),
});

export async function POST(req: Request) {
  const brotherId = await getCurrentBrotherIdAsync();
  if (!brotherId) {
    return NextResponse.json(
      { ok: false, error: "Sign in to mark announcements read." },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad shape" }, { status: 400 });
  }

  const { ids } = parsed.data;

  // Verify every announcement actually exists + the brother has visibility
  // (audience filter applies here too — a RUSHES-targeted announcement
  // shouldn't get a brother read-receipt even if the ID leaked into a
  // request body).
  const visible = await prisma.announcement.findMany({
    where: {
      id: { in: ids },
      status: "sent", // never write receipts for draft/scheduled rows
      OR: [{ audience: "ALL" }, { audience: "BROTHERS" }, { audience: "EBOARD" }],
    },
    select: { id: true },
  });
  const visibleIds = new Set(visible.map((a) => a.id));
  const writeable = ids.filter((id) => visibleIds.has(id));
  if (writeable.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, skipped: ids.length });
  }

  // createMany + skipDuplicates leans on the (announcementId, brotherId)
  // unique index. Re-opens are silently dropped — first-open wins.
  const result = await prisma.announcementRead.createMany({
    data: writeable.map((announcementId) => ({ announcementId, brotherId })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    ok: true,
    inserted: result.count,
    skipped: ids.length - writeable.length,
  });
}
