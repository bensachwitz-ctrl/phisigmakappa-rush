import { describe, it, expect } from "vitest";
import { chainRowHash, verifyChainRows, type ChainableRow } from "@/lib/audit";

/**
 * Pure (no-DB) tests of the AuditLog hash-chain primitives. Builds a small chain
 * the same way lib/audit.ts does at insert time, then asserts that an intact
 * chain verifies and that any tamper (content edit, dropped row, reordered row,
 * forged hash) is detected at the offending sequence number.
 */

const BASE: Omit<ChainableRow, "seq" | "prevHash"> = {
  actorId: "brother_1",
  actorName: "Alex Founder",
  action: "RUSH_STATUS",
  subjectType: "Rush",
  subjectId: "rush_1",
  subjectName: "James Carter",
  details: "ACTIVE -> BID_EXTENDED",
  ipAddress: "203.0.113.7",
  createdAt: new Date("2026-06-15T12:00:00.000Z"),
};

/** Build a hashed chain of N rows, mirroring the insert-time logic. */
function buildChain(n: number): Array<ChainableRow & { hash: string }> {
  const out: Array<ChainableRow & { hash: string }> = [];
  let prevHash: string | null = null;
  for (let i = 1; i <= n; i++) {
    const row: ChainableRow = {
      ...BASE,
      seq: i,
      action: `ACTION_${i}`,
      createdAt: new Date(BASE.createdAt.getTime() + i * 1000),
      prevHash,
    };
    const hash = chainRowHash(row);
    out.push({ ...row, hash });
    prevHash = hash;
  }
  return out;
}

describe("audit hash chain", () => {
  it("verifies an intact chain", () => {
    const chain = buildChain(5);
    const res = verifyChainRows(chain);
    expect(res.ok).toBe(true);
    expect(res.brokenAtSeq).toBeNull();
  });

  it("verifies an empty chain", () => {
    expect(verifyChainRows([]).ok).toBe(true);
  });

  it("detects an edited historical row (content hash mismatch)", () => {
    const chain = buildChain(4);
    // Tamper row #2's details WITHOUT recomputing its hash.
    chain[1] = { ...chain[1], details: "FORGED -> APPROVED" };
    const res = verifyChainRows(chain);
    expect(res.ok).toBe(false);
    expect(res.brokenAtSeq).toBe(2);
  });

  it("detects a deleted row (sequence gap)", () => {
    const chain = buildChain(4);
    const withGap = [chain[0], chain[2], chain[3]]; // drop seq 2
    const res = verifyChainRows(withGap);
    expect(res.ok).toBe(false);
    expect(res.brokenAtSeq).toBe(3);
  });

  it("detects a reordered row (prevHash link mismatch)", () => {
    const chain = buildChain(4);
    const reordered = [chain[0], chain[2], chain[1], chain[3]];
    const res = verifyChainRows(reordered);
    expect(res.ok).toBe(false);
    // First inconsistency is at the row whose seq breaks the +1 expectation.
    expect(res.brokenAtSeq).not.toBeNull();
  });

  it("detects a forged hash on the latest row", () => {
    const chain = buildChain(3);
    chain[2] = { ...chain[2], hash: "deadbeef".repeat(8) };
    const res = verifyChainRows(chain);
    expect(res.ok).toBe(false);
    expect(res.brokenAtSeq).toBe(3);
  });

  it("is sensitive to the prevHash linkage (re-hashing a tampered row still breaks the next link)", () => {
    const chain = buildChain(3);
    // Edit row #1 and re-hash it so #1 looks internally valid…
    const editedRow1: ChainableRow & { hash: string } = (() => {
      const r: ChainableRow = { ...chain[0], details: "SNEAKY EDIT" };
      return { ...r, hash: chainRowHash(r) };
    })();
    const tampered = [editedRow1, chain[1], chain[2]];
    const res = verifyChainRows(tampered);
    // …row #2 still points at the OLD hash of #1, so the chain breaks at #2.
    expect(res.ok).toBe(false);
    expect(res.brokenAtSeq).toBe(2);
  });
});
