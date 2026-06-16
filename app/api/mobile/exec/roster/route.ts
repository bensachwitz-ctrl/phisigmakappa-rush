import { NextResponse } from "next/server";
import { authorizeMobileExec, auditMobileExec } from "@/lib/mobile-exec-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";

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
 * POST /api/mobile/exec/roster — officer add/remove a member.
 *
 * Body: { subdomain, action: "add" | "remove", ... }
 *   add    → { name (required), email?, phone?, position?, pledgeClass?, year?, major? }
 *   remove → { memberId (required) }  — `brotherId` is accepted as a legacy alias.
 *            The bundled shell (mobile-shell/index.html) and MobileAppClient.tsx
 *            both POST `memberId`; reading only `brotherId` here previously 400'd
 *            every real remove. Accept either so the contract matches the client.
 *
 * OFFICER-GATED server-side: authorizeMobileExec recomputes capabilities.exec
 * from the verified portal session + the caller's REAL admin-set Brother.position
 * — a non-officer (plain member / alumni token) gets 403 and no write happens.
 * PERSISTS: add creates a Brother row, remove deletes one (Prisma cascade clears
 * dependent rows per the schema relations). Mirrors the admin BrothersManager
 * write logic (lib path is the same db.brother.{create,delete}).
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

  // Server-side officer gate (recomputes capabilities.exec from the DB position).
  const gate = await authorizeMobileExec(req, body.subdomain);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { db, brother: officer } = gate;

  const action = String(body.action || "").trim().toLowerCase();
  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ error: "action must be 'add' or 'remove'." }, { status: 400 });
  }

  try {
    if (action === "add") {
      const name = String(body.name || "").trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "A member name is required." }, { status: 400 });
      }
      // Optional fields — empty strings normalize to null so we never write "".
      const norm = (v: unknown) => {
        const s = v == null ? "" : String(v).trim();
        return s === "" ? null : s;
      };
      const created = await db.brother.create({
        data: {
          name,
          email: norm(body.email),
          phone: norm(body.phone),
          position: norm(body.position),
          pledgeClass: norm(body.pledgeClass),
          year: norm(body.year),
          major: norm(body.major),
          // New roster adds from the app default to ACTIVE membership; an
          // officer can refine status later in the admin console.
          status: "ACTIVE",
        },
        // Never ship passwordHash back to the client (defense in depth).
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          position: true,
          pledgeClass: true,
          year: true,
          major: true,
          status: true,
        },
      });
      await auditMobileExec(db, officer, {
        action: "BROTHER_CREATED",
        subjectType: "Brother",
        subjectId: created.id,
        subjectName: created.name,
        details: `added via app by ${officer.name}${created.position ? ` · ${created.position}` : ""}`,
        req,
      });
      return NextResponse.json({ ok: true, action: "add", brother: created });
    }

    // action === "remove"
    // The clients send `memberId`; accept `brotherId` too as a legacy alias so
    // the real client payload (memberId) and any older caller both work.
    const brotherId = String(body.memberId ?? body.brotherId ?? "").trim();
    if (!brotherId) {
      return NextResponse.json({ error: "memberId is required to remove a member." }, { status: 400 });
    }
    // Guard: an officer cannot remove THEIR OWN row from the app (prevents an
    // accidental self-delete that would orphan their portal session).
    if (brotherId === officer.id) {
      return NextResponse.json(
        { error: "You can't remove your own membership from the app." },
        { status: 400 },
      );
    }
    const victim = await db.brother.findUnique({
      where: { id: brotherId },
      select: { id: true, name: true, position: true },
    });
    if (!victim) {
      return NextResponse.json({ error: "Member not found in this chapter." }, { status: 404 });
    }
    await db.brother.delete({ where: { id: brotherId } });
    await auditMobileExec(db, officer, {
      action: "BROTHER_DELETED",
      subjectType: "Brother",
      subjectId: brotherId,
      subjectName: victim.name,
      details: `removed via app by ${officer.name}${victim.position ? ` · was ${victim.position}` : ""}`,
      req,
    });
    return NextResponse.json({ ok: true, action: "remove", brotherId });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A member with that name or email already exists." }, { status: 409 });
    }
    console.error("[mobile/exec/roster] error:", err);
    return NextResponse.json({ error: "Unable to update the roster right now." }, { status: 500 });
  }
}
