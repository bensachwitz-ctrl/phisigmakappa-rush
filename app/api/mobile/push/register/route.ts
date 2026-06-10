import { NextResponse } from "next/server";
import crypto from "crypto";
import { getTenantClient, centralDb } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { rateLimit, recordRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { errorSink } from "@/lib/logger";

export const dynamic = "force-dynamic";

// POST /api/mobile/push/register
//
// The native iOS/Android shell calls this after it receives an APNs/FCM device
// token AND the member is signed in. It stores the device token scoped to the
// authenticated chapter + portal user so events/announcements can be pushed.
//
// Auth model mirrors /api/mobile/data: the native app sends the chapter
// `subdomain` plus a tenant-bound Bearer token. The token only verifies for the
// chapter it was minted for (see lib/portal-auth signPortalTokenForTenant), so a
// chapter-A token can never register a device against chapter B.
//
// Storage: per-tenant SiteConfig key-value (no migration required — works on the
// live DB today). One row per (user, device) keyed by a hash of the token, so a
// member with multiple devices registers each, and re-registering the same device
// is idempotent.
export async function POST(req: Request) {
  // Light abuse guard (the heavy auth is the token verify below).
  const ip = clientIpFromRequest(req);
  const rl = rateLimit(`push-register:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  recordRateLimit(`push-register:${ip}`, { limit: 30, windowMs: 60_000 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subdomain = String(
    body.subdomain || req.headers.get("x-subdomain") || "",
  )
    .trim()
    .toLowerCase();
  const deviceToken = String(body.deviceToken || "").trim();
  const platform = String(body.platform || "ios").trim().toLowerCase();

  if (!subdomain || !deviceToken) {
    return NextResponse.json(
      { error: "subdomain and deviceToken are required." },
      { status: 400 },
    );
  }
  // Sanity-bound the token length to avoid storing junk.
  if (deviceToken.length > 512) {
    return NextResponse.json({ error: "deviceToken too long." }, { status: 400 });
  }

  // 1. Verify the chapter exists + is active.
  const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
  if (!tenant || !tenant.isActive) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }

  // 2. Verify the tenant-bound Bearer token.
  const authHeader = req.headers.get("authorization");
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : "";
  if (!token) {
    return NextResponse.json(
      { error: "Authentication token is required." },
      { status: 401 },
    );
  }
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess) {
    return NextResponse.json(
      { error: "Invalid or expired session." },
      { status: 401 },
    );
  }

  // 3. Persist the device token (idempotent per device).
  try {
    const db = getTenantClient(subdomain);
    const portalUser = await db.portalUser.findUnique({
      where: { id: sess.userId },
    });
    if (!portalUser) {
      return NextResponse.json(
        { error: "User not found in this chapter." },
        { status: 404 },
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(deviceToken)
      .digest("hex")
      .slice(0, 24);
    const key = `push.device.${sess.userId}.${tokenHash}`;
    const value = JSON.stringify({
      userId: sess.userId,
      role: sess.role,
      deviceToken,
      platform: platform === "android" ? "android" : "ios",
      updatedAt: new Date().toISOString(),
    });

    await db.siteConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    errorSink(err, { route: "/api/mobile/push/register", tenant: subdomain });
    return NextResponse.json(
      { error: "Unable to register for notifications right now." },
      { status: 500 },
    );
  }
}
