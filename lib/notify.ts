// auditAndNotify — Brain-W2.6 pattern, adapted to Desktop's R41 AuditLog
// schema. One helper that every high-stakes mutation routes through. One
// call gives you:
//
//   1. One immutable row in AuditLog ("who changed what, when, from where").
//   2. One timeline message — an Announcement scoped to rolesToNotify
//      (collapsed to the existing audience enum).
//
// Why one helper instead of two: the audit + announcement writes need to
// stay in lock-step. Forgetting one breaks the activity feed; forgetting
// the other breaks compliance reviews. Wrapping both inside auditAndNotify()
// makes it impossible to drift.
//
// SCHEMA NOTE — DIFFERENT FROM BRAIN: The Brain fork has a richer AuditLog
// shape (actorBrotherId/entityType/entityId/payload Json). We're writing
// into Desktop's R41 schema (actorId/actorName/action/subjectType/subjectId/
// subjectName/details/ipAddress). The mapping below collapses the rich
// payload Json into a denormalised `details` string so the existing
// /admin/audit surface keeps rendering correctly. Forensic depth is
// preserved by stringifying the payload into details when relevant.
//
// Failure isolation: every write is wrapped in try/catch — a broken audit
// table can never bubble back through the mutation handler. The whole
// thing is best-effort; the underlying business mutation has already
// committed by the time auditAndNotify() is called.

import { prisma } from "@/lib/prisma";
import { actionMap, type ActionMapEntry } from "@/lib/actionMap";

// ── Public actor + entity shapes ─────────────────────────────────────────────

/** Who triggered the event. `brotherId` may be null for system/cron actors. */
export interface AuditActor {
  brotherId?: string | null;
  name?: string | null;
  /** "president" | "treasurer" | "risk-manager" | "super-admin" | "member" |
   *  "system" | "anonymous" — free-form so future roles fit without a schema
   *  change. */
  role?: string | null;
  /** Raw client IP. The writer truncates to /24 before persisting. */
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** What the event touched. */
export interface AuditEntity {
  /** "DuesPayment" | "Brother" | "IncidentReport" | "OfficerAssignment" | … */
  type: string;
  id?: string | null;
  /** Human-readable label for the timeline message. Falls back to `entity.id`
   *  when omitted. */
  name?: string | null;
}

/** Free-form before/after diff. Callers pass whatever rich context the
 *  forensic reviewer needs — `{ before, after, amountCents, reason }` etc. */
export type AuditPayload = Record<string, unknown> & {
  before?: unknown;
  after?: unknown;
};

export interface AuditAndNotifyInput {
  /** Verb-prefixed action key — see actionMap. */
  action: string;
  actor: AuditActor;
  entity: AuditEntity;
  payload: AuditPayload;
  /** Override the default recipient roles resolved from actionMap. */
  rolesToNotify?: string[];
  /** Optional clarifier appended to the timeline sentence. */
  details?: string;
}

// ── actionMap re-export ──────────────────────────────────────────────────────
export { actionMap };
export type { ActionMapEntry };

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Truncate an IPv4 to /24 (last octet zeroed). Best-effort: anything that
 *  doesn't parse as four dotted octets passes through unchanged so IPv6 +
 *  cloudflare-style headers aren't silently mangled. */
function truncateIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(trimmed);
  if (!m) return trimmed; // leave IPv6 / forwarded-for / unknown shapes alone
  return `${m[1]}.${m[2]}.${m[3]}.0`;
}

/** Build the one-line sentence the Announcement carries. */
function buildSentence(actor: AuditActor, verb: string, entity: AuditEntity, details?: string): string {
  const name = (actor.name || actor.brotherId || "Someone").trim();
  const target = (entity.name || entity.id || "an item").trim();
  const tail = details ? ` ${details}` : "";
  return `${name} just ${verb} ${target}${tail}`.slice(0, 480).trimEnd();
}

/** Map a role list to Desktop's Announcement.audience enum
 *  (ALL | BROTHERS | RUSHES | EBOARD). Picks the narrowest covering audience. */
function audienceForRoles(roles: string[]): "ALL" | "BROTHERS" | "RUSHES" | "EBOARD" {
  if (!roles || roles.length === 0) return "EBOARD";
  const norm = roles.map((r) => (r || "").trim().toLowerCase()).filter(Boolean);
  if (norm.includes("all")) return "ALL";
  if (norm.includes("rush") || norm.includes("rushes")) return "RUSHES";
  const eboard = [
    "super-admin",
    "super_admin",
    "superadmin",
    "president",
    "vice-president",
    "treasurer",
    "secretary",
    "risk-manager",
    "risk_manager",
    "service-chair",
    "service_chair",
    "officer",
  ];
  if (norm.some((r) => eboard.includes(r))) return "EBOARD";
  return "BROTHERS";
}

/** Stringify the payload into a compact details column so the existing R41
 *  /admin/audit view stays human-readable. Prefer { before, after } shapes;
 *  fall back to JSON.stringify on the whole payload. Trimmed to 1024 chars
 *  so a runaway payload can't bloat the DB column. */
function payloadToDetails(payload: AuditPayload): string | null {
  try {
    if (!payload || Object.keys(payload).length === 0) return null;
    if (payload.before !== undefined || payload.after !== undefined) {
      const before = payload.before !== undefined ? JSON.stringify(payload.before) : "(none)";
      const after = payload.after !== undefined ? JSON.stringify(payload.after) : "(none)";
      const extras = Object.fromEntries(
        Object.entries(payload).filter(([k]) => k !== "before" && k !== "after"),
      );
      const extrasStr = Object.keys(extras).length ? ` ${JSON.stringify(extras)}` : "";
      return `${before} → ${after}${extrasStr}`.slice(0, 1024);
    }
    return JSON.stringify(payload).slice(0, 1024);
  } catch {
    return null;
  }
}

// ── Public surface ───────────────────────────────────────────────────────────

/**
 * Append a row to AuditLog using Desktop's R41 column shape. Defense-in-depth:
 * write failures are logged and swallowed so a broken audit table can never
 * block the caller's already-committed mutation.
 */
export async function appendAudit(
  actorCtx: AuditActor,
  data: {
    action: string;
    entity: AuditEntity;
    payload: AuditPayload;
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorCtx.brotherId || null,
        actorName: actorCtx.name || (actorCtx.role || "system"),
        action: data.action,
        subjectType: data.entity.type,
        subjectId: data.entity.id || null,
        subjectName: data.entity.name || null,
        details: payloadToDetails(data.payload),
        ipAddress: truncateIp(actorCtx.ipAddress),
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[auditAndNotify] appendAudit failed (non-fatal):",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Write the timeline message — a system Announcement scoped to recipient
 * roles. The existing Announcement model only has an audience enum, so we
 * collapse rolesToNotify to the narrowest covering audience.
 *
 * `authorId` stays null — system events never claim a brother as author.
 */
export async function notifyTimeline(
  _actorCtx: AuditActor,
  rolesToNotify: string[],
  sentence: string
): Promise<void> {
  try {
    await prisma.announcement.create({
      data: {
        title: `[system] ${sentence.slice(0, 80)}`,
        body: sentence,
        audience: audienceForRoles(rolesToNotify),
        pinned: false,
        authorId: null,
        // Mark system events as already-sent so they don't enter the
        // scheduled-cron queue. The W4 status/sentAt columns default
        // appropriately at the DB level, but we're explicit here.
        status: "sent",
        sentAt: new Date(),
        channels: "inapp",
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[auditAndNotify] notifyTimeline failed (non-fatal):",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Compose the audit row + timeline message for one mutation.
 *
 * Usage from a route handler:
 *
 *   await auditAndNotify("meeting.checkin", {
 *     actor,            // { brotherId, name, role, ipAddress, userAgent }
 *     entity: { type: "ChapterMeeting", id: meeting.id, name: meeting.title },
 *     payload: { before, after, memberName },
 *   });
 *
 * For actions not in actionMap we still write the audit row (forensic trail
 * must not depend on UI labels), but skip the timeline message since there's
 * no friendly verb to render.
 */
export async function auditAndNotify(
  action: string,
  input: Omit<AuditAndNotifyInput, "action">
): Promise<void> {
  const mapEntry = actionMap[action];

  await appendAudit(input.actor, {
    action,
    entity: input.entity,
    payload: input.payload,
  });

  if (!mapEntry) {
    // eslint-disable-next-line no-console
    console.warn(
      `[auditAndNotify] unknown action "${action}" — wrote audit row, skipping timeline (add to lib/actionMap.ts)`
    );
    return;
  }

  const roles = input.rolesToNotify && input.rolesToNotify.length > 0
    ? input.rolesToNotify
    : mapEntry.rolesToNotify;

  const sentence = buildSentence(input.actor, mapEntry.verb, input.entity, input.details);
  try {
    await notifyTimeline(input.actor, roles, sentence);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[auditAndNotify] timeline write failed (non-fatal):",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Convenience helper to extract an AuditActor from a Next.js Request — pulls
 * IP from x-forwarded-for / x-real-ip headers and userAgent from UA header.
 * The caller is responsible for setting brotherId/name/role.
 */
export function actorFromRequest(req: Request, base: Partial<AuditActor> = {}): AuditActor {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  return {
    brotherId: base.brotherId ?? null,
    name: base.name ?? null,
    role: base.role ?? null,
    ipAddress,
    userAgent: req.headers.get("user-agent") || null,
  };
}
