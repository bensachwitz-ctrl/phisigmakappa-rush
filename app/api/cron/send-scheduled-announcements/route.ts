import { NextResponse } from "next/server";
import { fireDueScheduledAnnouncements } from "@/lib/scheduled-announcements";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// W4 — Vercel Cron entry that fires scheduled announcements whose
// scheduledFor deadline has passed.
//
// Schedule: `0 */15 * * * *` in vercel.json (every 15 minutes). A 15-minute
// resolution is more than enough for chapter-pace communications — a more
// aggressive cadence costs Vercel cron invocations without buying meaningful
// freshness for "Sunday meeting at 7pm" reminders.
//
// Auth gate: `?secret=<CRON_SECRET>` query param OR
// `Authorization: Bearer <CRON_SECRET>` header. Both work so Vercel's
// default header-based invocation and a manual ops curl both succeed.
// Without a CRON_SECRET env set (local dev), we fall back to localhost-only
// rejecting external callers so this is never hit from production without
// an explicit secret pin. Mirrors `/api/cron/reconcile-stripe`.
//
// Idempotent: every iteration is gated on `status: 'scheduled'`, so re-runs
// after a partial batch (e.g. Vercel timed out mid-loop) pick up exactly
// the rows that haven't transitioned yet.
//
// One auditAndNotify call per run with the aggregate stats — keeps the
// audit log readable. Per-announcement audit happens at compose time,
// not at fire time.

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Local dev / unconfigured prod — reject every external caller.
    // Localhost is allowed so the developer can curl their own laptop.
    const fwd = req.headers.get("x-forwarded-for") || "";
    const host = req.headers.get("host") || "";
    if (fwd && !/^127\.|^::1|^localhost/.test(fwd.split(",")[0].trim())) return false;
    if (host && !/^localhost|^127\.0\.0\.1|^::1/.test(host)) return false;
    return true;
  }
  // Production — secret must match.
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  if (fromQuery && fromQuery === secret) return true;
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let result;
  try {
    result = await fireDueScheduledAnnouncements();
  } catch (err) {
    // Catastrophic failure — DB unreachable, schema drift, etc. We still
    // want to return a useful 500 + log it loud so the next ops review
    // sees the gap.
    // eslint-disable-next-line no-console
    console.error("[cron/send-scheduled-announcements] catastrophic failure:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown failure",
      },
      { status: 500 }
    );
  }

  // Best-effort audit row so the super-admin run log shows every cron
  // execution. Wrapped in try/catch because the cron run already
  // succeeded — broken audit must not bubble.
  try {
    await auditAndNotify("announcements.cron.run", {
      actor: {
        brotherId: null,
        name: "Scheduled-Announcements Cron",
        role: "system",
        ipAddress: null,
        userAgent: req.headers.get("user-agent") || null,
      },
      entity: {
        type: "AnnouncementsCron",
        id: new Date().toISOString(),
        name: `${result.fired} fired, ${result.failed} failed, ${result.skipped} skipped`,
      },
      payload: {
        candidates: result.candidates,
        fired: result.fired,
        failed: result.failed,
        skipped: result.skipped,
        rows: result.rows,
      },
    });
  } catch {
    // Audit drop is non-fatal; cron run already committed.
  }

  return NextResponse.json({ ok: true, ...result });
}

// POST is the same path so ops + Vercel Cron can both invoke it without
// caring which verb is used.
export const POST = GET;
