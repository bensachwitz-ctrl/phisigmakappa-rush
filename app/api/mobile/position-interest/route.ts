import { NextResponse } from "next/server";
import { centralDb, getTenantClient } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { officerToolset } from "@/lib/officer-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS preflight — the POST carries Authorization, so the WebView preflights.
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/**
 * POST /api/mobile/position-interest — item 3.
 *
 * A NON-exec brother expresses interest in running for / holding an officer
 * position next election. This is the member-side counterpart to the officer
 * tool pages: rather than leaking exec tools onto a member, they submit interest
 * here. We record a durable PositionInterest row (the "new store") and the
 * CURRENT holder of that position is notified by seeing these open interests in
 * their own officer tools (surfaced via /api/mobile/data's exec payload) — a
 * self-contained, durable signal so the holder can mentor them.
 *
 * Body: { subdomain, positionSlug?, positionTitle, message? }
 * Auth: the caller's OWN tenant-bound Bearer token. brother role only (an alumni
 * or PNM can't run for a chapter office). SECURITY: the interested brother is
 * ALWAYS the verified session's own brother — there is no id input.
 */
export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
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

  const positionTitle = String(body?.positionTitle || "").trim().slice(0, 120);
  if (!positionTitle) {
    return NextResponse.json({ error: "Which position?" }, { status: 400 });
  }
  const positionSlug = body?.positionSlug ? slugify(String(body.positionSlug)) : slugify(positionTitle);
  const message = body?.message ? String(body.message).trim().slice(0, 1000) : null;

  const tenant = await centralDb.tenant.findUnique({ where: { subdomain } });
  if (!tenant) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  if (!tenant.isActive) return NextResponse.json({ error: "This chapter is inactive." }, { status: 403 });

  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  if (!token) return NextResponse.json({ error: "Authentication token is required." }, { status: 401 });
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess) return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  // Only an active brother can run for a chapter office.
  if (sess.role !== "brother") {
    return NextResponse.json({ error: "Only active brothers can run for a position." }, { status: 403 });
  }

  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({ where: { id: sess.userId } });
  if (!portalUser?.brotherId) {
    return NextResponse.json({ error: "Member record not found." }, { status: 404 });
  }
  const me = await db.brother.findUnique({
    where: { id: portalUser.brotherId },
    select: { id: true, name: true },
  });
  if (!me) return NextResponse.json({ error: "Member record not found." }, { status: 404 });

  try {
    // Idempotent-ish: one OPEN interest per brother+position. If they resubmit,
    // update the message rather than pile up duplicate rows.
    const existing = await db.positionInterest.findFirst({
      where: { brotherId: me.id, positionSlug, status: "OPEN" },
      select: { id: true },
    });
    if (existing) {
      await db.positionInterest.update({
        where: { id: existing.id },
        data: { message, positionTitle },
      });
    } else {
      await db.positionInterest.create({
        data: {
          brotherId: me.id,
          brotherName: me.name,
          positionSlug,
          positionTitle,
          message,
          status: "OPEN",
        },
      });
    }

    // Who currently holds this position? (best-effort, for the confirmation copy)
    // Any active brother whose real position resolves to the same role — so the
    // member sees "we let <holder> know". Never leaks contact details.
    let notifiedName: string | null = null;
    try {
      const targetRole = officerToolset(positionTitle).roleKey;
      const holders = await db.brother.findMany({
        where: { status: "ACTIVE", position: { not: null } },
        select: { name: true, position: true },
        take: 200,
      });
      const holder = holders.find(
        (h) => h.position && officerToolset(h.position).roleKey === targetRole && targetRole !== "member",
      );
      notifiedName = holder?.name ?? null;
    } catch {
      notifiedName = null;
    }

    return NextResponse.json({ ok: true, positionTitle, notifiedName });
  } catch (err: any) {
    console.error("[position-interest POST]", err?.message || err);
    return NextResponse.json({ error: "Could not record your interest right now." }, { status: 500 });
  }
}
