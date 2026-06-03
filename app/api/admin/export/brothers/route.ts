import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Brothers participation roster — CSV export with engagement metrics so the
 * rush chair / president / risk chair can see at a glance who's pulling their
 * weight (votes cast, RSVPs, hours, dues) and who needs a tap on the shoulder.
 *
 * Shipped as a sibling to /api/admin/export (PNM roster). Admin-only because
 * the file contains email, phone, role, and dues status — same PII surface as
 * the rush export.
 *
 * Columns intentionally chosen to be small (≤14) so the CSV opens cleanly in
 * Numbers/Excel on a laptop without horizontal scrolling, and so the e-board
 * can paste it directly into their weekly meeting deck.
 */

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  // One round-trip pulls every brother + their downstream counts. The
  // _count select keeps payload small (Prisma aggregates in SQL, doesn't
  // ship full child rows back to the app).
  const brothers = await prisma.brother.findMany({
    orderBy: [{ position: "desc" }, { name: "asc" }], // e-board first, then alphabetical
    include: {
      _count: {
        select: { votes: true, rsvps: true, announcements: true },
      },
    },
  });

  // Vote-recency window: brothers who voted on at least one PNM in the
  // last 7 days are "active in rush" — distinguishes engaged voters from
  // brothers who voted once in week 1 and never came back.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentVoters = await prisma.vote
    .findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { brotherId: true },
      distinct: ["brotherId"],
    })
    .catch(() => [] as { brotherId: string }[]);
  const recentVoterIds = new Set(recentVoters.map((v) => v.brotherId));

  const headers = [
    "Name",
    "Position",
    "Year",
    "Major",
    "Pledge class",
    "Role",
    "Email",
    "Phone",
    "Dues paid",
    "Service hours",
    "Study hours",
    "Votes cast (all-time)",
    "Voted in last 7 days",
    "RSVPs sent",
    "Last seen",
  ];

  const rows = brothers.map((b) => [
    b.name,
    b.position || "",
    b.year || "",
    b.major || "",
    b.pledgeClass || "",
    b.role,
    b.email || "",
    b.phone || "",
    b.duesPaid ? "Yes" : "No",
    b.serviceHours,
    b.studyHours,
    b._count.votes,
    recentVoterIds.has(b.id) ? "Yes" : "No",
    b._count.rsvps,
    b.lastSeen.toISOString().slice(0, 10),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="phisig-brothers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
