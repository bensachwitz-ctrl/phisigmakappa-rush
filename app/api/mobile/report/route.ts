import { NextResponse } from "next/server";
import { getTenantClient, centralDb } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ───────────────────────────────────────────────────────────────────────────
// POST /api/mobile/report — member-facing UGC moderation report (Apple 1.2).
// ───────────────────────────────────────────────────────────────────────────
// The bundled native app surfaces cross-member user-generated content: officer
// announcements, an opted-in member/alumni directory, and alumni career posts.
// Apple Guideline 1.2 requires the app to give a member a way to REPORT
// objectionable content + BLOCK an abusive member, and for the report to reach a
// moderator. This endpoint is that wired path.
//
// SELF-ONLY, TOKEN-BOUND. Authentication is identical to /api/mobile/data: the
// chapter must be active in the central registry AND the caller must present a
// tenant-bound Bearer token that only verifies for THIS subdomain (a chapter-A
// token can never file a report into chapter B). Any authenticated member of the
// chapter may file a report — no officer gate (a victim is, by definition, not an
// officer). The reporter's identity is taken from the VERIFIED session, never
// from the body, so a caller cannot impersonate another reporter.
//
// ZERO-MIGRATION delivery. We do NOT add a Prisma model/migration. The report is
// recorded as an immutable AuditLog row (the same forensic table every mobile
// mutation writes to) AND an admin alert is delivered through greek-stack's
// EXISTING notification path — an Announcement scoped to the EBOARD audience,
// status="sent", which the chapter's officers already see in their own feed
// (/api/mobile/data reads EBOARD for officers; the web /admin surface lists
// Announcements). One member action → one audit row + one admin-visible alert.

// CORS preflight — the native POST carries Authorization + Content-Type headers,
// which makes the WebView fire an OPTIONS preflight.
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

// The kinds of moderation event the client can file. `report` flags a piece of
// content as objectionable; `block` / `unblock` mirror a member's client-side
// block decision so a moderator has a record (the hide itself is enforced on the
// device via Preferences — see mobile-shell). Unknown kinds are rejected.
const VALID_KINDS = new Set(["report", "block", "unblock"]);

// What a report can target. Free-form-ish but bounded so an attacker can't stuff
// the audit/announcement columns with arbitrary labels.
const VALID_TARGET_TYPES = new Set([
  "announcement",
  "career",
  "member",
  "alumni",
  "profile",
  "other",
]);

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

  const subdomain = String(body.subdomain || "").trim().toLowerCase();
  if (!subdomain) {
    return NextResponse.json({ error: "Chapter subdomain is required." }, { status: 400 });
  }

  // 1. Chapter must exist + be active in the central registry.
  const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
  if (!tenant) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }
  if (!tenant.isActive) {
    return NextResponse.json({ error: "This chapter is inactive." }, { status: 403 });
  }

  // 2. Tenant-bound Bearer token — self-only, no officer gate. A token minted for
  //    another chapter cannot verify here, so a report is always scoped to the
  //    chapter the reporter actually belongs to.
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Authentication token is required." }, { status: 401 });
  }
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  // 3. Resolve tenant client + the VERIFIED reporter. The reporter's identity is
  //    derived here from the session, never trusted from the request body.
  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({ where: { id: sess.userId } });
  if (!portalUser) {
    return NextResponse.json({ error: "User not found in this chapter." }, { status: 404 });
  }

  // Resolve a human-readable reporter name for the audit row + admin alert.
  let reporterName = portalUser.email || "A member";
  if (sess.role === "brother" && portalUser.brotherId) {
    const me = await db.brother.findUnique({
      where: { id: portalUser.brotherId },
      select: { name: true },
    });
    if (me?.name) reporterName = me.name;
  } else if (sess.role === "alumni" && portalUser.alumniId) {
    const me = await db.alumniProfile.findUnique({
      where: { id: portalUser.alumniId },
      select: { fullName: true },
    });
    if (me?.fullName) reporterName = me.fullName;
  }

  // 4. Validate the moderation payload.
  const kind = String(body.kind || "report").trim().toLowerCase();
  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: "Unknown report kind." }, { status: 400 });
  }

  const targetTypeRaw = String(body.targetType || "other").trim().toLowerCase();
  const targetType = VALID_TARGET_TYPES.has(targetTypeRaw) ? targetTypeRaw : "other";
  const targetId = String(body.targetId || "").trim().slice(0, 200) || null;
  // A short label for the target (member name, announcement title …) — bounded.
  const targetName = String(body.targetName || "").trim().slice(0, 200) || null;
  // The reporter's free-text reason — bounded so it can't bloat the columns.
  const reason = String(body.reason || "").trim().slice(0, 1000);

  // A "report" must name what is being reported; block/unblock must name who.
  if (kind === "report" && !targetId && !targetName) {
    return NextResponse.json({ error: "Tell us what you're reporting." }, { status: 400 });
  }
  if ((kind === "block" || kind === "unblock") && !targetId && !targetName) {
    return NextResponse.json({ error: "Tell us which member." }, { status: 400 });
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const action =
    kind === "report"
      ? "CONTENT_REPORTED"
      : kind === "block"
      ? "MEMBER_BLOCKED"
      : "MEMBER_UNBLOCKED";

  const verbSentence =
    kind === "report"
      ? `${reporterName} reported ${targetType} "${targetName || targetId}"${reason ? ` — ${reason}` : ""}`
      : kind === "block"
      ? `${reporterName} blocked member "${targetName || targetId}"${reason ? ` — ${reason}` : ""}`
      : `${reporterName} unblocked member "${targetName || targetId}"`;

  // 5a. Immutable forensic record — the report itself (best-effort; never throws
  //     back to the caller, mirroring auditMobileExec).
  try {
    await db.auditLog.create({
      data: {
        actorId: portalUser.brotherId || portalUser.alumniId || portalUser.id,
        actorName: reporterName,
        action,
        subjectType: targetType === "member" || targetType === "alumni" || targetType === "profile" ? "Member" : "Content",
        subjectId: targetId,
        subjectName: targetName,
        details: `${verbSentence.slice(0, 900)} · via app`,
        ipAddress,
      },
    });
  } catch {
    /* best-effort forensic trail — must not break the member's report */
  }

  // 5b. Admin alert — delivered through the EXISTING notification path (an
  //     EBOARD-scoped Announcement officers already see). authorId stays null:
  //     this is a system alert, never authored by the reporter (and never names
  //     the reporter to other members — the EBOARD audience is officer-only).
  //     Best-effort: a failed alert must not 500 the report.
  let notified = false;
  try {
    const title = kind === "report" ? "Content reported" : kind === "block" ? "Member blocked" : "Member unblocked";
    await db.announcement.create({
      data: {
        title: `[moderation] ${title}`,
        body: verbSentence.slice(0, 2000),
        audience: "EBOARD",
        pinned: false,
        authorId: null,
        status: "sent",
        sentAt: new Date(),
        channels: "inapp",
      },
    });
    notified = true;
  } catch {
    /* best-effort admin alert — the audit row above still captured the report */
  }

  return NextResponse.json({ ok: true, kind, notified });
}
