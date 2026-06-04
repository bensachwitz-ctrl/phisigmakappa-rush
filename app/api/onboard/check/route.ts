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
// the registry to enumerate taken subdomains. In-memory is fine for a single
// instance; a multi-instance deploy would back this with Redis.
const checkAttempts = new Map<string, number[]>();
const CHECK_WINDOW_MS = 60 * 1000; // 1m
const CHECK_LIMIT = 60; // ~1 req/s sustained, comfortably above debounced typing
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (checkAttempts.get(ip) || []).filter((t) => now - t < CHECK_WINDOW_MS);
  if (recent.length >= CHECK_LIMIT) return true;
  recent.push(now);
  checkAttempts.set(ip, recent);
  return false;
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
  if (ip !== "unknown" && isRateLimited(ip)) {
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
