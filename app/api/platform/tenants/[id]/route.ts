import { NextResponse } from "next/server";
import { centralDb } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/platform/tenants/[id]";

/**
 * Build the Postgres schema name for a tenant from its subdomain, sanitized
 * EXACTLY as provisioning does in app/api/onboard/route.ts
 * (`schema_${subdomain.replace(/[^a-zA-Z0-9]/g, "_")}`). The subdomain in the
 * registry was already format-validated at signup, and this collapses anything
 * non-alphanumeric to "_", so the result is safe to interpolate into the raw
 * DROP SCHEMA statement (no injection surface). Matching provisioning's exact
 * transform guarantees we drop the SAME schema that was created.
 */
function schemaNameFor(subdomain: string): string {
  return `schema_${subdomain.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * PATCH /api/platform/tenants/[id] — toggle a chapter's isActive flag.
 * Body: { isActive: boolean }. Operator-gated.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = params?.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing tenant id" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "`isActive` (boolean) is required" },
      { status: 400 },
    );
  }

  try {
    const updated = await centralDb.tenant.update({
      where: { id },
      data: { isActive: body.isActive },
      select: {
        id: true,
        subdomain: true,
        name: true,
        school: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, tenant: updated });
  } catch (err: any) {
    // Prisma P2025 = record not found.
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Chapter not found" }, { status: 404 });
    }
    // Log the real error server-side; return a generic message to the client.
    errorSink(err, { route: ROUTE, op: "PATCH", tenantId: id, outcome: "update_failed" });
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/platform/tenants/[id] — permanently drop a chapter: its entire
 * Postgres schema (all tenant data) AND its central-registry row. Operator-gated
 * and irreversible. We drop the schema FIRST, then delete the registry row, so a
 * mid-failure leaves the row present (chapter still listed/recoverable) rather
 * than orphaning a live schema with no registry entry.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = params?.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing tenant id" }, { status: 400 });
  }

  try {
    // Resolve the subdomain from the registry so we know which schema to drop.
    const tenant = await centralDb.tenant.findUnique({
      where: { id },
      select: { subdomain: true },
    });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Chapter not found" }, { status: 404 });
    }

    const schemaName = schemaNameFor(tenant.subdomain);
    // Drop the tenant's schema and everything in it. CASCADE removes all ~42
    // tables. IF EXISTS keeps this idempotent if the schema was already gone.
    await centralDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);

    // Now remove the registry row so the subdomain frees up for reuse.
    await centralDb.tenant.delete({ where: { id } });

    return NextResponse.json({ ok: true, subdomain: tenant.subdomain });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Chapter not found" }, { status: 404 });
    }
    // Log the real error server-side; return a generic message to the client.
    errorSink(err, { route: ROUTE, op: "DELETE", tenantId: id, outcome: "delete_failed" });
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
