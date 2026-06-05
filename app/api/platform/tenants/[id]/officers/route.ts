import { NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveTenantForOwner,
  loadChapterOfficerView,
  switchOfficerHolder,
} from "@/lib/owner-console";
import { errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/platform/tenants/[id]/officers";

/**
 * GET /api/platform/tenants/[id]/officers — the per-chapter officer picture for
 * the OWNER console: every active position with its current holder, the seatable
 * roster, the current term, and a read-only account glance.
 *
 * Operator-gated (resolveTenantForOwner re-checks the gs_superadmin cookie). The
 * chapter's data is read from ITS OWN schema via getTenantClient — never the
 * request Host (the owner is on the apex/platform Host).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const gate = await resolveTenantForOwner(params?.id);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }
  try {
    const view = await loadChapterOfficerView(gate.value.db, gate.value.tenant);
    return NextResponse.json({
      ok: true,
      tenant: {
        id: gate.value.tenant.id,
        subdomain: gate.value.tenant.subdomain,
        name: gate.value.tenant.name,
      },
      ...view,
    });
  } catch (err) {
    errorSink(err, { route: ROUTE, op: "GET", tenantId: params?.id, outcome: "load_failed" });
    return NextResponse.json(
      { ok: false, error: "Failed to load chapter officers" },
      { status: 500 },
    );
  }
}

const SwitchSchema = z.object({
  positionId: z.string().min(1),
  // Empty string / null = vacate the seat (end the holder, seat no one).
  brotherId: z.string().nullable().optional(),
  // Optional term override; defaults server-side to the current term.
  termCode: z.string().min(2).max(20).optional(),
});

/**
 * POST /api/platform/tenants/[id]/officers — switch ONE position's holder.
 * Body: { positionId, brotherId?, termCode? }.
 *
 * Re-verifies the operator (twice: resolveTenantForOwner AND switchOfficerHolder),
 * then ends the prior active holder and seats the chosen brother for the term,
 * reusing the exact elections seat-winners lifecycle — all inside one transaction
 * on the chapter's schema, audited into the chapter's own AuditLog.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await resolveTenantForOwner(params?.id);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = SwitchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "positionId is required" },
      { status: 400 },
    );
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  try {
    const result = await switchOfficerHolder(gate.value, {
      positionId: parsed.data.positionId,
      brotherId: parsed.data.brotherId ?? null,
      termCode: parsed.data.termCode,
      ipAddress,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    // Return the fresh view so the client can re-render holders without a 2nd round-trip.
    const view = await loadChapterOfficerView(gate.value.db, gate.value.tenant);
    return NextResponse.json({ ok: true, switched: result.value, ...view });
  } catch (err) {
    errorSink(err, { route: ROUTE, op: "POST", tenantId: params?.id, outcome: "switch_failed" });
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
