import { NextResponse } from "next/server";
import { authorizeMobileExec, auditMobileExec } from "@/lib/mobile-exec-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { RUSH_STATUSES } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS preflight for the bundled native app — the WebView fires OPTIONS because
// the POST carries Authorization + Content-Type. The web app is same-origin.
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/**
 * POST /api/mobile/exec/rush — officer advances a PNM's recruitment status.
 *
 * Body: { subdomain, pnmId (or rushId/id), status }
 *   status ∈ RUSH_STATUSES (ACTIVE | DROPPED | BID_EXTENDED | ACCEPTED | DECLINED)
 *   — the app surfaces "Extend bid" (BID_EXTENDED), "Accept" (ACCEPTED), and
 *   "Reject" (DROPPED); the route accepts any canonical status for parity with
 *   the admin rushee PATCH.
 *
 * OFFICER-GATED server-side via authorizeMobileExec (the SAME shared gate the
 * roster/announce/reset exec routes use): recomputes capabilities.exec from the
 * verified portal session + the caller's REAL admin-set Brother.position, so a
 * non-officer (plain member / alumni token) gets 403 and NO write happens. Also
 * tenant-bound (a chapter-A token can't operate chapter B) and billing-write-
 * guarded. PERSISTS a single Rush.status update via the tenant client, mirroring
 * the admin /api/admin/rushees/[id] PATCH (minus the convert-to-pledge branch).
 */
export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

// Non-terminal filter mirrors app/api/mobile/data/route.ts so the refreshed list
// this route returns matches the pnms shape the dashboard already renders.
const HIDDEN_STATUSES = ["REJECTED", "DECLINED", "WITHDRAWN"];

async function handlePost(req: Request): Promise<NextResponse> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Shared officer gate (recomputes capabilities.exec from the DB position).
  const gate = await authorizeMobileExec(req, body.subdomain);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { db, brother: officer } = gate;

  // Accept the id under any of the client's field names.
  const pnmId = String(body.pnmId ?? body.rushId ?? body.id ?? "").trim();
  if (!pnmId) {
    return NextResponse.json({ error: "A PNM id is required." }, { status: 400 });
  }

  const status = String(body.status ?? "").trim().toUpperCase();
  if (!(RUSH_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${RUSH_STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }

  try {
    const before = await db.rush.findUnique({
      where: { id: pnmId },
      select: { id: true, name: true, status: true },
    });
    if (!before) {
      return NextResponse.json({ error: "PNM not found in this chapter." }, { status: 404 });
    }

    const updated = await db.rush.update({
      where: { id: pnmId },
      data: { status },
      select: { id: true, name: true, status: true, year: true, major: true },
    });

    await auditMobileExec(db, officer, {
      action: "RUSH_STATUS_UPDATED",
      subjectType: "Rush",
      subjectId: updated.id,
      subjectName: updated.name,
      details: `${before.status} → ${status} via app by ${officer.name}`,
      req,
    });

    // Return the refreshed pipeline (same filter/shape the dashboard uses) so the
    // client can adopt it immediately; it also refetches the dashboard.
    const rushees = await db.rush.findMany({
      where: { status: { notIn: HIDDEN_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, status: true, year: true, major: true, createdAt: true },
    });
    const pnms = rushees.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      year: r.year,
      major: r.major,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, rush: updated, pnms });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "PNM not found in this chapter." }, { status: 404 });
    }
    console.error("[mobile/exec/rush] error:", err);
    return NextResponse.json({ error: "Unable to update the PNM right now." }, { status: 500 });
  }
}
