import { NextResponse } from "next/server";
import { applyPendingMigrationsToAllTenants } from "@/lib/tenant-migrations";
import { logger, errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/cron/apply-tenant-migrations";

/**
 * GET|POST /api/cron/apply-tenant-migrations
 *
 * OPS / DEPLOY trigger — brings PRE-EXISTING tenant schemas up to date by
 * (re)applying the curated, KNOWN-IDEMPOTENT manual migrations under
 * prisma/manual-migrations to every active chapter schema (see
 * lib/tenant-migrations). New tenants already get the full schema at onboard time;
 * this heals schemas provisioned before a given migration landed — most notably
 * the portal_password_reset table, whose absence silently breaks member-portal
 * password reset.
 *
 * SAFE + IDEMPOTENT: every migration statement is IF-NOT-EXISTS / catalog-guarded,
 * so this is strictly additive and re-running is a clean no-op. forEachTenant
 * isolates each chapter so one bad schema can't abort the run.
 *
 * NOT a scheduled cron — it is intentionally omitted from vercel.json and is meant
 * to be fired once per deploy that ships a new manual migration (or on demand by
 * an operator). Auth mirrors /api/cron/reconcile-stripe: `?secret=<CRON_SECRET>`
 * query OR `Authorization: Bearer <CRON_SECRET>`; without a CRON_SECRET env (local
 * dev) only localhost is allowed.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Local dev / unconfigured prod — reject every external caller; allow only
    // localhost so a developer can curl their own machine.
    const fwd = req.headers.get("x-forwarded-for") || "";
    const host = req.headers.get("host") || "";
    if (fwd && !/^127\.|^::1|^localhost/.test(fwd.split(",")[0].trim())) return false;
    if (host && !/^localhost|^127\.0\.0\.1|^::1/.test(host)) return false;
    return true;
  }
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  if (fromQuery && fromQuery === secret) return true;
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  return false;
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await applyPendingMigrationsToAllTenants();
    const tenants = summary.length;
    const failedTenants = summary.filter((t) => !t.ok).length;
    logger.info("ops.apply_tenant_migrations", {
      route: ROUTE,
      tenants,
      failedTenants,
      outcome: "applied",
    });
    return NextResponse.json({ ok: true, tenants, failedTenants, results: summary });
  } catch (err) {
    errorSink(err, { route: ROUTE, outcome: "apply_failed" });
    return NextResponse.json({ ok: false, error: "Migration apply failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
