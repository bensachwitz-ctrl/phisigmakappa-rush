import { NextResponse } from "next/server";
import {
  verifySuperAdminPassword,
  setSuperAdminCookie,
  clearSuperAdminCookie,
  isSuperAdminConfigured,
} from "@/lib/superadmin";
import { getClientIp } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-IP brute-force throttle on the platform password. This single password
 * gates the most destructive surface on the whole platform (suspend/delete any
 * chapter), so unlimited guessing is unacceptable. In-memory is sufficient for
 * a single instance; a multi-instance deploy would back this with Redis. We use
 * an in-memory map (not the tenant DB) because the platform console is
 * tenant-agnostic and the apex request carries no tenant schema.
 */
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const LIMIT = 8;

function clientIp(req: Request): string {
  // Prefer the non-forgeable platform header so a client can't rotate
  // x-forwarded-for to dodge the per-IP cap on this destructive surface.
  return getClientIp(req) || "unknown";
}

function isRateLimited(ip: string): boolean {
  if (ip === "unknown") return false;
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(ip, recent);
  return recent.length >= LIMIT;
}

function recordFailure(ip: string): void {
  if (ip === "unknown") return;
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
}

function clearFailures(ip: string): void {
  attempts.delete(ip);
}

export async function POST(req: Request) {
  // Hard-disable the entire console when no platform password is configured.
  // Returning 503 (not 401) makes the misconfiguration obvious to the operator
  // and avoids implying that some password might work.
  if (!isSuperAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Platform console not configured" },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    recordFailure(ip);
    return NextResponse.json({ ok: false, error: "Password is required" }, { status: 400 });
  }

  if (!verifySuperAdminPassword(password)) {
    recordFailure(ip);
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  clearFailures(ip);
  setSuperAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearSuperAdminCookie();
  return NextResponse.json({ ok: true });
}
