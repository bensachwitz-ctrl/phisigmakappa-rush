import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother, isAdminAuthed } from "@/lib/auth";

/**
 * Canonical, order-stable serialization of the chained fields of an audit row.
 * Used both when WRITING a new row's hash and when RE-COMPUTING during
 * verification, so the two must stay byte-identical. Null/undefined collapse to
 * empty string; the previous row's hash is folded in so the chain is broken by
 * any edit to an earlier row.
 */
/** The hashed content of one audit row, independent of Prisma. */
export interface ChainableRow {
  seq: number;
  actorId: string | null;
  actorName: string;
  action: string;
  subjectType: string;
  subjectId: string | null;
  subjectName: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
  prevHash: string | null;
}

function canonicalAuditPayload(row: ChainableRow): string {
  return [
    row.prevHash ?? "",
    String(row.seq),
    row.actorId ?? "",
    row.actorName ?? "",
    row.action ?? "",
    row.subjectType ?? "",
    row.subjectId ?? "",
    row.subjectName ?? "",
    row.details ?? "",
    row.ipAddress ?? "",
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  ].join("|");
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Pure: the SHA-256 hash of a row given its content + the previous hash. */
export function chainRowHash(row: ChainableRow): string {
  return sha256(canonicalAuditPayload(row));
}

/**
 * Pure chain verifier over an in-memory list of already-hashed rows (seq asc).
 * Shared by the DB-backed verifyChain() and by unit tests so the chain logic is
 * exercised without a database. Each row must increase seq by 1, link prevHash
 * to the prior row's hash, and recompute to its stored hash.
 */
export function verifyChainRows(
  rows: Array<ChainableRow & { hash: string }>,
): { ok: boolean; brokenAtSeq: number | null; reason?: string } {
  let expectedPrevHash: string | null = null;
  let expectedSeq: number | null = null;
  for (const row of rows) {
    if (row.seq == null) return { ok: false, brokenAtSeq: null, reason: "row missing seq" };
    if (expectedSeq !== null && row.seq !== expectedSeq) {
      return { ok: false, brokenAtSeq: row.seq, reason: "sequence gap (row inserted or deleted)" };
    }
    if ((row.prevHash ?? null) !== expectedPrevHash) {
      return { ok: false, brokenAtSeq: row.seq, reason: "prevHash link mismatch" };
    }
    if (chainRowHash(row) !== row.hash) {
      return { ok: false, brokenAtSeq: row.seq, reason: "content hash mismatch (row altered)" };
    }
    expectedPrevHash = row.hash;
    expectedSeq = row.seq + 1;
  }
  return { ok: true, brokenAtSeq: null };
}

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

    // Tamper-evident insert: link this row to the previous one via a hash chain.
    // We run inside a transaction so the (read latest seq/hash → insert next)
    // pair is atomic — concurrent audits can't both claim the same seq or fork
    // the chain. The createdAt is fixed up-front so the value we HASH is exactly
    // the value persisted (letting the DB default it would hash a different ts).
    const createdAt = new Date();
    await prisma.$transaction(async (tx) => {
      const prev = await tx.auditLog.findFirst({
        where: { hash: { not: null } },
        orderBy: { seq: "desc" },
        select: { seq: true, hash: true },
      });
      const seq = (prev?.seq ?? 0) + 1;
      const prevHash = prev?.hash ?? null;
      const hash = chainRowHash({
        seq,
        actorId,
        actorName,
        action: opts.action,
        subjectType: opts.subjectType,
        subjectId: opts.subjectId || null,
        subjectName: opts.subjectName || null,
        details: opts.details || null,
        ipAddress,
        createdAt,
        prevHash,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          actorName,
          action: opts.action,
          subjectType: opts.subjectType,
          subjectId: opts.subjectId || null,
          subjectName: opts.subjectName || null,
          details: opts.details || null,
          ipAddress,
          createdAt,
          seq,
          prevHash,
          hash,
        },
      });
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

export interface ChainVerificationResult {
  /** True only when every hashed row recomputes to its stored hash AND links
   *  correctly to its predecessor. */
  ok: boolean;
  /** Total hashed (chained) rows examined. */
  chainedRows: number;
  /** Count of legacy rows that predate the hash chain (hash IS NULL) — these are
   *  reported but do not fail verification. */
  legacyRows: number;
  /** The seq of the first row whose hash/link did not verify, or null. */
  brokenAtSeq: number | null;
  /** Human-readable reason when ok=false. */
  reason?: string;
}

/**
 * Walk the AuditLog hash chain in seq order and recompute each row's hash from
 * its canonical content + the previous row's hash. Returns ok:false (with the
 * offending seq) the moment any row's stored hash doesn't match the recomputed
 * value, the prevHash link is wrong, or the sequence has a gap — i.e. any edit,
 * deletion, reorder, or insertion of a historical row. Best-effort: a DB error
 * surfaces as ok:false with a reason rather than throwing.
 */
export async function verifyChain(): Promise<ChainVerificationResult> {
  try {
    const legacyRows = await prisma.auditLog.count({ where: { hash: null } });
    const rows = await prisma.auditLog.findMany({
      where: { hash: { not: null } },
      orderBy: { seq: "asc" },
      select: {
        seq: true,
        actorId: true,
        actorName: true,
        action: true,
        subjectType: true,
        subjectId: true,
        subjectName: true,
        details: true,
        ipAddress: true,
        createdAt: true,
        prevHash: true,
        hash: true,
      },
    });

    // Non-null seq/hash are guaranteed by the `hash: { not: null }` filter; seq
    // is also non-null for any hashed row (both are written together).
    const typed = rows.map((r) => ({ ...r, seq: r.seq as number, hash: r.hash as string }));
    const result = verifyChainRows(typed);
    return {
      ok: result.ok,
      chainedRows: rows.length,
      legacyRows,
      brokenAtSeq: result.brokenAtSeq,
      ...(result.reason ? { reason: result.reason } : {}),
    };
  } catch {
    return { ok: false, chainedRows: 0, legacyRows: 0, brokenAtSeq: null, reason: "verification query failed" };
  }
}
