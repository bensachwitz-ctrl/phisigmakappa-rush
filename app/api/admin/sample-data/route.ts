import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin } from "@/lib/auth";
import { guardBillingWrite } from "@/lib/billing-guard";
import { errorSink } from "@/lib/logger";
import { seedSampleData, clearSampleData } from "@/lib/sample-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/sample-data  — body: { action: "seed" | "clear" }
//
// One-click demo-content engine for a brand-new chapter:
//   • action="seed"  → populate the tenant with believable sample PNMs,
//                       events, members/officers, dues ledger, announcements,
//                       and a poll (idempotent — never double-seeds).
//   • action="clear" → remove EXACTLY the sample rows (marker-matched) and
//                       nothing real.
//
// AUTH: same gate as every other admin mutation —
//   not signed in            → 401
//   signed in but not admin  → 403
//   cross-origin POST        → 403 (CSRF belt-and-suspenders)
// TENANT: uses the Host-resolved `prisma` proxy, identical to sibling admin
// routes, so the seed/clear runs against the CURRENT chapter's schema only.
//
// Contract consumed by the dashboard "Load / Clear sample data" button:
//   → { ok: true, action, counts }   on success
//   → { ok: false, error }           on auth/validation failure
//   → { ok: false, error: "..." }    (generic) + errorSink log on 500

const Schema = z.object({
  action: z.enum(["seed", "clear"]),
});

export async function POST(req: Request) {
  // ── Auth + CSRF (mirrors other admin routes) ─────────────────────────────
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  }
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;

  // ── Validate body ────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input — expected { action: "seed" | "clear" }' },
      { status: 400 }
    );
  }
  const { action } = parsed.data;

  // ── Run against the tenant prisma ────────────────────────────────────────
  try {
    const { counts } =
      action === "seed"
        ? await seedSampleData(prisma)
        : await clearSampleData(prisma);
    return NextResponse.json({ ok: true, action, counts });
  } catch (err) {
    // Single error chokepoint → Vercel Runtime Logs (secrets auto-redacted).
    // Never leak internals to the client.
    errorSink(err, { route: "/api/admin/sample-data", action });
    return NextResponse.json(
      { ok: false, error: "Could not update sample data. Please try again." },
      { status: 500 }
    );
  }
}
