import { describe, it, expect } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { filterOptedOut } from "@/lib/tcpa";

// ---------------------------------------------------------------------------
// lib/tcpa.ts filterOptedOut — the OPT-OUT TCPA guard.
//
// Texting a rushee who replied STOP is a TCPA violation. This removes opted-out
// ids from a recipient set BEFORE send. Rules (from the doc contract):
//   - No consent row at all  → KEEP (absence of a row is not a stop).
//   - Latest consent row optedOut === true → EXCLUDE.
//   - A later re-opt-in (newer row, optedOut=false) re-ENABLES the rush.
//   - Output order matches input order; duplicates preserved.
//
// We drive it with a tiny in-memory fake of db.rushConsent.findMany — pure
// logic, no real database. The fake honors the { rushId: { in }, orderBy
// createdAt desc } query shape the function relies on.
// ---------------------------------------------------------------------------

interface ConsentRow {
  rushId: string;
  optedOut: boolean;
  createdAt: Date;
}

/** Build a fake PrismaClient exposing just rushConsent.findMany over `rows`. */
function fakeDb(rows: ConsentRow[]): PrismaClient {
  return {
    rushConsent: {
      findMany: async (args: any) => {
        const ids: string[] = args?.where?.rushId?.in ?? [];
        return rows
          .filter((r) => ids.includes(r.rushId))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // desc
      },
    },
  } as unknown as PrismaClient;
}

const T = (offsetMs: number) => new Date(2025, 0, 1, 0, 0, 0, 0 + offsetMs);

describe("filterOptedOut", () => {
  it("returns [] for an empty input without touching the db", async () => {
    // Pass a db that would throw if queried — proves the early return.
    const throwingDb = {
      rushConsent: {
        findMany: async () => {
          throw new Error("should not query for empty input");
        },
      },
    } as unknown as PrismaClient;
    expect(await filterOptedOut(throwingDb, [])).toEqual([]);
  });

  it("keeps a rush with NO consent row (absence is not a stop)", async () => {
    const db = fakeDb([]);
    expect(await filterOptedOut(db, ["r1"])).toEqual(["r1"]);
  });

  it("excludes a rush whose latest row is optedOut === true", async () => {
    const db = fakeDb([{ rushId: "r1", optedOut: true, createdAt: T(0) }]);
    expect(await filterOptedOut(db, ["r1"])).toEqual([]);
  });

  it("keeps a rush whose latest row is optedOut === false", async () => {
    const db = fakeDb([{ rushId: "r1", optedOut: false, createdAt: T(0) }]);
    expect(await filterOptedOut(db, ["r1"])).toEqual(["r1"]);
  });

  it("honors a later RE-OPT-IN over an earlier opt-out (newest row wins)", async () => {
    const db = fakeDb([
      { rushId: "r1", optedOut: true, createdAt: T(10) }, // earlier STOP
      { rushId: "r1", optedOut: false, createdAt: T(20) }, // later re-opt-in
    ]);
    expect(await filterOptedOut(db, ["r1"])).toEqual(["r1"]);
  });

  it("honors a later OPT-OUT over an earlier opt-in (newest row wins)", async () => {
    const db = fakeDb([
      { rushId: "r1", optedOut: false, createdAt: T(10) },
      { rushId: "r1", optedOut: true, createdAt: T(20) }, // later STOP
    ]);
    expect(await filterOptedOut(db, ["r1"])).toEqual([]);
  });

  it("filters a mixed batch and preserves input order", async () => {
    const db = fakeDb([
      { rushId: "r2", optedOut: true, createdAt: T(0) }, // out
      { rushId: "r4", optedOut: true, createdAt: T(0) }, // out
      // r1 and r3 have no rows → kept
    ]);
    expect(await filterOptedOut(db, ["r1", "r2", "r3", "r4"])).toEqual(["r1", "r3"]);
  });

  it("preserves duplicate ids in the input", async () => {
    const db = fakeDb([{ rushId: "r2", optedOut: true, createdAt: T(0) }]);
    expect(await filterOptedOut(db, ["r1", "r1", "r2"])).toEqual(["r1", "r1"]);
  });
});
