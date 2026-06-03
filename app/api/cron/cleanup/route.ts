import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily cleanup cron. Two pruning passes in one endpoint to keep vercel.json
 * simple — one daily schedule covers both.
 *
 *   1. RushSubmitLog → prune rows older than 24h. They're no longer
 *      relevant to any rate-limit calculation (limits are 60-min and
 *      15-min windows). Keeping them indefinitely makes the table heavy.
 *
 *   2. AuditLog → prune rows older than 365d. The governance retention
 *      promise documented in the model comment is "1 year" — this is
 *      where that promise gets kept. After a year the chapter's
 *      "who-changed-what" window has passed and the row is no longer
 *      useful for the disputes the log exists to settle.
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

  const rushLogCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const auditCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  let rushLogPruned = 0;
  let auditPruned = 0;
  const errors: string[] = [];

  try {
    const result = await prisma.rushSubmitLog.deleteMany({
      where: { createdAt: { lt: rushLogCutoff } },
    });
    rushLogPruned = result.count;
  } catch (err: any) {
    errors.push(`rushSubmitLog: ${err?.message || "failed"}`);
  }

  try {
    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    });
    auditPruned = result.count;
  } catch (err: any) {
    errors.push(`auditLog: ${err?.message || "failed"}`);
  }

  // Partial success is still a success — we don't want one bad table to
  // block the other from pruning on subsequent runs.
  return NextResponse.json({
    ok: errors.length === 0,
    rushLogPruned,
    rushLogCutoff: rushLogCutoff.toISOString(),
    auditPruned,
    auditCutoff: auditCutoff.toISOString(),
    ...(errors.length > 0 ? { errors } : {}),
  });
}
