import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { csvEscape } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Export ships full PII (names, phones, emails, hometowns, vote sums,
  // background notes). Admin-only — members get the public roster only.
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  const rushes = await prisma.rush.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      votes: { select: { value: true } },
      attendances: { select: { eventId: true } },
    },
  });

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Year",
    "Major",
    "Hometown",
    "Status",
    "Vote Sum",
    "Vote Count",
    "Events Attended",
    "Notes",
    "Background",
    "HS Sports",
    "Headshot URL",
    "Registered",
  ];

  const rows = rushes.map((r) => [
    r.name,
    r.email,
    r.phone,
    r.year || "",
    r.major || "",
    r.hometown || "",
    r.status,
    r.votes.reduce((s, v) => s + v.value, 0),
    r.votes.length,
    r.attendances.length,
    r.notes || "",
    r.backgroundInfo || "",
    r.highSchoolInfo || "",
    r.headshotUrl || "",
    r.createdAt.toISOString(),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="phisig-rushes-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
