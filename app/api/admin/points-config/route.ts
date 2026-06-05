import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";
import { loadPointsConfig, POINTS_CONFIG_KEY } from "@/lib/points-server";
import { normalizePointsConfig, DEFAULT_POINTS_CONFIG } from "@/lib/points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Engagement-points scoring config API.
 *
 * The weights/thresholds are stored as a single JSON blob in the EXISTING
 * SiteConfig table under `points.config` — NO new table, NO migration. The
 * score itself is computed from data the app already collects (see
 * lib/points-server.ts).
 *
 * Auth mirrors the chapter-settings pattern: officer "siteSettings" write
 * (which SUPER_ADMIN_PERMISSIONS / chapter admin satisfies) + same-origin.
 * Generic 500s on unexpected failure so internals never leak.
 */

/** GET — current (sanitized) config merged over defaults. Read-gated. */
export async function GET() {
  const denied = await guardOfficer("siteSettings", "read");
  if (denied) return denied;
  try {
    const config = await loadPointsConfig();
    return NextResponse.json({ ok: true, config, defaults: DEFAULT_POINTS_CONFIG });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// Coerce numbers (the client sends form values, sometimes as strings) and bound
// every field so a malformed/hostile payload can't store nonsense. The engine's
// normalizePointsConfig sanitizes again on read — defense in depth.
const num = (max: number) => z.coerce.number().finite().min(0).max(max);
const PatchSchema = z.object({
  duesWeight: num(1000).optional(),
  meetingsWeight: num(1000).optional(),
  serviceWeight: num(1000).optional(),
  studyWeight: num(1000).optional(),
  choresWeight: num(1000).optional(),
  serviceHoursTarget: z.coerce.number().finite().min(1).max(10000).optional(),
  studyHoursTarget: z.coerce.number().finite().min(1).max(10000).optional(),
  goodThreshold: z.coerce.number().finite().min(0).max(100).optional(),
  watchThreshold: z.coerce.number().finite().min(0).max(100).optional(),
});

/** PATCH — save tuned weights/thresholds. Write-gated + same-origin + audited. */
export async function PATCH(req: Request) {
  const denied = await guardOfficer("siteSettings", "write");
  if (denied) return denied;
  // CSRF belt-and-suspenders — reject explicit cross-origin state changes.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  try {
    // Merge the partial update over the CURRENT stored config (then normalize),
    // so a save that only changes one slider doesn't wipe the others.
    const current = await loadPointsConfig();
    const next = normalizePointsConfig({ ...current, ...parsed.data });
    const value = JSON.stringify(next);

    await prisma.siteConfig.upsert({
      where: { key: POINTS_CONFIG_KEY },
      update: { value },
      create: { key: POINTS_CONFIG_KEY, value },
    });

    // Best-effort audit + timeline message — never blocks the save.
    try {
      const actor = await getCurrentBrother();
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
      const ua = req.headers.get("user-agent") || null;
      await auditAndNotify("points.config.update", {
        actor: {
          brotherId: actor?.id ?? null,
          name: actor?.name ?? "Admin",
          role: "president",
          ipAddress: ip,
          userAgent: ua,
        },
        entity: { type: "Settings", id: null, name: "Engagement scoring rules" },
        payload: { before: current, after: next },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({ ok: true, config: next });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
