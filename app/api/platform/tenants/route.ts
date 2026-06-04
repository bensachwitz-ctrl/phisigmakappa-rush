import { NextResponse } from "next/server";
import { centralDb } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/platform/tenants — list every chapter in the central registry.
 * Gated hard on the platform-operator cookie; a chapter admin's `phisig_admin`
 * cookie cannot pass this check (different cookie + secret).
 */
export async function GET() {
  if (!isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await centralDb.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subdomain: true,
        name: true,
        school: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, tenants });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load chapters" },
      { status: 500 },
    );
  }
}
