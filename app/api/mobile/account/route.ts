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
/**
 * POST /api/mobile/account — the signed-in member updates their OWN profile.
 *
 * Body: { subdomain, phone?, year?, major?, hometown?, gradYear?, bio?,
 *         employer?, jobTitle?, city?, state?, linkedinUrl?, preferredName? }
 *
 * Auth: the caller's OWN tenant-bound Bearer token. We resolve the verified
 * PortalUser → the underlying member record (Brother for brother sessions,
 * AlumniProfile for alumni sessions) and persist ONLY the safe, self-editable
 * fields the mobile Edit-Profile form exposes. SECURITY: name/email/role/
 * position/duesPaid/serviceHours/standing/admin flags are NEVER writable here —
 * a member can change their contact/bio details but can never elevate themselves
 * or alter their dues/standing. There is no id input, so a member can only ever
 * edit their own record.
 *
 * The brother form edits: phone, year, major, hometown, gradYear, bio.
 * The alumni form edits: phone, employer, jobTitle, city, state, bio,
 * linkedinUrl, preferredName.
 */
export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

async function handlePost(req: Request): Promise<NextResponse> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subdomain = String(body?.subdomain || "").trim().toLowerCase();
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

  // Tenant-bound Bearer token → only this member's own profile.
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
    return NextResponse.json({ error: "User not found in this chapter." }, { status: 404 });
  }

  // Normalize an optional free-text field: trim, clamp, and treat "" as "clear".
  const optStr = (v: unknown, max: number): string | null | undefined => {
    if (v === undefined) return undefined; // not sent → leave unchanged
    if (v === null) return null;
    const s = String(v).trim();
    return s ? s.slice(0, max) : null;
  };

  try {
    if (sess.role === "brother" && portalUser.brotherId) {
      // ONLY the self-editable brother fields. Anything not present in `body`
      // stays unchanged (optStr returns undefined → omitted from the update).
      const data: Record<string, any> = {
        phone: optStr(body.phone, 40),
        year: optStr(body.year, 40),
        major: optStr(body.major, 120),
        hometown: optStr(body.hometown, 120),
        gradYear: optStr(body.gradYear, 40),
        bio: optStr(body.bio, 2000),
      };
      for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

      const updated = await db.brother.update({
        where: { id: portalUser.brotherId },
        data,
        select: {
          id: true, name: true, email: true, phone: true, year: true,
          major: true, hometown: true, gradYear: true, bio: true,
          position: true, pledgeClass: true, status: true, duesPaid: true,
          headshotUrl: true, graduationYear: true,
        },
      });

      await auditMobileExec(
        db,
        { id: portalUser.brotherId, name: updated.name },
        {
          action: "PROFILE_UPDATED",
          subjectType: "Brother",
          subjectId: portalUser.brotherId,
          subjectName: updated.name,
          details: `self-service profile update via app (fields: ${Object.keys(data).join(", ") || "none"})`,
          req,
        },
      );

      return NextResponse.json({ ok: true, profile: updated });
    }

    if (sess.role === "alumni" && portalUser.alumniId) {
      const data: Record<string, any> = {
        phone: optStr(body.phone, 40),
        employer: optStr(body.employer, 200),
        jobTitle: optStr(body.jobTitle, 200),
        city: optStr(body.city, 120),
        state: optStr(body.state, 120),
        bio: optStr(body.bio, 2000),
        linkedinUrl: optStr(body.linkedinUrl, 500),
        preferredName: optStr(body.preferredName, 120),
      };
      for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

      const updated = await db.alumniProfile.update({
        where: { id: portalUser.alumniId },
        data,
        select: {
          id: true, fullName: true, preferredName: true, email: true,
          phone: true, employer: true, jobTitle: true, city: true,
          state: true, bio: true, linkedinUrl: true, graduationYear: true,
          pledgeClass: true,
        },
      });

      await auditMobileExec(
        db,
        { id: portalUser.alumniId, name: updated.fullName },
        {
          action: "PROFILE_UPDATED",
          subjectType: "AlumniProfile",
          subjectId: portalUser.alumniId,
          subjectName: updated.fullName,
          details: `self-service profile update via app (fields: ${Object.keys(data).join(", ") || "none"})`,
          req,
        },
      );

      return NextResponse.json({ ok: true, profile: updated });
    }

    // Session role didn't line up with a member record (shouldn't happen for a
    // valid token) — refuse rather than silently no-op.
    return NextResponse.json({ error: "No editable profile for this session." }, { status: 403 });
  } catch (err: any) {
    console.error("[mobile/account POST] profile update failed:", err?.code || err);
    return NextResponse.json(
      { error: "Unable to update your profile right now. Please try again." },
      { status: 500 },
    );
  }
}

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
