import { NextResponse } from "next/server";
import { authorizeMobileExec, auditMobileExec } from "@/lib/mobile-exec-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

// The audience values the Announcement model + the member feed understand. The
// mobile data feed reads BROTHERS/ALL for brothers and ALUMNI/ALL for alumni, so
// an officer posting from the app picks from this exact set. Unknown/missing →
// ALL (visible to everyone), matching the admin route's default.
const VALID_AUDIENCES = new Set(["ALL", "BROTHERS", "RUSHES", "EBOARD", "ALUMNI"]);

/**
 * POST /api/mobile/exec/announce — an officer posts a chapter announcement.
 *
 * Body: { subdomain, title (required), body (required), audience?, pinned? }
 *
 * OFFICER-GATED server-side (authorizeMobileExec recomputes capabilities.exec).
 * PERSISTS: writes an Announcement row with status="sent" + sentAt=now so it
 * shows immediately in the member feed (/api/mobile/data reads status="sent").
 * The acting officer's Brother row is the author so the feed shows a real name.
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

  const gate = await authorizeMobileExec(req, body.subdomain);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { db, brother: officer } = gate;

  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  if (title.length < 2 || text.length < 2) {
    return NextResponse.json({ error: "A title and body are required." }, { status: 400 });
  }
  if (title.length > 160 || text.length > 8000) {
    return NextResponse.json({ error: "Title or body is too long." }, { status: 400 });
  }

  const audienceRaw = String(body.audience || "ALL").trim().toUpperCase();
  const audience = VALID_AUDIENCES.has(audienceRaw) ? audienceRaw : "ALL";
  const pinned = body.pinned === true;

  try {
    const now = new Date();
    const created = await db.announcement.create({
      data: {
        title,
        body: text,
        audience,
        pinned,
        // The author is the acting officer's Brother row (gives the feed a real
        // name + position). authorId references Brother.id.
        authorId: officer.id,
        // Published immediately — the member feed only serves status="sent".
        status: "sent",
        sentAt: now,
        channels: "inapp",
      },
      include: { author: { select: { name: true, position: true } } },
    });

    await auditMobileExec(db, officer, {
      action: "ANNOUNCEMENT_CREATED",
      subjectType: "Announcement",
      subjectId: created.id,
      subjectName: created.title,
      details: `posted via app by ${officer.name} · audience: ${audience}${pinned ? " · pinned" : ""}`,
      req,
    });

    return NextResponse.json({
      ok: true,
      announcement: {
        id: created.id,
        title: created.title,
        body: created.body,
        audience: created.audience,
        pinned: created.pinned,
        createdAt: created.createdAt.toISOString(),
        authorName: created.author?.name || officer.name,
        authorRole: created.author?.position || "Officer",
      },
    });
  } catch (err: any) {
    console.error("[mobile/exec/announce] error:", err);
    return NextResponse.json({ error: "Unable to post the announcement right now." }, { status: 500 });
  }
}
