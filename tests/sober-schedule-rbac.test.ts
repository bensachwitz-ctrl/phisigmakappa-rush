import { describe, it, expect, vi, beforeEach } from "vitest";

// ── P2b — Risk Manager can select + log the sober-driver schedule (runtime RBAC)
//
// Owner spec: "Risk Mgmt = select + log sober driver." The sober-schedule route
// used to gate its WRITES on isAdminRole() (super-admin ONLY), so a non-super-
// admin Risk Manager holding risk:write could neither load nor save. It now
// gates read on risk:read and write on risk:write (admins pass via
// SUPER_ADMIN_PERMISSIONS). These tests drive the REAL route handlers with a
// real permission resolution (guardOfficer -> requireOfficerPermission ->
// getOfficerPermissionsForBrother over a mocked OfficerAssignment) and assert:
//   • a risk:write officer (isAdmin=false) can LOAD (GET) and SAVE (POST);
//   • a plain member (no assignments) is 403'd on both, and never writes;
//   • an officer WITHOUT risk (rushPipeline only) is 403'd (it's risk-specific);
//   • a chapter super-admin still passes.

const mocks = vi.hoisted(() => ({
  isAdminAuthed: vi.fn(),
  getCurrentSession: vi.fn(),
  officerAssignmentFindMany: vi.fn(),
  soberShiftFindMany: vi.fn(),
  soberShiftFindFirst: vi.fn(),
  soberShiftCreate: vi.fn(),
  soberShiftUpdate: vi.fn(),
  brotherFindMany: vi.fn(),
  brotherFindUnique: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    officerAssignment: { findMany: mocks.officerAssignmentFindMany },
    soberDriverShift: {
      findMany: mocks.soberShiftFindMany,
      findFirst: mocks.soberShiftFindFirst,
      create: mocks.soberShiftCreate,
      update: mocks.soberShiftUpdate,
    },
    brother: { findMany: mocks.brotherFindMany, findUnique: mocks.brotherFindUnique },
  },
  centralDb: {},
  getSubdomain: () => null,
}));

vi.mock("@/lib/auth", () => ({
  isAdminAuthed: mocks.isAdminAuthed,
  getCurrentSession: mocks.getCurrentSession,
}));

// Billing lock is enforced by guardOfficer's write path (assertBillingActive) —
// stub it OPEN here so the RBAC decision is what we're testing, not billing.
vi.mock("@/lib/billing-guard", () => ({
  assertBillingActive: vi.fn(async () => {}),
  guardBillingWrite: vi.fn(async () => null),
}));

vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));

import { GET, POST } from "@/app/api/admin/sober-schedule/route";

// Serialize a permission set the way OfficerPosition.permissions stores it.
function assignment(domain: Record<string, "read" | "write">) {
  return [{ position: { permissions: JSON.stringify({ superAdmin: false, domain }) } }];
}

/** Stand up the session + officer perms + happy-path data mocks. */
function primeSession(opts: {
  isAdmin: boolean;
  brotherId: string;
  assignments: any[];
}) {
  vi.clearAllMocks();
  mocks.isAdminAuthed.mockReturnValue(true); // a valid tenant cookie (member OR officer)
  mocks.getCurrentSession.mockResolvedValue({
    brother: { id: opts.brotherId },
    isAdmin: opts.isAdmin,
  });
  mocks.officerAssignmentFindMany.mockResolvedValue(opts.assignments);
  // GET data
  mocks.soberShiftFindMany.mockResolvedValue([]);
  mocks.brotherFindMany.mockResolvedValue([]);
  // POST data (no existing shift → create)
  mocks.soberShiftFindFirst.mockResolvedValue(null);
  mocks.soberShiftCreate.mockResolvedValue({ id: "shift-1", day: "Thursday", shiftHours: "22:00-00:00" });
  // The POST handler now re-validates the target memberId resolves to a PLEDGE
  // in this chapter before writing — so the happy-path fixture is a real pledge.
  mocks.brotherFindUnique.mockResolvedValue({ name: "Pledge One", status: "PLEDGE" });
}

function postReq(body: Record<string, unknown>) {
  return new Request("https://greekstack.vercel.app/api/admin/sober-schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_SHIFT = { day: "Thursday", shiftHours: "22:00-00:00", memberId: "pledge-1" };

describe("POST/GET /api/admin/sober-schedule — risk RBAC (P2b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("a risk:write officer (non-super-admin) can LOAD the schedule", async () => {
    primeSession({ isAdmin: false, brotherId: "risk-officer", assignments: assignment({ risk: "write" }) });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("a risk:write officer (non-super-admin) can SAVE a sober-driver assignment", async () => {
    primeSession({ isAdmin: false, brotherId: "risk-officer", assignments: assignment({ risk: "write" }) });
    const res = await POST(postReq(VALID_SHIFT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.soberShiftCreate).toHaveBeenCalledTimes(1);
  });

  it("a plain member (no assignments) is DENIED both load and save (and never writes)", async () => {
    primeSession({ isAdmin: false, brotherId: "member", assignments: [] });
    const getRes = await GET();
    expect(getRes.status).toBe(403);

    primeSession({ isAdmin: false, brotherId: "member", assignments: [] });
    const postRes = await POST(postReq(VALID_SHIFT));
    expect(postRes.status).toBe(403);
    expect(mocks.soberShiftCreate).not.toHaveBeenCalled();
  });

  it("an officer WITHOUT risk (rushPipeline only) is DENIED — the gate is risk-specific", async () => {
    primeSession({
      isAdmin: false,
      brotherId: "rush-chair",
      assignments: assignment({ rushPipeline: "write" }),
    });
    const getRes = await GET();
    expect(getRes.status).toBe(403);

    primeSession({
      isAdmin: false,
      brotherId: "rush-chair",
      assignments: assignment({ rushPipeline: "write" }),
    });
    const postRes = await POST(postReq(VALID_SHIFT));
    expect(postRes.status).toBe(403);
    expect(mocks.soberShiftCreate).not.toHaveBeenCalled();
  });

  it("a risk:READ-only officer can load but NOT save", async () => {
    primeSession({ isAdmin: false, brotherId: "risk-reader", assignments: assignment({ risk: "read" }) });
    const getRes = await GET();
    expect(getRes.status).toBe(200);

    primeSession({ isAdmin: false, brotherId: "risk-reader", assignments: assignment({ risk: "read" }) });
    const postRes = await POST(postReq(VALID_SHIFT));
    expect(postRes.status).toBe(403);
    expect(mocks.soberShiftCreate).not.toHaveBeenCalled();
  });

  it("a chapter super-admin still passes both load and save", async () => {
    primeSession({ isAdmin: true, brotherId: "admin", assignments: [] });
    const getRes = await GET();
    expect(getRes.status).toBe(200);

    primeSession({ isAdmin: true, brotherId: "admin", assignments: [] });
    const postRes = await POST(postReq(VALID_SHIFT));
    expect(postRes.status).toBe(200);
    expect(mocks.soberShiftCreate).toHaveBeenCalledTimes(1);
  });
});

// ── #67 security review — server-side PLEDGE validation on the WRITE path ──────
//
// The GET list and the scheduler dropdown only ever OFFER pledges, but a
// risk:write officer (who is legitimately allowed to WRITE) can bypass the
// client and POST an arbitrary memberId. Without a server-side check that would
// create an out-of-spec sober-driver assignment pointing at a non-PLEDGE (or a
// bogus id). These tests drive the REAL POST handler with a passing risk:write
// officer and assert the memberId is validated against Brother.status === PLEDGE
// BEFORE any upsert — so RBAC is satisfied but the row is still rejected.
describe("POST /api/admin/sober-schedule — memberId must resolve to a PLEDGE (#67)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("a risk:write officer CANNOT assign an ACTIVE (non-pledge) brother", async () => {
    primeSession({ isAdmin: false, brotherId: "risk-officer", assignments: assignment({ risk: "write" }) });
    // Target memberId resolves to a real brother, but they're ACTIVE, not a PLEDGE.
    mocks.brotherFindUnique.mockResolvedValue({ name: "Active Al", status: "ACTIVE" });

    const res = await POST(postReq({ ...VALID_SHIFT, memberId: "active-al" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    // No shift row may be created OR updated for an out-of-spec target.
    expect(mocks.soberShiftCreate).not.toHaveBeenCalled();
    expect(mocks.soberShiftUpdate).not.toHaveBeenCalled();
  });

  it("a risk:write officer CANNOT assign a bogus / nonexistent memberId", async () => {
    primeSession({ isAdmin: false, brotherId: "risk-officer", assignments: assignment({ risk: "write" }) });
    // Target memberId matches no brother in this chapter's schema.
    mocks.brotherFindUnique.mockResolvedValue(null);

    const res = await POST(postReq({ ...VALID_SHIFT, memberId: "does-not-exist" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(mocks.soberShiftCreate).not.toHaveBeenCalled();
    expect(mocks.soberShiftUpdate).not.toHaveBeenCalled();
  });

  it("even a super-admin CANNOT assign a non-pledge (guard is not RBAC-bypassable)", async () => {
    primeSession({ isAdmin: true, brotherId: "admin", assignments: [] });
    mocks.brotherFindUnique.mockResolvedValue({ name: "Active Al", status: "ACTIVE" });

    const res = await POST(postReq({ ...VALID_SHIFT, memberId: "active-al" }));
    expect(res.status).toBe(400);
    expect(mocks.soberShiftCreate).not.toHaveBeenCalled();
    expect(mocks.soberShiftUpdate).not.toHaveBeenCalled();
  });

  it("a valid PLEDGE assignment by a risk:write officer still succeeds", async () => {
    primeSession({ isAdmin: false, brotherId: "risk-officer", assignments: assignment({ risk: "write" }) });
    // primeSession already returns a PLEDGE from brotherFindUnique.
    const res = await POST(postReq(VALID_SHIFT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.soberShiftCreate).toHaveBeenCalledTimes(1);
  });
});
