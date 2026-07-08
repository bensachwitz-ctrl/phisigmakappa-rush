import { describe, it, expect } from "vitest";
import {
  checkDbThrottle,
  recordDbAttempt,
  clearDbAttempts,
  type DbThrottleOptions,
  type ThrottleKeys,
} from "@/lib/rate-limit";

// P1 regression: the portal/mobile/OTP brute-force throttles were backed by a
// MODULE-LEVEL Map, so on Vercel serverless each cold-started instance had its
// own empty counter — an attacker spreading guesses across instances (or simply
// benefiting from autoscaling) was never actually capped. They are now backed by
// the SHARED RushSubmitLog table via checkDbThrottle/recordDbAttempt.
//
// This suite proves the cap holds ACROSS INSTANCES by modelling the shared DB as a
// single row store and running the helper from two independent call sites that
// share ONLY that store (no module-level state). A fresh, empty store (a brand-new
// process) does NOT block — proving the block comes from the DB count, not any
// per-process global.

interface Row {
  ipAddress: string | null;
  email: string | null;
  status: string;
  createdAt: Date;
}

/** A minimal in-memory stand-in for prisma's `rushSubmitLog` delegate. */
function makeSharedDb() {
  const rows: Row[] = [];
  const db = {
    rushSubmitLog: {
      count: async ({ where }: any) => {
        return rows.filter((r) => {
          if (where.status !== undefined && r.status !== where.status) return false;
          if (where.ipAddress !== undefined && r.ipAddress !== where.ipAddress) return false;
          if (where.email !== undefined && r.email !== where.email) return false;
          if (where.createdAt?.gte && r.createdAt.getTime() < where.createdAt.gte.getTime()) return false;
          return true;
        }).length;
      },
      create: async ({ data }: any) => {
        rows.push({
          ipAddress: data.ipAddress ?? null,
          email: data.email ?? null,
          status: data.status,
          createdAt: new Date(),
        });
        return {};
      },
      deleteMany: async ({ where }: any) => {
        const or: any[] = where.OR || [];
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          if (r.status !== where.status) continue;
          const matches = or.some(
            (o) =>
              (o.ipAddress !== undefined && o.ipAddress === r.ipAddress) ||
              (o.email !== undefined && o.email === r.email),
          );
          if (matches) rows.splice(i, 1);
        }
        return {};
      },
    },
  };
  return { db, rows };
}

const OPTS: DbThrottleOptions = { limit: 3, windowMs: 60_000, status: "TEST_LOGIN_FAILED" };
const KEYS: ThrottleKeys = { ip: "203.0.113.7", account: "brother:victim@example.com" };

describe("DB-backed throttle — the cap holds across serverless instances", () => {
  it("blocks once the SHARED store hits the limit, no matter which instance checks", async () => {
    const shared = makeSharedDb();

    // Instance A records `limit` failed attempts (each request may land on a
    // different serverless instance — they all write the same DB).
    await recordDbAttempt(shared.db as any, KEYS, OPTS);
    await recordDbAttempt(shared.db as any, KEYS, OPTS);
    await recordDbAttempt(shared.db as any, KEYS, OPTS);

    // Instance B — a DIFFERENT process that shares only the DB — sees the cap.
    const blocked = await checkDbThrottle(shared.db as any, KEYS, OPTS);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    // A brand-new process with its OWN empty store does NOT block — proving the
    // block is driven by the DB count, not any per-process global (the old bug).
    const freshProcess = makeSharedDb();
    expect((await checkDbThrottle(freshProcess.db as any, KEYS, OPTS)).ok).toBe(true);
  });

  it("is under the limit at limit-1 and blocks exactly at the limit", async () => {
    const shared = makeSharedDb();
    await recordDbAttempt(shared.db as any, KEYS, OPTS);
    await recordDbAttempt(shared.db as any, KEYS, OPTS);
    expect((await checkDbThrottle(shared.db as any, KEYS, OPTS)).ok).toBe(true); // 2 < 3
    await recordDbAttempt(shared.db as any, KEYS, OPTS);
    expect((await checkDbThrottle(shared.db as any, KEYS, OPTS)).ok).toBe(false); // 3 >= 3
  });

  it("clearing on success frees the key (both dimensions)", async () => {
    const shared = makeSharedDb();
    for (let i = 0; i < 3; i++) await recordDbAttempt(shared.db as any, KEYS, OPTS);
    expect((await checkDbThrottle(shared.db as any, KEYS, OPTS)).ok).toBe(false);
    await clearDbAttempts(shared.db as any, KEYS, OPTS);
    expect((await checkDbThrottle(shared.db as any, KEYS, OPTS)).ok).toBe(true);
  });

  it("counts the IP and account dimensions independently", async () => {
    // IP dimension: one IP spraying MANY accounts trips the IP bucket even though
    // no single account is over the per-account cap.
    const ipCase = makeSharedDb();
    await recordDbAttempt(ipCase.db as any, { ip: "198.51.100.9", account: "brother:a@x.com" }, OPTS);
    await recordDbAttempt(ipCase.db as any, { ip: "198.51.100.9", account: "brother:b@x.com" }, OPTS);
    await recordDbAttempt(ipCase.db as any, { ip: "198.51.100.9", account: "brother:c@x.com" }, OPTS);
    // A new account from the SAME IP is blocked by the IP dimension.
    expect(
      (await checkDbThrottle(ipCase.db as any, { ip: "198.51.100.9", account: "brother:d@x.com" }, OPTS)).ok,
    ).toBe(false);

    // Account dimension: one account hit from MANY IPs trips the account bucket
    // (distributed guessing against a single victim).
    const acctCase = makeSharedDb();
    await recordDbAttempt(acctCase.db as any, { ip: "10.0.0.1", account: "brother:victim@x.com" }, OPTS);
    await recordDbAttempt(acctCase.db as any, { ip: "10.0.0.2", account: "brother:victim@x.com" }, OPTS);
    await recordDbAttempt(acctCase.db as any, { ip: "10.0.0.3", account: "brother:victim@x.com" }, OPTS);
    // A fresh IP targeting the SAME account is blocked by the account dimension.
    expect(
      (await checkDbThrottle(acctCase.db as any, { ip: "10.0.0.99", account: "brother:victim@x.com" }, OPTS)).ok,
    ).toBe(false);
  });

  it("fails OPEN when the DB errors (never locks out a legitimate user)", async () => {
    const brokenDb = {
      rushSubmitLog: {
        count: async () => {
          throw new Error("db down");
        },
        create: async () => ({}),
        deleteMany: async () => ({}),
      },
    };
    const res = await checkDbThrottle(brokenDb as any, KEYS, OPTS);
    expect(res.ok).toBe(true); // fail open
  });

  it("only counts rows within the sliding window", async () => {
    const shared = makeSharedDb();
    // Seed three failures that are already OLDER than the window — they must fall
    // out of the count (checkDbThrottle filters createdAt >= now - windowMs).
    const old = new Date(Date.now() - OPTS.windowMs - 5_000);
    for (let i = 0; i < 3; i++) {
      shared.rows.push({ ipAddress: KEYS.ip!, email: KEYS.account!, status: OPTS.status, createdAt: old });
    }
    expect((await checkDbThrottle(shared.db as any, KEYS, OPTS)).ok).toBe(true); // all stale → not blocked
    // Three fresh failures now DO block.
    for (let i = 0; i < 3; i++) await recordDbAttempt(shared.db as any, KEYS, OPTS);
    expect((await checkDbThrottle(shared.db as any, KEYS, OPTS)).ok).toBe(false);
  });
});
