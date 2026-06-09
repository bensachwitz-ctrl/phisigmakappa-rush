import { NextResponse } from "next/server";
import { getTenantClient, centralDb } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subdomain = String(body.subdomain || "").trim().toLowerCase();
  const eventId = String(body.eventId || "").trim();
  const status = String(body.status || "").trim().toUpperCase();
  const note = body.note ? String(body.note).trim() : null;

  if (!subdomain || !eventId || !status) {
    return NextResponse.json({ error: "chapter, eventId, and status are required." }, { status: 400 });
  }

  if (status !== "GOING" && status !== "NOT_GOING" && status !== "MAYBE") {
    return NextResponse.json({ error: "Status must be GOING, NOT_GOING, or MAYBE." }, { status: 400 });
  }

  // 1. Verify tenant in central database
  const tenant = await centralDb.tenant.findUnique({
    where: { subdomain },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }

  if (!tenant.isActive) {
    return NextResponse.json({ error: "This chapter is inactive." }, { status: 403 });
  }

  // 2. Extract and verify portal token
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";

  if (!token) {
    return NextResponse.json({ error: "Authentication token is required." }, { status: 401 });
  }

  // Tenant-bound verification: a token only verifies for the chapter it was minted
  // for, so it can't RSVP into another chapter's events.
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess || sess.role !== "brother") {
    return NextResponse.json({ error: "Unauthorized. Brothers only." }, { status: 401 });
  }

  // 3. Resolve tenant DB and brother profile
  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({
    where: { id: sess.userId },
  });

  if (!portalUser || !portalUser.brotherId) {
    return NextResponse.json({ error: "Brother profile not found in this chapter." }, { status: 404 });
  }

  // 4. Verify event exists
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // 5. Upsert the RSVP in the tenant schema
  const rsvp = await db.brotherRSVP.upsert({
    where: {
      eventId_brotherId: {
        eventId,
        brotherId: portalUser.brotherId,
      },
    },
    update: {
      status,
      note,
    },
    create: {
      eventId,
      brotherId: portalUser.brotherId,
      status,
      note,
    },
  });

  return NextResponse.json({ ok: true, rsvp });
}
