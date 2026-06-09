// /api/admin/rushees — PNM (Rush) dashboard list + create endpoint.
//
// The /admin/rushees surface (rush-cycle feature 1) needs a richer list shape
// than the dashboard's existing /api/admin/rush — it folds in attendance
// counts, the latest impression tone, and the vote sum so the table can show
// every column without N+1 lookups from the client.
//
// POST creates a PNM by the rush chair from inside the admin panel — the
// public /api/rush onboard endpoint is also a create path, but it carries
// TCPA consent recording + rate-limit logging that don't apply here. This is
// the same idea as /admin/brothers POST: a privileged variant of the public
// path that skips the consent capture (admin is recording on behalf of the
// PNM, no SMS opt-in implied) and writes via auditAndNotify().
//
// All routes wrap in isAdminAuthed (cookie session) and isAdminRole
// (full admin, not a member-tier session). See lib/auth.ts for the
// definitions.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin } from "@/lib/auth";
import { actorFromRequest, auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email().max(200),
  phone: z.string().min(7).max(40),
  major: z.string().max(120).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  hometown: z.string().max(160).optional().or(z.literal("")),
  // "Source" is a free-text tag — "tabling on Greene St", "referral: John D.",
  // "IG DM". Stored in `notes` (no schema add) so we don't bloat the model.
  source: z.string().max(200).optional().or(z.literal("")),
});

// One row in the dashboard table. Aggregations done in the query so the
// client renders a flat shape with no extra round-trips.
type ListRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  year: string | null;
  major: string | null;
  hometown: string | null;
  headshotUrl: string | null;
  status: string;
  attendanceCount: number;
  voteSum: number;
  voteCount: number;
  impressionCount: number;
  lastImpressionTone: string | null;
  bidToken: string | null;
  bidRespondedAt: string | null;
  bidResponseChoice: string | null;
  createdAt: string;
};

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const rushes = await prisma.rush.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        votes: { select: { value: true } },
        attendances: { select: { eventId: true } },
        // Pull only the latest impression to derive lastImpressionTone — the
        // detail page hits a separate endpoint for the full thread, so this
        // list stays cheap.
        impressions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { tone: true },
        },
        _count: { select: { impressions: true } },
      },
    });
    const rows: ListRow[] = rushes.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      year: r.year,
      major: r.major,
      hometown: r.hometown,
      headshotUrl: r.headshotUrl,
      status: r.status,
      attendanceCount: r.attendances.length,
      voteSum: r.votes.reduce((s, v) => s + v.value, 0),
      voteCount: r.votes.length,
      impressionCount: r._count.impressions,
      lastImpressionTone: r.impressions[0]?.tone ?? null,
      bidToken: r.bidToken,
      bidRespondedAt: r.bidRespondedAt ? r.bidRespondedAt.toISOString() : null,
      bidResponseChoice: r.bidResponseChoice,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ ok: true, rushes: rows });
  } catch (err) {
    console.error("[/api/admin/rushees GET]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  // Compose a notes-prefix so the source is searchable on the existing
  // notes column rather than adding a new column for a 10-char tag.
  const sourceTag = data.source ? `[source: ${data.source}]` : null;
  try {
    const created = await prisma.rush.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        major: data.major ? data.major.trim() : null,
        year: data.year ? data.year.trim() : null,
        hometown: data.hometown ? data.hometown.trim() : null,
        status: "ACTIVE",
        notes: sourceTag,
      },
    });
    await auditAndNotify("rushee.create", {
      actor: actorFromRequest(req, { role: "admin", name: "admin (shared)" }),
      entity: { type: "Rush", id: created.id, name: created.name },
      payload: { after: { name: created.name, source: data.source || null } },
      details: data.source ? `via ${data.source}` : undefined,
    });
    return NextResponse.json({ ok: true, rush: created });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "A PNM with that email already exists" },
        { status: 409 },
      );
    }
    console.error("[/api/admin/rushees POST]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
