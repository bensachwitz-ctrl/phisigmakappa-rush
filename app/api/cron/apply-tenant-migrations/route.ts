import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { applyPendingMigrationsToAllTenants } from "@/lib/tenant-migrations";
import { logger, errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/cron/apply-tenant-migrations";

/**
 * POST /api/cron/apply-tenant-migrations
 *
 * OPS / DEPLOY trigger — brings PRE-EXISTING tenant schemas up to date by
 * (re)applying the curated, KNOWN-IDEMPOTENT manual migrations under
 * prisma/manual-migrations to every chapter schema — INCLUDING inactive/pending
 * ones (see lib/tenant-migrations, which fans out via forEachTenantIncludingInactive
 * so a not-yet-live chapter's schema is still healed). New tenants already get the
 * full schema at onboard time; this heals schemas provisioned before a given
 * migration landed — most notably the portal_password_reset table, whose absence
 * silently breaks member-portal password reset.
 *
 * SAFE + IDEMPOTENT: every migration statement is IF-NOT-EXISTS / catalog-guarded,
 * so this is strictly additive and re-running is a clean no-op. The iterator
 * isolates each chapter so one bad schema can't abort the run.
 *
 * POST-ONLY: this MUTATES every tenant schema, so it is not a safe/idempotent GET.
 * NOT a scheduled cron — it is intentionally omitted from vercel.json and is meant
 * to be fired once per deploy that ships a new manual migration (or on demand by
 * an operator). Auth PREFERS `Authorization: Bearer <CRON_SECRET>` (constant-time)
 * or the platform-only `x-vercel-cron` header; `?secret=` is kept for ops curls
 * (also constant-time). Without a CRON_SECRET env (local dev) only localhost is
 * allowed.
 */

/** Constant-time string compare (length-guarded) so the secret can't be leaked
 *  byte-by-byte via response timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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
  if (req.headers.get("x-vercel-cron")) return true;
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ") && safeEqual(auth.slice(7), secret)) return true;
  const fromQuery = new URL(req.url).searchParams.get("secret");
  if (fromQuery && safeEqual(fromQuery, secret)) return true;
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

export async function POST(req: Request) {
  return run(req);
}
