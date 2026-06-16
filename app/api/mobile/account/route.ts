import { NextResponse } from "next/server";
import { centralDb, getTenantClient } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { auditMobileExec } from "@/lib/mobile-exec-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS preflight — DELETE carries Authorization, so the WebView preflights.
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/**
 * DELETE /api/mobile/account — the signed-in member deletes their OWN account.
 *
 * Apple App Store Guideline 5.1.1(v): an app that supports account creation must
 * let the user initiate account deletion from within the app. This is that
 * endpoint for the bundled native member app.
 *
 * Body / query: { subdomain }   (the native app sends the chapter subdomain; we
 * also accept ?subdomain= and the X-Subdomain header for parity with the data
 * route). Auth: the caller's OWN tenant-bound Bearer token — we only ever delete
 * the account the verified token belongs to. There is no id/email input, so a
 * member can never delete anyone but themselves.
 *
 * What gets deleted (tenant-scoped):
 *   1. The member's PortalUser row (the login/account itself) — ALWAYS.
 *   2. Their underlying member record (Brother or AlumniProfile), which CASCADES
 *      their dependent rows via the schema's onDelete: Cascade relations (votes,
 *      RSVPs, dues payments, service hours, poll votes, chore/meeting attendance,
 *      etc.). Done in a transaction with the PortalUser delete.
 *
 * Robustness: if the member-record delete is blocked by a non-cascading FK
 * (e.g. an alumni with recorded donations), we still remove the PortalUser on a
 * fallback so the account/login is gone — the Apple requirement (the user can no
 * longer access the account) is met, and any residual non-personal financial
 * record is preserved for the chapter's books.
 */
export async function DELETE(req: Request) {
  return withCors(req, await handleDelete(req));
}

async function handleDelete(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  let bodySubdomain = "";
  try {
    const body = await req.json();
    bodySubdomain = String(body?.subdomain || "").trim();
  } catch {
    /* DELETE may carry no body — fall back to query/header below */
  }
  const subdomain = (
    bodySubdomain ||
    searchParams.get("subdomain") ||
    req.headers.get("x-subdomain") ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!subdomain) {
    return NextResponse.json({ error: "Chapter subdomain is required." }, { status: 400 });
  }

  // Chapter must exist + be active.
  const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
  if (!tenant) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }
  if (!tenant.isActive) {
    return NextResponse.json({ error: "This chapter is inactive." }, { status: 403 });
  }

  // Tenant-bound Bearer token → only this member's own account.
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Authentication token is required." }, { status: 401 });
  }
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({ where: { id: sess.userId } });
  if (!portalUser) {
    // Already gone (idempotent) — treat as success so a retried delete is clean.
    return NextResponse.json({ ok: true, deleted: true, alreadyGone: true });
  }

  // Capture a display name + member-record id for the audit trail before delete.
  let memberName = portalUser.email;
  const brotherId = portalUser.brotherId ?? null;
  const alumniId = portalUser.alumniId ?? null;
  try {
    if (brotherId) {
      const b = await db.brother.findUnique({ where: { id: brotherId }, select: { name: true } });
      if (b?.name) memberName = b.name;
    } else if (alumniId) {
      const a = await db.alumniProfile.findUnique({ where: { id: alumniId }, select: { fullName: true } });
      if (a?.fullName) memberName = a.fullName;
    }
  } catch {
    /* name is cosmetic for the audit row — ignore */
  }

  let memberRecordDeleted = false;
  try {
    // Atomic: delete the PortalUser + the underlying member record together so
    // the account never half-deletes. The member record's onDelete: Cascade
    // relations clear all dependent personal rows.
    await db.$transaction(async (tx) => {
      await tx.portalUser.delete({ where: { id: portalUser.id } });
      if (brotherId) {
        await tx.brother.delete({ where: { id: brotherId } });
        memberRecordDeleted = true;
      } else if (alumniId) {
        await tx.alumniProfile.delete({ where: { id: alumniId } });
        memberRecordDeleted = true;
      }
    });
  } catch (err: any) {
    // The member-record delete hit a non-cascading FK (e.g. alumni donations) or
    // another constraint. Fall back to deleting JUST the PortalUser so the
    // account/login is still removed (Apple 5.1.1(v) satisfied). Best-effort.
    console.error("[mobile/account] cascade delete fell back to PortalUser-only:", err?.code || err);
    memberRecordDeleted = false;
    try {
      await db.portalUser.delete({ where: { id: portalUser.id } });
    } catch (e: any) {
      // PortalUser may already be gone if the txn partially applied; if it's a
      // genuine hard failure, surface a 500 so the client can retry.
      if (e?.code !== "P2025") {
        console.error("[mobile/account] PortalUser delete failed:", e?.code || e);
        return NextResponse.json(
          { error: "Unable to delete your account right now. Please try again." },
          { status: 500 },
        );
      }
    }
  }

  // Best-effort audit (actor = the deleting member themselves).
  await auditMobileExec(
    db,
    { id: brotherId || portalUser.id, name: memberName },
    {
      action: "ACCOUNT_DELETED",
      subjectType: "PortalUser",
      subjectId: portalUser.id,
      subjectName: memberName,
      details: `self-service account deletion via app${memberRecordDeleted ? " (member record + cascade removed)" : " (login removed; member record retained)"}`,
      req,
    },
  );

  return NextResponse.json({ ok: true, deleted: true, memberRecordDeleted });
}
