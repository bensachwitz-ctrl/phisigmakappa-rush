import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { isPrivate: false },
    orderBy: { startsAt: "asc" },
  });
  // Public, non-personalized data (only isPrivate:false events). Let the edge/CDN
  // serve repeated hits for 60s and keep serving a stale copy for 5 min while it
  // revalidates in the background, so a burst of rushees hitting the schedule
  // doesn't fan out to the DB on every request. The browser always revalidates
  // (max-age=0) so an admin event edit shows up on the next load. No auth state
  // or per-tenant variance is encoded in the body, so a shared cache is correct.
  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
