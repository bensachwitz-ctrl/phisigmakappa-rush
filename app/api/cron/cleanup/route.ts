import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily cleanup cron. Prunes the rate-limit log so the table doesn't grow
 * unbounded forever — RushSubmitLog rows older than 24h are no longer
 * relevant to any rate-limit calculation (limits are 60-min and 15-min
 * windows). Keeping them indefinitely makes the table heavy and the
 * cleanup of a chapter teardown messier than it needs to be.
 *
 * Triggered by Vercel Cron at 03:14 UTC daily (see vercel.json). Authed by
 * Vercel's internal Cron header, which is set to a value the platform signs
 * — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
 *
 * For maximum safety we also accept a CRON_SECRET bearer token (set in env)
 * so an operator can curl the endpoint manually if needed without setting up
 * a cron-impersonation header.
 */
export async function GET(req: Request) {
  // Vercel-platform cron requests carry a `x-vercel-cron` header. We also
  // accept a manual run from an operator with `Authorization: Bearer
  // ${CRON_SECRET}`. Anything else is rejected to prevent random callers
  // from triggering DB writes.
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isManual = cronSecret && auth === `Bearer ${cronSecret}`;
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let pruned = 0;
  try {
    const result = await prisma.rushSubmitLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    pruned = result.count;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Cleanup failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, pruned, cutoff: cutoff.toISOString() });
}
