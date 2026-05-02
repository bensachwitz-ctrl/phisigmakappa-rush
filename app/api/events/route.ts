import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { isPrivate: false },
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ events });
}
