import { prisma } from "@/lib/prisma";
import { getCurrentBrother, isAdminAuthed } from "@/lib/auth";

/**
 * Audit-log helper. Best-effort: never throws back to the caller — a failed
 * insert here should not break the original write. Wrapped in try/catch so
 * the caller can `await audit(...)` without `.catch()` boilerplate at every
 * site.
 *
 * Usage from an API route:
 *
 *   await audit({
 *     action: "RUSH_STATUS",
 *     subjectType: "Rush",
 *     subjectId: rushId,
 *     subjectName: rush.name,
 *     details: `${oldStatus} → ${newStatus}`,
 *     req,
 *   });
 *
 * The `req` arg is the incoming Request — used to extract IP and to fall
 * back to "admin (shared)" when the actor is the chapter-shared admin
 * credential (no per-brother session).
 */
export async function audit(opts: {
  action: string;
  subjectType: string;
  subjectId?: string | null;
  subjectName?: string | null;
  details?: string | null;
  req?: Request;
}): Promise<void> {
  try {
    const me = await getCurrentBrother().catch(() => null);
    const adminLoggedIn = isAdminAuthed();
    const actorName = me?.name || (adminLoggedIn ? "admin (shared)" : "system");
    const actorId = me?.id || null;
    const ipAddress = opts.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || opts.req?.headers.get("x-real-ip")
      || null;

    await prisma.auditLog.create({
      data: {
        actorId,
        actorName,
        action: opts.action,
        subjectType: opts.subjectType,
        subjectId: opts.subjectId || null,
        subjectName: opts.subjectName || null,
        details: opts.details || null,
        ipAddress,
      },
    });
  } catch {
    // Intentional swallow — audit logging is best-effort and must never
    // break the user-visible operation. If the audit table is gone or
    // Postgres is degraded, the action that triggered the log still
    // succeeds; the e-board just loses one row of forensics.
  }
}

/**
 * Recent audit entries — used by /admin/audit and /admin/page.tsx insight
 * panel ("Recent activity"). Capped at `limit` rows to keep the query
 * cheap even after a year of accumulation.
 */
export async function getRecentAudit(limit = 50) {
  try {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      actorName: r.actorName,
      action: r.action,
      subjectType: r.subjectType,
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
