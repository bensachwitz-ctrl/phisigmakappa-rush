import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalSession, isAdminOverride } from "@/lib/portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: Add or update a vouch for a PNM
export async function POST(req: Request) {
  const sess = getPortalSession();
  const isAdmin = isAdminOverride();

  if (!sess && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine alumni ID
  let alumniId = sess?.role === "alumni" ? sess.userId : null;
  
  if (sess?.role === "alumni") {
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: sess.userId },
    });
    alumniId = portalUser?.alumniId || null;
  }

  // Admin override does NOT auto-pick an arbitrary alumnus — a vouch is
  // attributed to a specific person, so writing one under a random alumni id
  // (the old findFirst) corrupted the vouch ledger. Vouches require a real
  // alumni identity.
  if (!alumniId) {
    return NextResponse.json(
      { error: "Vouches must be made from your alumni account." },
      { status: 403 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rushId, note } = body;
  if (!rushId) {
    return NextResponse.json({ error: "PNM (rushId) is required." }, { status: 400 });
  }

  // Create or update vouch
  const vouch = await prisma.alumniVouch.upsert({
    where: {
      rushId_alumniId: {
        rushId,
        alumniId,
      },
    },
    update: {
      note: note ? String(note).trim().slice(0, 500) : null,
    },
    create: {
      rushId,
      alumniId,
      note: note ? String(note).trim().slice(0, 500) : null,
    },
  });

  return NextResponse.json({ ok: true, vouch });
}

// DELETE: Revoke a vouch
export async function DELETE(req: Request) {
  const sess = getPortalSession();
  const isAdmin = isAdminOverride();

  if (!sess && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let alumniId = sess?.role === "alumni" ? sess.userId : null;
  if (sess?.role === "alumni") {
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: sess.userId },
    });
    alumniId = portalUser?.alumniId || null;
  }

  if (!alumniId) {
    return NextResponse.json(
      { error: "Vouches must be managed from your alumni account." },
      { status: 403 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rushId } = body;
  if (!rushId) {
    return NextResponse.json({ error: "PNM (rushId) is required." }, { status: 400 });
  }

  // Idempotent un-vouch: deleting a vouch that doesn't exist (double-click,
  // or revoking one never created) must not 500. Swallow the P2025
  // "record not found" the same way the poll-vote / RSVP DELETE handlers do.
  await prisma.alumniVouch
    .delete({
      where: {
        rushId_alumniId: {
          rushId,
          alumniId,
        },
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
