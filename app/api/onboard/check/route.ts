import { NextResponse } from "next/server";
import { centralDb } from "@/lib/prisma";
import {
  normalizeSubdomain,
  checkSubdomainFormat,
} from "@/lib/reserved-subdomains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/onboard/check";

// Public, UNAUTH signup helper: given ?subdomain=, answer ONLY whether it is
// claimable. It returns a single boolean (+ a coarse reason) and NEVER any
// tenant data — a "taken" answer leaks nothing beyond the same fact the final
// signup POST would reveal. The denylist + format guard are imported from
// lib/reserved-subdomains so this live check and the final-submit check in
// app/api/onboard/route.ts agree exactly (see the SYNC CONTRACT in that lib).

// Modest per-IP rate limit. This endpoint fires on every debounced keystroke in
// the wizard, so the ceiling is generous, but it still caps a script hammering
// the registry to enumerate taken subdomains. Backed by the central RushSubmitLog
// table (the SAME DB-count pattern app/api/upload-headshot uses) so the cap is
// shared across instances rather than a per-process Map that reset on every cold
// start. Zero new infra / no migration; window/ceiling unchanged (60/min) so
// single-instance behavior is identical. Fail-open on a DB error.
const CHECK_WINDOW_MS = 60 * 1000; // 1m
const CHECK_LIMIT = 60; // ~1 req/s sustained, comfortably above debounced typing
const CHECK_STATUS = "ONBOARD_CHECK"; // RushSubmitLog discriminator for this route
async function isRateLimited(ip: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - CHECK_WINDOW_MS);
    const recent = await centralDb.rushSubmitLog.count({
      where: { ipAddress: ip, status: CHECK_STATUS, createdAt: { gte: since } },
    });
    if (recent >= CHECK_LIMIT) return true;
    centralDb.rushSubmitLog.create({ data: { ipAddress: ip, status: CHECK_STATUS } }).catch(() => {});
    return false;
  } catch {
    return false; // fail open — never block a real signup on a registry hiccup
  }
}

type CheckResult = {
  available: boolean;
  reason?: "taken" | "reserved" | "invalid";
};

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (ip !== "unknown" && (await isRateLimited(ip))) {
    return NextResponse.json(
      { available: false, reason: "invalid" } satisfies CheckResult,
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  const { searchParams } = new URL(req.url);
  // Sanitize identically to provisioning so the lookup key matches the registry.
  const subdomain = normalizeSubdomain(searchParams.get("subdomain"));

  // 1. Shape + reserved-denylist guard (no DB hit). Same predicates as the POST.
  const rejection = checkSubdomainFormat(subdomain);
  if (rejection) {
    return NextResponse.json(
      { available: false, reason: rejection } satisfies CheckResult,
      { status: 200 },
    );
  }

  // 2. Uniqueness against the central registry. Boolean only — no row data.
  try {
    const existing = await centralDb.tenant.findUnique({
      where: { subdomain },
      select: { id: true },
    });
    return NextResponse.json(
      existing
        ? ({ available: false, reason: "taken" } satisfies CheckResult)
        : ({ available: true } satisfies CheckResult),
      { status: 200 },
    );
  } catch {
    // Registry hiccup (e.g. the public."Tenant" table not yet created on a brand
    // new deploy, or a transient connection error). Do NOT claim "taken" on an
    // unproven collision — answer "available" so a real signup is never blocked
    // by a transient read failure. The final POST self-bootstraps the table and
    // re-checks uniqueness inside a transaction, so it remains the source of
    // truth and will still reject a genuine duplicate.
    return NextResponse.json(
      { available: true } satisfies CheckResult,
      { status: 200, headers: { "x-check": "registry-unavailable" } },
    );
  }
}
