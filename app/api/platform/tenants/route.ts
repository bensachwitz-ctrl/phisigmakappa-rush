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

    // adminPassword is now REQUIRED. provisionTenant() no longer falls back to a
    // hardcoded default (the old "Welcome123!" was a known-credential account-
    // takeover vector), so a caller that omits it must get an actionable 400 here
    // rather than a 500 from the thrown validation error deeper in.
    if (!subdomain || !name || !school || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required fields (subdomain, name, school, adminName, adminEmail, adminPassword)",
        },
        { status: 400 },
      );
    }

    const { provisionTenant } = await import("@/lib/provision");
    try {
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
    } catch (provErr: any) {
      // provisionTenant throws a descriptive Error for client-correctable input
      // (weak/short password, malformed email, invalid/reserved/taken subdomain).
      // Surface those as a 400 so the operator can fix the request; anything else
      // is an unexpected server fault (re-thrown to the outer 500 handler).
      const msg = String(provErr?.message || "");
      const isClientInput =
        /password|email|subdomain|already registered|already|reserved|invalid/i.test(msg);
      if (isClientInput) {
        return NextResponse.json({ ok: false, error: msg }, { status: 400 });
      }
      throw provErr;
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to provision tenant" },
      { status: 500 },
    );
  }
}

