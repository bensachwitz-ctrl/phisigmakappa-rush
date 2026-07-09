import { describe, it, expect, vi, beforeEach } from "vitest";

// ── GOVERNANCE / ELECTIONS INTEGRITY ─────────────────────────────────────────
// REGRESSION THIS SUITE LOCKS IN (P2 — TOCTOU): seat-winners re-checked
// election.status (CLOSED) OUTSIDE the seating transaction, so two near-
// simultaneous "seat winners" submits could BOTH observe CLOSED and BOTH run —
// double-seating every officer (two active OfficerAssignments per position/term).
//
// The fix claims the CLOSED→SEATED transition with a CONDITIONAL update INSIDE
// the transaction (`updateMany where status='CLOSED'`) and asserts exactly one
// row changed; the losing request matches zero rows and aborts (409) before any
// assignment is created. This test simulates the race: BOTH requests read a
// still-CLOSED election (the pre-commit read), but the atomic claim succeeds only
// once — proving the second submit creates NO extra OfficerAssignment.

const mocks = vi.hoisted(() => {
  // Models the election row's status for the CONDITIONAL claim: the first claim
  // flips CLOSED→SEATED (count 1); every later claim matches zero rows (count 0).
  const state = { claimed: false };

  const electionFindUnique = vi.fn();
  const txElectionUpdateMany = vi.fn(async (_args: any) => {
    if (state.claimed) return { count: 0 };
    state.claimed = true;
    return { count: 1 };
  });
  const txOfficerUpdateMany = vi.fn(async () => ({ count: 0 }));
  const txOfficerCreate = vi.fn(async () => ({ id: "asg1" }));
  const txSeatUpdate = vi.fn(async () => ({}));

  const tx = {
    election: { updateMany: txElectionUpdateMany },
    officerAssignment: { updateMany: txOfficerUpdateMany, create: txOfficerCreate },
    electionSeat: { update: txSeatUpdate },
  };
  const $transaction = vi.fn(async (fn: any) => fn(tx));

  return {
    state, electionFindUnique, txElectionUpdateMany, txOfficerUpdateMany,
    txOfficerCreate, txSeatUpdate, $transaction,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    election: { findUnique: mocks.electionFindUnique },
    $transaction: mocks.$transaction,
  },
}));
vi.mock("@/lib/notify", () => ({ auditAndNotify: vi.fn(async () => {}) }));
vi.mock("@/lib/elections-server", () => ({
  guardElectionRequest: vi.fn(async () => ({ ok: true })),
  electionActor: vi.fn(async () => ({ id: "admin", name: "Admin" })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  errorSink: vi.fn(),
}));

import { POST } from "@/app/api/admin/elections/[id]/seat-winners/route";

// Both requests read a STILL-CLOSED election (the stale pre-commit read that
// makes the race possible) — only the atomic claim inside the txn arbitrates.
const CLOSED_ELECTION = {
  id: "e1",
  title: "2026 Officer Elections",
  termCode: "2026-FA",
  status: "CLOSED",
  seats: [
    {
      id: "seat1",
      title: "President",
      positionId: "pos1",
      candidates: [{ id: "c1", brotherId: "bw1", name: "Winner" }],
      ballots: [{ candidateId: "c1" }], // single clear winner
    },
  ],
};

function req() {
  return new Request("https://phi-sig.greekstack.vercel.app/api/admin/elections/e1/seat-winners", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.claimed = false;
  mocks.electionFindUnique.mockResolvedValue(CLOSED_ELECTION);
});

describe("seat-winners CLOSED→SEATED is claimed atomically (no double-seat)", () => {
  it("a concurrent double-submit seats ONCE: first 200, second 409, exactly one OfficerAssignment", async () => {
    const first = await POST(req(), { params: { id: "e1" } });
    const second = await POST(req(), { params: { id: "e1" } });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);

    // The conditional claim ran on BOTH submits (both entered the txn on a stale
    // CLOSED read) — but only ONE assignment was ever created.
    expect(mocks.txElectionUpdateMany).toHaveBeenCalledTimes(2);
    expect(mocks.txElectionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "e1", status: "CLOSED" }, data: { status: "SEATED" } }),
    );
    expect(mocks.txOfficerCreate).toHaveBeenCalledTimes(1);
    // The loser aborted before touching any seat row.
    expect(mocks.txSeatUpdate).toHaveBeenCalledTimes(1);

    const secondBody = await second.json();
    expect(secondBody.ok).toBe(false);
    expect(secondBody.error).toMatch(/already seated/i);
  });

  it("the happy single submit seats the winner and flips the status inside the txn", async () => {
    const res = await POST(req(), { params: { id: "e1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.seated).toHaveLength(1);
    expect(mocks.txOfficerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ positionId: "pos1", brotherId: "bw1", termCode: "2026-FA" }),
      }),
    );
  });
});
