// /api/admin/events/[id]/qr — generate (lazily) + return a rush event's QR
// check-in code so the admin "Show QR" button can render a scannable code.
//
// The Event.checkInCode column already exists (rush-cycle feature 2). We mint it
// the FIRST time an admin asks for the QR — existing events created before this
// feature get a code on demand, so nothing needs backfilling. The code is short,
// URL-safe, and unique; PNMs scan a QR whose URL is `/check-in/{checkInCode}`.
//
// GET returns { code, url, checkInCount } for the live QR + a running scan count.
// Admin-only (rush chair / e-board) via the cookie session — the same gate the
// rest of the events API uses.
import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Unambiguous alphabet (no 0/O/1/I/L) so a code is easy to read off a printed
// sign and never collides with a look-alike. 8 chars ≈ 32^8 space — plenty.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(len = 8): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** Build the absolute public check-in URL for the current host. */
function checkInUrl(code: string): string {
  const h = headers();
  const host = h.get("host") || h.get("x-forwarded-host") || "";
  const proto =
    h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/check-in/${code}`;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdminAuthed() || !isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  let code = event.checkInCode;
  if (!code) {
    // Mint a unique code on first request. Retry on the (astronomically rare)
    // unique-constraint collision rather than trusting a single draw.
    for (let attempt = 0; attempt < 6 && !code; attempt++) {
      const candidate = makeCode();
      try {
        const updated = await prisma.event.update({
          where: { id: event.id },
          data: { checkInCode: candidate },
        });
        code = updated.checkInCode;
      } catch {
        // unique collision → try a fresh code
      }
    }
    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Could not allocate a check-in code" },
        { status: 500 },
      );
    }
    await audit({
      action: "EVENT_QR_GENERATED",
      subjectType: "Event",
      subjectId: event.id,
      subjectName: event.name,
      details: `check-in code ${code}`,
    });
  }

  const checkInCount = await prisma.eventCheckIn.count({ where: { eventId: event.id } });

  return NextResponse.json({
    ok: true,
    code,
    url: checkInUrl(code),
    event: { id: event.id, name: event.name },
    checkInCount,
  });
}
