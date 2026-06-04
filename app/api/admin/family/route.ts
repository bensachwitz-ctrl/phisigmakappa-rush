// /api/admin/family — Big / Little family-tree assignment endpoint.
//
// GET   → every brother in a lean shape (id, name, bigBrotherId, pledgeClass,
//         position, status) so the client can build the whole forest locally
//         and render the lineage tree without N+1 round-trips.
//
// PATCH → assign or clear a brother's big. Body: { brotherId, bigBrotherId,
//         pledgeClass? }. bigBrotherId === null clears the pairing.
//
//         CYCLE PREVENTION is the load-bearing validation here. The big/little
//         relation is a forest (each brother has ≤1 big, the `bigBrotherId`
//         self-FK). Assigning A's big = B is illegal when B is already a
//         descendant of A — that would close a loop (A→…→B→A) and make the
//         tree walk infinite. We reject it by walking UP from the proposed big
//         (B) through its ancestor chain; if we ever reach A, the edge would
//         create a loop, so we 400. A brother also cannot be their own big.
//
// Authorization: GET stays session-readable (isAdminAuthed — any valid member
// cookie) because the lineage forest is a member-visible roster view. The PATCH
// WRITE, however, assigns/clears bigs and so requires the "brothers" officer
// domain (guardOfficer("brothers","write") — admins/president short-circuit via
// superAdmin); isAdminAuthed() was too weak there, letting any logged-in brother
// rewire the family tree. The write also keeps isSameOrigin() (CSRF
// belt-and-suspenders, mirrors the other admin mutation routes). Writes a
// FAMILY_ASSIGNED / FAMILY_CLEARED audit row via lib/audit.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isSameOrigin } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lean projection — only the columns the forest UI needs. Deliberately omits
// passwordHash, contact info, dues, etc. so the family map never over-fetches.
const FAMILY_SELECT = {
  id: true,
  name: true,
  bigBrotherId: true,
  pledgeClass: true,
  position: true,
  status: true,
  headshotUrl: true,
} as const;

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const brothers = await prisma.brother.findMany({
      orderBy: { name: "asc" },
      select: FAMILY_SELECT,
    });
    return NextResponse.json({ ok: true, brothers });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

const PatchSchema = z.object({
  brotherId: z.string().min(1),
  // null clears the big; a string assigns it. `undefined` is not allowed —
  // the caller must be explicit about assign-vs-clear.
  bigBrotherId: z.string().min(1).nullable(),
  pledgeClass: z.string().max(80).optional().nullable(),
});

export async function PATCH(req: Request) {
  const denied = await guardOfficer("brothers", "write");
  if (denied) return denied;
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const { brotherId, bigBrotherId, pledgeClass } = parsed.data;

  // A brother can never be their own big.
  if (bigBrotherId && bigBrotherId === brotherId) {
    return NextResponse.json(
      { ok: false, error: "A brother cannot be their own big" },
      { status: 400 },
    );
  }

  // Confirm the subject exists (and grab its name for the audit row).
  const subject = await prisma.brother
    .findUnique({ where: { id: brotherId }, select: { id: true, name: true } })
    .catch(() => null);
  if (!subject) {
    return NextResponse.json({ ok: false, error: "Brother not found" }, { status: 404 });
  }

  let bigName: string | null = null;

  if (bigBrotherId) {
    // The proposed big must exist.
    const big = await prisma.brother
      .findUnique({ where: { id: bigBrotherId }, select: { id: true, name: true } })
      .catch(() => null);
    if (!big) {
      return NextResponse.json({ ok: false, error: "Big not found" }, { status: 404 });
    }
    bigName = big.name;

    // ── CYCLE PREVENTION ─────────────────────────────────────────────────
    // Walk UP the proposed big's ancestor chain (big → big's big → …). If we
    // ever hit `brotherId`, then `brotherId` is already an ancestor of the
    // proposed big, so adding the edge brotherId←bigBrotherId would close a
    // loop. Reject with 400.
    //
    // The walk is bounded two ways: a `seen` set short-circuits if the
    // EXISTING data somehow already contains a cycle (defensive — the API
    // prevents new ones, but a hand-edited DB could be dirty), and a hard
    // iteration cap guards against an unexpectedly deep chain. We only need
    // (id, bigBrotherId) at each hop, so each step is a single indexed lookup.
    const seen = new Set<string>([bigBrotherId]);
    let cursor: string | null = bigBrotherId;
    let hops = 0;
    const MAX_HOPS = 10_000; // far beyond any real chapter's lineage depth

    while (cursor && hops < MAX_HOPS) {
      const here: string = cursor; // break inference cycle (cursor is reassigned below)
      const node = await prisma.brother.findUnique({
        where: { id: here },
        select: { bigBrotherId: true },
      });

      const parent: string | null = node?.bigBrotherId ?? null;
      if (!parent) break; // reached a root — chain is clean

      if (parent === brotherId) {
        return NextResponse.json(
          { ok: false, error: "That assignment would create a loop in the family tree" },
          { status: 400 },
        );
      }
      if (seen.has(parent)) break; // pre-existing cycle upstream — stop walking
      seen.add(parent);
      cursor = parent;
      hops += 1;
    }
  }

  // Build the update. pledgeClass is only touched when the caller sent the key
  // (it's optional); "" normalizes to null to match the rest of the codebase.
  const data: { bigBrotherId: string | null; pledgeClass?: string | null } = {
    bigBrotherId: bigBrotherId,
  };
  if (pledgeClass !== undefined) {
    data.pledgeClass = pledgeClass === "" ? null : pledgeClass;
  }

  try {
    const updated = await prisma.brother.update({
      where: { id: brotherId },
      data,
      select: FAMILY_SELECT,
    });

    await audit({
      action: bigBrotherId ? "FAMILY_ASSIGNED" : "FAMILY_CLEARED",
      subjectType: "Brother",
      subjectId: brotherId,
      subjectName: subject.name,
      details: bigBrotherId
        ? `big set to ${bigName}${data.pledgeClass !== undefined ? ` · pledge class: ${data.pledgeClass ?? "—"}` : ""}`
        : "big cleared",
      req,
    });

    return NextResponse.json({ ok: true, brother: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
