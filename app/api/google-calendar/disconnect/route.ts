import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Disconnect — deletes the brother's GoogleCalendarLink row. */
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  const deleted = await prisma.googleCalendarLink
    .delete({ where: { brotherId: session.brother.id } })
    .catch(() => null);

  if (deleted) {
    try {
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
      const ua = req.headers.get("user-agent") || null;
      await auditAndNotify("calendar.link.delete", {
        actor: {
          brotherId: session.brother.id,
          name: session.brother.name,
          role: "member",
          ipAddress: ip,
          userAgent: ua,
        },
        entity: {
          type: "GoogleCalendarLink",
          id: session.brother.id,
          name: session.brother.name,
        },
        payload: {},
      });
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ok: true });
}
