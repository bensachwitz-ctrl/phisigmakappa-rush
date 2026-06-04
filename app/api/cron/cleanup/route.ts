import { NextResponse } from "next/server";
import { forEachTenant } from "@/lib/prisma";

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
 * Multi-tenant fan-out: RushSubmitLog + AuditLog live in EACH chapter's
 * schema, not `public`. Vercel hits this deployment with no subdomain, so the
 * Host-header `prisma` proxy would resolve to the empty `public` schema and
 * prune nothing for any real chapter. Instead we loop EVERY active tenant via
 * `forEachTenant`, running both deleteMany passes on that chapter's explicit
 * schema-bound client, and aggregate the deleted counts. Per-tenant failures
 * are isolated by forEachTenant + our own per-pass try/catch.
 *
 * Triggered by Vercel Cron at 03:14 UTC daily (see vercel.json). Authed by a
 * `CRON_SECRET` bearer token (Vercel Cron sends `Authorization: Bearer
 * ${CRON_SECRET}` automatically when the env var is set — see
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * For backward-compat we also still accept the bare `x-vercel-cron` header,
 * and in local dev (no CRON_SECRET) we fall back to localhost-only so a
 * developer can curl their own laptop without locking themselves out.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";

  // Preferred: the signed bearer secret. Vercel Cron sends this automatically
  // when CRON_SECRET is set in the project env.
  if (secret && auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;

  // Backward-compat: Vercel's bare cron header. Kept so an already-scheduled
  // job that predates the secret keeps working.
  if (req.headers.get("x-vercel-cron") !== null) return true;

  // Local dev / unconfigured: with no secret set, allow localhost only so the
  // developer can curl their own machine; reject every external caller.
  if (!secret) {
    const fwd = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const host = req.headers.get("host") || "";
    if (fwd && !/^127\.|^::1|^localhost/.test(fwd)) return false;
    if (host && !/^localhost|^127\.0\.0\.1|^::1/.test(host)) return false;
    return true;
  }

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rushLogCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const auditCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  // Fan the two pruning passes out across every active chapter's schema.
  // Each tenant is isolated; within a tenant each pass has its own try/catch
  // so one bad table can't block the other from pruning.
  const perTenant = await forEachTenant(async (db) => {
    let rushLogPruned = 0;
    let auditPruned = 0;
    const errors: string[] = [];

    try {
      const result = await db.rushSubmitLog.deleteMany({
        where: { createdAt: { lt: rushLogCutoff } },
      });
      rushLogPruned = result.count;
    } catch (err: any) {
      errors.push(`rushSubmitLog: ${err?.message || "failed"}`);
    }

    try {
      const result = await db.auditLog.deleteMany({
        where: { createdAt: { lt: auditCutoff } },
      });
      auditPruned = result.count;
    } catch (err: any) {
      errors.push(`auditLog: ${err?.message || "failed"}`);
    }

    return { rushLogPruned, auditPruned, errors };
  });

  // Aggregate deleted counts across chapters + collect every error (tenant-
  // level from forEachTenant, plus per-pass from inside the callback).
  let rushLogPruned = 0;
  let auditPruned = 0;
  const errors: string[] = [];
  const tenants = perTenant.map((t) => {
    if (t.ok && t.result) {
      rushLogPruned += t.result.rushLogPruned;
      auditPruned += t.result.auditPruned;
      for (const e of t.result.errors) errors.push(`${t.tenant}/${e}`);
      return {
        tenant: t.tenant,
        ok: t.result.errors.length === 0,
        rushLogPruned: t.result.rushLogPruned,
        auditPruned: t.result.auditPruned,
        ...(t.result.errors.length > 0 ? { errors: t.result.errors } : {}),
      };
    }
    errors.push(`${t.tenant}: ${t.error || "tenant failure"}`);
    return { tenant: t.tenant, ok: false, error: t.error };
  });

  // Partial success is still a success — we don't want one bad table or one
  // bad chapter to block the others from pruning on subsequent runs. Counts
  // and cutoffs keep their original shape; per-tenant breakdown is additive.
  return NextResponse.json({
    ok: errors.length === 0,
    rushLogPruned,
    rushLogCutoff: rushLogCutoff.toISOString(),
    auditPruned,
    auditCutoff: auditCutoff.toISOString(),
    tenantCount: tenants.length,
    tenants,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
