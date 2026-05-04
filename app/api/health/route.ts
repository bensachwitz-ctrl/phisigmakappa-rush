import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight health probe for uptime monitors and Vercel/Datadog checks.
 * Returns:
 *   200 OK with {ok:true, db:"up"}        — full system green
 *   200 OK with {ok:true, db:"down"}      — app up, DB unreachable (degraded)
 *
 * We always return 200 so a flaky DB doesn't trip the front-door uptime
 * monitor; the caller can branch on the `db` field for fine-grained alerting.
 */
export async function GET() {
  let dbStatus: "up" | "down" = "up";
  try {
    // Cheap query — counts are O(1) on Postgres + Prisma.
    await prisma.siteConfig.count();
  } catch {
    dbStatus = "down";
  }
  return NextResponse.json({
    ok: true,
    db: dbStatus,
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID || "local",
    region: process.env.VERCEL_REGION || null,
    timestamp: new Date().toISOString(),
  });
}
