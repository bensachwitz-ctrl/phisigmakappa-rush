import { describe, it, expect, vi, beforeEach } from "vitest";

// ── GOVERNANCE / ELECTIONS INTEGRITY ─────────────────────────────────────────
// REGRESSION THIS SUITE LOCKS IN (P2): the vote layer gated only on "has a live
// brother session" — it never checked Brother.status. So an EXPELLED / INACTIVE /
// ALUMNUS member who still held a valid portal/app session could cast a COUNTED
// ballot. The fix gates every ballot-cast path on lib/elections `isVoterEligible`
// (status ∈ {ACTIVE, INITIATE}) BEFORE any ballot row is written. These tests pin
// (1) the pure eligibility rule, (2) the portal ballot route, and (3) the mobile
// vote route — proving an ineligible member is 403'd and NO ballot is created,
// while an eligible member proceeds to write one.

import { isVoterEligible, VOTING_ELIGIBLE_STATUSES } from "@/lib/elections";

// ── (1) Pure rule ─────────────────────────────────────────────────────────────
describe("isVoterEligible (pure rule)", () => {
  it("allows ONLY fully-initiated, currently-active members (ACTIVE, INITIATE)", () => {
    expect(isVoterEligible("ACTIVE")).toBe(true);
    expect(isVoterEligible("INITIATE")).toBe(true);
  });

  it("rejects every non-active / not-yet-initiated status", () => {
    for (const s of ["PROSPECT", "PLEDGE", "INACTIVE", "ALUMNUS", "EXPELLED"]) {
      expect(isVoterEligible(s)).toBe(false);
    }
  });

  it("rejects null / undefined / empty status defensively", () => {
    expect(isVoterEligible(null)).toBe(false);
    expect(isVoterEligible(undefined)).toBe(false);
    expect(isVoterEligible("")).toBe(false);
  });

  it("the eligible set is exactly {ACTIVE, INITIATE} (single-sourced)", () => {
    expect([...VOTING_ELIGIBLE_STATUSES].sort()).toEqual(["ACTIVE", "INITIATE"]);
  });
});

// ── Shared mocks for the two route handlers ──────────────────────────────────
const mocks = vi.hoisted(() => {
  // Portal (web) — prisma proxy.
  const electionFindUnique = vi.fn();
  const p_ballotCreate = vi.fn(async () => ({}));
  const getCurrentBrother = vi.fn();

  // Mobile — tenant client behind getTenantClient.
  const t_portalUserFindUnique = vi.fn(async () => ({ id: "pu1", brotherId: "b1" }));
  const t_brotherFindUnique = vi.fn();
  const t_seatFindUnique = vi.fn(async () => ({
    id: "seat1",
    title: "President",
    election: { status: "OPEN", audience: "BROTHERS" },
    candidates: [{ id: "cand1" }],
  }));
  const t_ballotFindUnique = vi.fn(async () => null);
  const t_ballotCreate = vi.fn(async () => ({}));
  const tenantDb = {
    portalUser: { findUnique: t_portalUserFindUnique },
    brother: { findUnique: t_brotherFindUnique },
    electionSeat: { findUnique: t_seatFindUnique },
    electionBallot: { findUnique: t_ballotFindUnique, create: t_ballotCreate },
  } as any;

  const tenantFindUnique = vi.fn(async () => ({ isActive: true }));
  const verifyPortalTokenForTenant = vi.fn(() => ({ userId: "pu1", role: "brother" }));

  return {
    electionFindUnique, p_ballotCreate, getCurrentBrother,
    t_brotherFindUnique, t_seatFindUnique, t_ballotFindUnique, t_ballotCreate,
    tenantFindUnique, verifyPortalTokenForTenant, tenantDb,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    election: { findUnique: mocks.electionFindUnique },
    electionBallot: { create: mocks.p_ballotCreate },
  },
  centralDb: { tenant: { findUnique: mocks.tenantFindUnique } },
  getTenantClient: () => mocks.tenantDb,
}));
vi.mock("@/lib/auth", () => ({
  getCurrentBrother: mocks.getCurrentBrother,
  isSameOrigin: () => true,
}));
vi.mock("@/lib/portal-auth", () => ({
  verifyPortalTokenForTenant: mocks.verifyPortalTokenForTenant,
}));
vi.mock("@/lib/mobile-cors", () => ({
  mobileCorsHeaders: () => ({}),
  mobilePreflightResponse: () => new Response(null, { status: 204 }),
}));
vi.mock("@/lib/mobile-exec-auth", () => ({ auditMobileExec: vi.fn(async () => {}) }));
vi.mock("@/lib/mobile-elections", () => ({
  buildMobileElectionView: vi.fn(async () => ({ election: { id: "e1" }, myBallot: {} })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  errorSink: vi.fn(),
}));

import { POST as portalBallotPOST } from "@/app/api/portal/brothers/elections/[id]/ballot/route";
import { POST as mobileVotePOST } from "@/app/api/mobile/elections/vote/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tenantFindUnique.mockResolvedValue({ isActive: true });
  mocks.verifyPortalTokenForTenant.mockReturnValue({ userId: "pu1", role: "brother" });
  mocks.t_seatFindUnique.mockResolvedValue({
    id: "seat1",
    title: "President",
    election: { status: "OPEN", audience: "BROTHERS" },
    candidates: [{ id: "cand1" }],
  });
  mocks.t_ballotFindUnique.mockResolvedValue(null);
  mocks.electionFindUnique.mockResolvedValue({
    id: "e1",
    status: "OPEN",
    audience: "BROTHERS",
    opensAt: null,
    closesAt: null,
    seats: [{ id: "seat1", candidates: [{ id: "cand1" }] }],
  });
});

function portalReq() {
  return new Request("https://phi-sig.greekstack.vercel.app/api/portal/brothers/elections/e1/ballot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatId: "seat1", candidateId: "cand1" }),
  });
}
function mobileReq() {
  return new Request("https://api.greekstack.vercel.app/api/mobile/elections/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer tok" },
    body: JSON.stringify({ subdomain: "phi-sig", seatId: "seat1", candidateId: "cand1" }),
  });
}

// ── (2) Portal ballot route ──────────────────────────────────────────────────
describe("portal ballot route enforces voter eligibility", () => {
  it("403s an EXPELLED member and writes NO ballot (gate runs before loading the election)", async () => {
    mocks.getCurrentBrother.mockResolvedValue({ id: "b1", status: "EXPELLED" });
    const res = await portalBallotPOST(portalReq(), { params: { id: "e1" } });
    expect(res.status).toBe(403);
    expect(mocks.p_ballotCreate).not.toHaveBeenCalled();
    expect(mocks.electionFindUnique).not.toHaveBeenCalled();
  });

  it.each(["INACTIVE", "ALUMNUS", "PLEDGE"])("403s a %s member with no ballot", async (status) => {
    mocks.getCurrentBrother.mockResolvedValue({ id: "b1", status });
    const res = await portalBallotPOST(portalReq(), { params: { id: "e1" } });
    expect(res.status).toBe(403);
    expect(mocks.p_ballotCreate).not.toHaveBeenCalled();
  });

  it("lets an ACTIVE member cast a ballot", async () => {
    mocks.getCurrentBrother.mockResolvedValue({ id: "b1", status: "ACTIVE" });
    const res = await portalBallotPOST(portalReq(), { params: { id: "e1" } });
    expect(res.status).toBe(200);
    expect(mocks.p_ballotCreate).toHaveBeenCalledTimes(1);
  });

  it("lets an INITIATE member cast a ballot", async () => {
    mocks.getCurrentBrother.mockResolvedValue({ id: "b1", status: "INITIATE" });
    const res = await portalBallotPOST(portalReq(), { params: { id: "e1" } });
    expect(res.status).toBe(200);
    expect(mocks.p_ballotCreate).toHaveBeenCalledTimes(1);
  });
});

// ── (3) Mobile vote route ────────────────────────────────────────────────────
describe("mobile vote route enforces voter eligibility", () => {
  it("403s an EXPELLED member and writes NO ballot (gate runs before the seat lookup)", async () => {
    mocks.t_brotherFindUnique.mockResolvedValue({ id: "b1", name: "Ex Member", status: "EXPELLED" });
    const res = await mobileVotePOST(mobileReq());
    expect(res.status).toBe(403);
    expect(mocks.t_ballotCreate).not.toHaveBeenCalled();
    expect(mocks.t_seatFindUnique).not.toHaveBeenCalled();
  });

  it("403s an ALUMNUS member with no ballot", async () => {
    mocks.t_brotherFindUnique.mockResolvedValue({ id: "b1", name: "Old Grad", status: "ALUMNUS" });
    const res = await mobileVotePOST(mobileReq());
    expect(res.status).toBe(403);
    expect(mocks.t_ballotCreate).not.toHaveBeenCalled();
  });

  it("lets an ACTIVE member cast a ballot", async () => {
    mocks.t_brotherFindUnique.mockResolvedValue({ id: "b1", name: "Active Bro", status: "ACTIVE" });
    const res = await mobileVotePOST(mobileReq());
    expect(res.status).toBe(200);
    expect(mocks.t_ballotCreate).toHaveBeenCalledTimes(1);
  });
});
