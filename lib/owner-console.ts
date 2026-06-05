// Owner-console server helpers — the cross-chapter control plane the PLATFORM
// OWNER (super-admin) uses to manage every chapter's officers from one place.
//
// WHY THIS FILE EXISTS — the central-vs-tenant schema problem:
//   The owner is never on a chapter's Host. They sit on the apex / `/platform`,
//   so the request-Host Prisma proxy (`lib/prisma.ts` → `prisma`) resolves to
//   the PUBLIC schema (centralDb), NOT the chapter's schema. Reading or writing
//   a chapter's OfficerPosition/OfficerAssignment/Brother through that proxy
//   would silently hit the wrong schema. So every function here goes through
//   `getTenantClient(subdomain)` — the established per-schema client
//   (`?schema=schema_<sub>` URL, exactly what the migration scripts and
//   `forEachTenant` use) — to reach the CHOSEN chapter's own tables.
//
//   The same applies to the audit trail: `auditAndNotify`/`appendAudit` in
//   lib/notify.ts write via the Host proxy, which from the apex would log into
//   the PUBLIC schema. We instead write the audit row DIRECTLY via the tenant
//   client (`tdb.auditLog.create`) so the switch is recorded in the CHAPTER's
//   own AuditLog — visible on that chapter's /admin/audit timeline.
//
// SECURITY — every export re-checks `isSuperAdmin()` (the existing gs_superadmin
// gate from lib/superadmin.ts). A chapter admin's `phisig_admin` cookie can
// NEVER satisfy it (separate cookie + separate secret), so a chapter e-board can
// never reach another chapter's roster through here. This mirrors the gate every
// /api/platform route already uses — it is ADDITIVE, changing none of it.

import type { PrismaClient } from "@prisma/client";
import { centralDb, getTenantClient } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";

/** A chapter row from the central registry, plus its resolved schema client. */
export interface ResolvedTenant {
  tenant: {
    id: string;
    subdomain: string;
    name: string | null;
    school: string | null;
    isActive: boolean;
    createdAt: Date;
    plan: string | null;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
  };
  /** PrismaClient bound to THIS chapter's schema (never the public schema). */
  db: PrismaClient;
}

/** Discriminated result so callers can map a precise HTTP status. */
export type OwnerGate<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

/**
 * The single owner-console gate. Re-verifies the platform-operator cookie, then
 * resolves the chosen chapter from the central registry and returns a client
 * bound to ITS schema. Use at the top of every owner-console read/write.
 *
 *   401 — not the platform operator (or cookie expired)
 *   400 — missing tenant id
 *   404 — no such chapter in the registry
 */
export async function resolveTenantForOwner(
  tenantId: string | undefined | null,
): Promise<OwnerGate<ResolvedTenant>> {
  // 1. Re-check super-admin EVERY time — defense in depth on top of the
  //    /platform layout redirect. Never trust the caller got here legitimately.
  if (!isSuperAdmin()) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const id = (tenantId || "").trim();
  if (!id) {
    return { ok: false, status: 400, error: "Missing chapter id" };
  }

  // 2. Resolve the chapter from the PUBLIC registry (centralDb is correct here —
  //    public."Tenant" is the cross-chapter directory).
  let tenant: ResolvedTenant["tenant"] | null;
  try {
    tenant = await centralDb.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        subdomain: true,
        name: true,
        school: true,
        isActive: true,
        createdAt: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });
  } catch {
    return { ok: false, status: 500, error: "Failed to load chapter" };
  }
  if (!tenant) {
    return { ok: false, status: 404, error: "Chapter not found" };
  }

  // 3. Bind a client to the chapter's OWN schema (NOT the request Host).
  const db = getTenantClient(tenant.subdomain);
  return { ok: true, value: { tenant, db } };
}

// ── Term-code helper ─────────────────────────────────────────────────────────
// Officer terms are coded "<year>-FA" / "<year>-SP" (see OfficerAssignment.termCode
// in prisma/schema.prisma and the elections seat logic). When the owner switches a
// holder we seat them into the CURRENT term so the new e-board takes effect now.

/**
 * The current term code in the chapter's "YYYY-FA"/"YYYY-SP" convention.
 * Jan–Jun ⇒ Spring (SP); Jul–Dec ⇒ Fall (FA). Mirrors how elections derive a
 * term so an owner switch lands in the same bucket the chapter's own flows use.
 */
export function currentTermCode(now: Date = new Date()): string {
  const year = now.getFullYear();
  const season = now.getMonth() <= 5 ? "SP" : "FA"; // 0–5 = Jan–Jun
  return `${year}-${season}`;
}

// ── Roster shape ─────────────────────────────────────────────────────────────

/** Membership statuses eligible to hold an officer seat (excludes alumni/expelled). */
const SEATABLE_STATUSES = ["PROSPECT", "PLEDGE", "INITIATE", "ACTIVE", "INACTIVE"];

export interface RosterBrother {
  id: string;
  name: string;
  email: string | null;
  status: string;
}

export interface PositionWithHolder {
  positionId: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  /** The active assignment (endDate null/future) for this position, or null. */
  holder: {
    assignmentId: string;
    brotherId: string;
    brotherName: string;
    termCode: string;
    startDate: Date;
  } | null;
}

export interface ChapterOfficerView {
  positions: PositionWithHolder[];
  roster: RosterBrother[];
  currentTerm: string;
  account: {
    name: string | null;
    school: string | null;
    subdomain: string;
    isActive: boolean;
    plan: string | null;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
    memberCount: number;
    activeMemberCount: number;
    adminCount: number;
    primaryAdminName: string | null;
    primaryAdminEmail: string | null;
  };
}

/**
 * Read the full per-chapter officer picture from the chapter's OWN schema:
 * every active OfficerPosition with its current holder (the active
 * OfficerAssignment, i.e. endDate null or in the future — the SAME "active"
 * predicate the elections seat logic uses), the seatable roster, the current
 * term, and a read-only account glance (member counts + primary admin).
 *
 * Resilient: the roster/account reads are best-effort; a failure in either still
 * returns the positions so the switch UI stays usable.
 */
export async function loadChapterOfficerView(
  db: PrismaClient,
  tenant: ResolvedTenant["tenant"],
): Promise<ChapterOfficerView> {
  const now = new Date();

  const positionsRaw = await db.officerPosition.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, slug: true, description: true, sortOrder: true },
  });

  // Active assignments only (endDate null OR still in the future) — one query,
  // then reduce to the most-recent active holder per position.
  const activeAssignments = await db.officerAssignment.findMany({
    where: { OR: [{ endDate: null }, { endDate: { gt: now } }] },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      positionId: true,
      termCode: true,
      startDate: true,
      brother: { select: { id: true, name: true } },
    },
  });
  const holderByPosition = new Map<string, (typeof activeAssignments)[number]>();
  for (const a of activeAssignments) {
    // findMany is sorted startDate desc, so the FIRST one we see per position is
    // the latest active holder — keep it, ignore older overlapping rows.
    if (!holderByPosition.has(a.positionId)) holderByPosition.set(a.positionId, a);
  }

  const positions: PositionWithHolder[] = positionsRaw.map((p) => {
    const a = holderByPosition.get(p.id);
    return {
      positionId: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      sortOrder: p.sortOrder,
      holder: a
        ? {
            assignmentId: a.id,
            brotherId: a.brother.id,
            brotherName: a.brother.name,
            termCode: a.termCode,
            startDate: a.startDate,
          }
        : null,
    };
  });

  // Roster — seatable members only, alphabetical.
  let roster: RosterBrother[] = [];
  try {
    const rows = await db.brother.findMany({
      where: { status: { in: SEATABLE_STATUSES } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, status: true },
    });
    roster = rows.map((r) => ({ id: r.id, name: r.name, email: r.email, status: r.status }));
  } catch {
    roster = [];
  }

  // Account glance — counts + the primary chapter admin (read-only).
  let memberCount = 0;
  let activeMemberCount = 0;
  let adminCount = 0;
  let primaryAdminName: string | null = null;
  let primaryAdminEmail: string | null = null;
  try {
    [memberCount, activeMemberCount, adminCount] = await Promise.all([
      db.brother.count(),
      db.brother.count({ where: { status: "ACTIVE" } }),
      db.brother.count({ where: { role: "ADMIN" } }),
    ]);
    const admin = await db.brother.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { name: true, email: true },
    });
    primaryAdminName = admin?.name ?? null;
    primaryAdminEmail = admin?.email ?? null;
  } catch {
    // leave zeros — never block the officer UI on a count failure
  }

  return {
    positions,
    roster,
    currentTerm: currentTermCode(now),
    account: {
      name: tenant.name,
      school: tenant.school,
      subdomain: tenant.subdomain,
      isActive: tenant.isActive,
      plan: tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
      trialEndsAt: tenant.trialEndsAt,
      memberCount,
      activeMemberCount,
      adminCount,
      primaryAdminName,
      primaryAdminEmail,
    },
  };
}

export interface SwitchHolderInput {
  positionId: string;
  /** Brother to seat. Pass null/"" to VACATE the seat (just end the holder). */
  brotherId: string | null;
  /** Term to seat under — defaults to the current term. */
  termCode?: string;
  /** Owner IP for the audit row (truncated to /24 before persisting). */
  ipAddress?: string | null;
}

export interface SwitchHolderResult {
  positionTitle: string;
  termCode: string;
  endedAssignmentIds: string[];
  /** New assignment id, or null when the seat was vacated. */
  newAssignmentId: string | null;
  previousHolderName: string | null;
  newHolderName: string | null;
}

/**
 * Switch the holder of one position — the core "new e-board took over" action.
 *
 * EXACTLY mirrors the elections seat-winners lifecycle
 * (app/api/admin/elections/[id]/seat-winners/route.ts) so the role model stays
 * single-sourced:
 *   1. END every active assignment for (positionId, termCode) — endDate = now.
 *   2. CREATE a new OfficerAssignment (positionId, brotherId, termCode, startDate
 *      = now) when a brother was chosen. (No brother ⇒ seat is vacated.)
 * Both steps run in ONE transaction on the CHAPTER's schema, so a partial switch
 * can never leave two active holders.
 *
 * Then writes ONE audit row directly into the CHAPTER's AuditLog (action
 * "officer.assign", subject OfficerAssignment) — recorded in the chapter's own
 * schema, NOT the public one. Audit is best-effort; the switch has already
 * committed by then.
 *
 * Validation: the position must exist + be active in this chapter, and (when
 * seating) the brother must belong to this chapter's roster — both checked
 * against the tenant client, so the owner can't seat a stranger or a stale id.
 */
export async function switchOfficerHolder(
  resolved: ResolvedTenant,
  input: SwitchHolderInput,
): Promise<OwnerGate<SwitchHolderResult>> {
  // Re-check the operator one more time at the write boundary.
  if (!isSuperAdmin()) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { db, tenant } = resolved;
  const positionId = (input.positionId || "").trim();
  if (!positionId) {
    return { ok: false, status: 400, error: "Missing position" };
  }
  const brotherId = (input.brotherId || "").trim() || null;
  const termCode = (input.termCode || "").trim() || currentTermCode();
  const now = new Date();

  // Validate the position belongs to (and is active in) this chapter.
  const position = await db.officerPosition.findFirst({
    where: { id: positionId, active: true },
    select: { id: true, title: true },
  });
  if (!position) {
    return { ok: false, status: 404, error: "Position not found in this chapter" };
  }

  // Validate the brother belongs to this chapter (when seating, not vacating).
  let newHolderName: string | null = null;
  if (brotherId) {
    const brother = await db.brother.findUnique({
      where: { id: brotherId },
      select: { id: true, name: true },
    });
    if (!brother) {
      return { ok: false, status: 404, error: "Member not found in this chapter" };
    }
    newHolderName = brother.name;
  }

  // Capture the prior holder name(s) for the audit "before".
  const priorActive = await db.officerAssignment.findMany({
    where: {
      positionId,
      termCode,
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    select: { id: true, brother: { select: { name: true } } },
  });
  const previousHolderName = priorActive[0]?.brother?.name ?? null;

  // No-op guard: seating the SAME brother who already actively holds the seat in
  // this term would just end-and-recreate pointlessly. Reject so the owner gets
  // a clear "already holds" instead of a churned audit row.
  if (brotherId && priorActive.length === 1) {
    const sole = await db.officerAssignment.findUnique({
      where: { id: priorActive[0].id },
      select: { brotherId: true },
    });
    if (sole?.brotherId === brotherId) {
      return {
        ok: false,
        status: 409,
        error: `${newHolderName ?? "That member"} already holds ${position.title} for ${termCode}.`,
      };
    }
  }

  let newAssignmentId: string | null = null;
  const endedAssignmentIds: string[] = priorActive.map((a) => a.id);

  try {
    await db.$transaction(async (tx) => {
      // 1. End the prior active holder(s) for this position + term.
      await tx.officerAssignment.updateMany({
        where: {
          positionId,
          termCode,
          OR: [{ endDate: null }, { endDate: { gt: now } }],
        },
        data: { endDate: now },
      });

      // 2. Seat the new holder (unless vacating).
      if (brotherId) {
        const created = await tx.officerAssignment.create({
          data: {
            positionId,
            brotherId,
            termCode,
            startDate: now,
            notes: "Seated by platform owner (owner console)",
          },
          select: { id: true },
        });
        newAssignmentId = created.id;
      }
    });
  } catch {
    return { ok: false, status: 500, error: "Could not update the officer seat" };
  }

  // Audit directly into THIS chapter's schema (not the public one). Best-effort.
  await writeTenantAudit(db, {
    action: brotherId ? "officer.assign" : "officer.unassign",
    actorName: "Platform Owner",
    ipAddress: input.ipAddress ?? null,
    entity: {
      type: "OfficerAssignment",
      id: newAssignmentId ?? endedAssignmentIds[0] ?? null,
      name: brotherId
        ? `${newHolderName} — ${position.title} (${termCode})`
        : `${position.title} vacated (${termCode})`,
    },
    details: brotherId
      ? `owner switched ${position.title}: ${previousHolderName ?? "(vacant)"} → ${newHolderName} for ${termCode}`
      : `owner vacated ${position.title} (was ${previousHolderName ?? "(vacant)"}) for ${termCode}`,
  });

  return {
    ok: true,
    value: {
      positionTitle: position.title,
      termCode,
      endedAssignmentIds,
      newAssignmentId,
      previousHolderName,
      newHolderName,
    },
  };
}

// ── Tenant-schema audit writer ───────────────────────────────────────────────
// A trimmed copy of lib/notify.ts's appendAudit that writes to a GIVEN tenant
// client instead of the Host proxy. Same AuditLog column shape + same /24 IP
// truncation, so the chapter's existing /admin/audit view renders these rows
// identically. We deliberately do NOT emit an Announcement here — an owner-side
// role switch shouldn't spam the chapter's in-app timeline; the immutable audit
// row is the record of truth.

function truncateIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(trimmed);
  if (!m) return trimmed; // leave IPv6 / forwarded-for shapes alone
  return `${m[1]}.${m[2]}.${m[3]}.0`;
}

async function writeTenantAudit(
  db: PrismaClient,
  row: {
    action: string;
    actorName: string;
    ipAddress: string | null;
    entity: { type: string; id: string | null; name: string | null };
    details: string | null;
  },
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: null, // the owner is platform staff — no per-chapter Brother row
        actorName: row.actorName,
        action: row.action,
        subjectType: row.entity.type,
        subjectId: row.entity.id,
        subjectName: row.entity.name,
        details: row.details ? row.details.slice(0, 1024) : null,
        ipAddress: truncateIp(row.ipAddress),
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[owner-console] tenant audit write failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }
}
