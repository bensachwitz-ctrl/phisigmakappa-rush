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

/**
 * POST /api/platform/tenants — programmatically provision a new chapter.
 * Gated hard on the platform-operator cookie.
 */
export async function POST(req: Request) {
  if (!isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subdomain, name, school, adminName, adminEmail, adminPassword, greekLetters, orgType } = body;

    if (!subdomain || !name || !school || !adminName || !adminEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields (subdomain, name, school, adminName, adminEmail)" },
        { status: 400 },
      );
    }

    const { provisionTenant } = await import("@/lib/provision");
    const result = await provisionTenant({
      subdomain,
      name,
      school,
      adminName,
      adminEmail,
      adminPassword,
      greekLetters,
      orgType,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to provision tenant" },
      { status: 500 },
    );
  }
}

