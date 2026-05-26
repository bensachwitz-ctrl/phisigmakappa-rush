import { NextResponse } from "next/server";
import { clearPortalCookie } from "@/lib/portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  clearPortalCookie();
  return NextResponse.json({ ok: true });
}
