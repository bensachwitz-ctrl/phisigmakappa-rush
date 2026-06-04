import { NextResponse } from "next/server";
import { centralDb } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — PUBLIC-SAFE health + status probe.
 *
 * Powers uptime monitors (UptimeRobot/BetterStack/Pingdom), the operator
 * console's "System health" glance, and quick on-call triage. Safe to expose
 * publicly:
 *
 *   • NO secrets, NO PII. The `integrations` map reports only BOOLEAN presence
 *     (is the env var set?) — never the value. "Stripe is configured" leaks
 *     nothing; the key itself never appears.
 *   • Always HTTP 200 (even when the DB is down) so a flaky database doesn't
 *     trip the front-door uptime monitor. Callers branch on the `db` field for
 *     fine-grained alerting and on `ok` for an at-a-glance roll-up.
 *   • `Cache-Control: no-store` so monitors always see live state.
 *
 * Shape:
 *   {
 *     ok, version, uptimeNote,
 *     db: "up" | "down",
 *     tenants: <count | 0 on error>,
 *     integrations: { stripe, stripeWebhook, resend, twilio, blob,
 *                     googleCal, cronSecret, adminSecret },  // booleans only
 *     deployedAt, region, ts, timestamp
 *   }
 *
 * `timestamp` is retained alongside `ts` for backward-compat with any monitor
 * that already reads the legacy field.
 */
export async function GET() {
  // DB probe — trivial round-trip. `SELECT 1` proves connectivity without
  // touching any tenant data. Wrapped so a down DB degrades, never 500s.
  let db: "up" | "down" = "up";
  try {
    await centralDb.$queryRaw`SELECT 1`;
  } catch {
    db = "down";
  }

  // Tenant count from the central registry (public."Tenant"). 0 on any error —
  // a registry hiccup must never make the probe fail.
  let tenants = 0;
  try {
    tenants = await centralDb.tenant.count();
  } catch {
    tenants = 0;
  }

  // Integration presence — BOOLEANS ONLY. `!!process.env.X` reveals whether a
  // credential is configured for this deploy, never its value.
  const integrations = {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    resend: !!process.env.RESEND_API_KEY,
    twilio: !!process.env.TWILIO_ACCOUNT_SID,
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    googleCal: !!process.env.GOOGLE_CLIENT_ID,
    cronSecret: !!process.env.CRON_SECRET,
    adminSecret: !!process.env.ADMIN_SESSION_SECRET,
  };

  const now = new Date().toISOString();
  const body = {
    // `ok` is the at-a-glance roll-up: app is serving AND the DB is reachable.
    ok: db === "up",
    // Non-secret build identifier. VERCEL_GIT_COMMIT_SHA is injected by Vercel;
    // falls back to the deployment id, then "local" in dev.
    version:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
      process.env.VERCEL_DEPLOYMENT_ID ||
      "local",
    // Serverless functions are stateless/ephemeral — there is no meaningful
    // process uptime to report. This string makes that explicit for humans.
    uptimeNote: "serverless — per-invocation; see Vercel Runtime Logs",
    db,
    tenants,
    integrations,
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID || "local",
    region: process.env.VERCEL_REGION || null,
    ts: now,
    // Legacy field — kept so an existing monitor reading `timestamp` still works.
    timestamp: now,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
