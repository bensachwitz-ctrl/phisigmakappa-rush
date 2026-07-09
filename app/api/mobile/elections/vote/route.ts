import { NextResponse } from "next/server";
import { centralDb, getTenantClient } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { auditMobileExec } from "@/lib/mobile-exec-auth";
import { buildMobileElectionView } from "@/lib/mobile-elections";
import { isVoterEligible } from "@/lib/elections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/elections/vote — a member casts a secret ballot for one seat.
 *
 * Body: { subdomain, seatId, candidateId }
 *
 * MEMBER-GATED server-side (tenant-bound Bearer token, brother role). Unlike the
 * exec routes this does NOT require an officer position — any active brother in
 * an OPEN election's audience may vote, once per seat.
 *
 * Integrity contract (mirrors the web admin election model):
 *   • The seat must belong to a currently-OPEN election (no voting on DRAFT/
 *     CLOSED/SEATED ballots).
 *   • The candidate must belong to that seat.
 *   • One ballot per (seat, voter): the @@unique([seatId, voterBrotherId]) index
 *     enforces this at the DB; we also pre-check for a clean 409 message. A
 *     duplicate is an idempotent no-op, never a double count.
 *   • Secret ballot: we write voterBrotherId for the dedup constraint ONLY; the
 *     response returns the AGGREGATE tally (per-candidate counts) + this voter's
 *     own choices — never any other voter's identity.
 *
 * Returns the refreshed member election view so the client shows the new tally +
 * "Voted" state without a second round-trip.
 */
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

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
  const seatId = String(body?.seatId || "").trim();
  const candidateId = String(body?.candidateId || "").trim();
  if (!subdomain) {
    return NextResponse.json({ error: "Chapter subdomain is required." }, { status: 400 });
  }
  if (!seatId || !candidateId) {
    return NextResponse.json({ error: "A seat and candidate are required." }, { status: 400 });
  }

  // 1. Chapter must exist + be active.
  const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
  if (!tenant) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }
  if (!tenant.isActive) {
    return NextResponse.json({ error: "This chapter is inactive." }, { status: 403 });
  }

  // 2. Tenant-bound Bearer token (a chapter-A token can never vote in chapter B).
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Authentication token is required." }, { status: 401 });
  }
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  // 3. Resolve the tenant client + the caller's PortalUser → Brother row. Only a
  //    brother-role session bound to a real Brother row may vote.
  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({ where: { id: sess.userId } });
  if (!portalUser) {
    return NextResponse.json({ error: "User not found in this chapter." }, { status: 404 });
  }
  if (sess.role !== "brother" || !portalUser.brotherId) {
    return NextResponse.json({ error: "Only active members can vote." }, { status: 403 });
  }
  const brother = await db.brother.findUnique({
    where: { id: portalUser.brotherId },
    select: { id: true, name: true, status: true },
  });
  if (!brother) {
    return NextResponse.json({ error: "Only active members can vote." }, { status: 403 });
  }
  // VOTER ELIGIBILITY — a live session is NOT enough: only a currently-active,
  // fully-initiated member (Brother.status in {ACTIVE, INITIATE}) may cast a
  // COUNTED ballot. An expelled/inactive/alumnus member who still holds a token
  // is rejected here BEFORE any ballot is written. Single-sourced with the
  // eligible-roster count in lib/mobile-elections (isVoterEligible).
  if (!isVoterEligible(brother.status)) {
    return NextResponse.json({ error: "Only active members can vote." }, { status: 403 });
  }

  try {
    // 4. The seat must belong to a currently-OPEN, brother-audience election,
    //    and the candidate must belong to that seat. One query proves both.
    const seat = await db.electionSeat.findUnique({
      where: { id: seatId },
      include: {
        election: { select: { status: true, audience: true } },
        candidates: { select: { id: true } },
      },
    });
    if (!seat || !seat.election) {
      return NextResponse.json({ error: "That ballot is no longer available." }, { status: 404 });
    }
    if (seat.election.status !== "OPEN") {
      return NextResponse.json({ error: "Voting is not open for this election." }, { status: 409 });
    }
    if (!["BROTHERS", "ALL"].includes(seat.election.audience)) {
      return NextResponse.json({ error: "You are not eligible to vote in this election." }, { status: 403 });
    }
    if (!seat.candidates.some((c) => c.id === candidateId)) {
      return NextResponse.json({ error: "That candidate is not on this ballot." }, { status: 400 });
    }

    // 5. One ballot per (seat, voter). Pre-check for a clean message; the
    //    @@unique([seatId, voterBrotherId]) index is the real guard against a
    //    race (handled by the catch below).
    const existing = await db.electionBallot.findUnique({
      where: { seatId_voterBrotherId: { seatId, voterBrotherId: brother.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "You have already voted for this seat." }, { status: 409 });
    }

    await db.electionBallot.create({
      data: { seatId, candidateId, voterBrotherId: brother.id },
    });

    // Forensic audit (best-effort): WHO voted on WHICH SEAT — never the choice,
    // so the secret ballot is preserved while still leaving an action trail.
    await auditMobileExec(db, brother, {
      action: "ELECTION_BALLOT_CAST",
      subjectType: "ElectionSeat",
      subjectId: seatId,
      subjectName: seat.title,
      details: `ballot cast via app for seat "${seat.title}"`,
      req,
    });

    // 6. Return the refreshed member view (new tally + this voter's choices).
    const view = await buildMobileElectionView(db, brother.id, sess.role);
    return NextResponse.json({ ok: true, election: view.election, myBallot: view.myBallot });
  } catch (err: any) {
    // Unique-constraint race → treat as already-voted (idempotent, never double).
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "You have already voted for this seat." }, { status: 409 });
    }
    console.error("[mobile/elections/vote] error:", err);
    return NextResponse.json({ error: "Unable to record your vote right now." }, { status: 500 });
  }
}
