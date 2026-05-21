import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicAlumniView } from "@/lib/alumni";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/alumni-directory — PUBLIC opt-in directory.
 *
 * Contract:
 *   1. Only rows where optInDirectory=true are returned.
 *   2. Even for opted-in rows, email + phone are NEVER serialised — we
 *      defensively strip them via `publicAlumniView`.
 *   3. Filters: ?gradYear=&state=&search= (search matches fullName, employer, city).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const gradYear = url.searchParams.get("gradYear");
  const state = url.searchParams.get("state");
  const search = url.searchParams.get("search");
  const where: any = { optInDirectory: true };
  if (gradYear) {
    const y = parseInt(gradYear, 10);
    if (Number.isFinite(y)) where.graduationYear = y;
  }
  if (state) where.state = { equals: state.toUpperCase().slice(0, 2) };
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { employer: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.alumniProfile
    .findMany({
      where,
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
      // Explicitly select only the public-safe columns. Belt + suspenders: the
      // publicAlumniView strip below makes this redundant, but it also means
      // a future test that drops the view function still cannot leak PII.
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        graduationYear: true,
        pledgeClass: true,
        city: true,
        state: true,
        employer: true,
        jobTitle: true,
        bio: true,
        linkedinUrl: true,
      },
    })
    .catch(() => []);
  const alumni = rows.map(publicAlumniView);
  return NextResponse.json({ ok: true, alumni });
}
