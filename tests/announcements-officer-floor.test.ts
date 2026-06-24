import { describe, it, expect, beforeEach, vi } from "vitest";

// ── GET /api/admin/announcements officer/admin floor (AOTY council R3) ────────
// Before R3, the announcements LIST gated only on `isAdminAuthed()` — true for
// ANY valid tenant cookie, including a plain member's (adminFlag=0, zero officer
// assignments). But GET returns EVERY row: EBOARD-audience + draft/scheduled
// announcements included. So a member bounced from the /admin UI could still
// read internal/eboard-only content straight from the JSON endpoint.
//
// The fix wraps GET in `withAdminArea(…)`, the API-layer twin of the
// app/admin/layout.tsx boundary: isAdminAuthed() 401 → guardOfficerOrAdmin()
// 403. The COARSE admit is "admin OR holds >=1 active officer assignment" — a
// plain member is now 403'd before the handler body runs.
//
// BEHAVIORAL test: drives the REAL exported GET with the session/permission seam
// mocked per persona, asserting HTTP status. (POST/PATCH/DELETE keep their
// existing isAdminAuthed()+guardOfficer('announcements','write') gates — pinned
// by tests/rbac-mutation-guards.test.ts — so this file targets the GET floor.)

let adminAuthed = false;
let session: { brother: { id: string }; isAdmin: boolean } | null = null;
let officerAssignments: any[] = [];

vi.mock("@/lib/auth", () => ({
  isAdminAuthed: () => adminAuthed,
  getCurrentSession: async () => session,
  getCurrentBrotherId: () => session?.brother.id ?? null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    officerAssignment: { findMany: async () => officerAssignments },
    // Handler body (reached only by an admit) lists announcements — stub it so
    // an admitted request returns 200 with the JSON shape.
    announcement: { findMany: async () => [] },
  },
  getSubdomain: () => null,
}));

// audit is imported by the route module (POST path); stub so import resolves.
vi.mock("@/lib/audit", () => ({ audit: async () => undefined }));

beforeEach(() => {
  adminAuthed = false;
  session = null;
  officerAssignments = [];
});

async function loadGet() {
  return (await import("@/app/api/admin/announcements/route")).GET;
}

function listRequest() {
  return new Request("https://alpha.greekstack.vercel.app/api/admin/announcements", {
    method: "GET",
  });
}

describe("GET /api/admin/announcements — officer/admin floor", () => {
  it("a member cookie (valid tenant HMAC, zero officer assignments) gets 403", async () => {
    adminAuthed = true;
    session = { brother: { id: "member_1" }, isAdmin: false };
    officerAssignments = [];

    const GET = await loadGet();
    const res = await GET(listRequest());
    expect(res.status).toBe(403);
  });

  it("no/invalid session gets 401 (isAdminAuthed pre-check)", async () => {
    adminAuthed = false;
    session = null;

    const GET = await loadGet();
    const res = await GET(listRequest());
    expect(res.status).toBe(401);
  });

  it("a chapter admin passes the floor (not 401/403) and gets the list", async () => {
    adminAuthed = true;
    session = { brother: { id: "boss_1" }, isAdmin: true };

    const GET = await loadGet();
    const res = await GET(listRequest());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("announcements");
  });

  it("any officer (>=1 active assignment) passes the COARSE floor — even a non-announcements domain", async () => {
    // withAdminArea uses guardOfficerOrAdmin(), which admits ANY officer (holds
    // >=1 active assignment), NOT only announcements-writers — it's the coarse
    // "allowed in the admin building" floor. An events officer therefore reads
    // the list. (The finer announcements:write gate lives on the mutations.)
    adminAuthed = true;
    session = { brother: { id: "officer_1" }, isAdmin: false };
    officerAssignments = [
      {
        endDate: null,
        position: {
          active: true,
          permissions: JSON.stringify({
            superAdmin: false,
            domain: { events: "read" },
          }),
        },
      },
    ];

    const GET = await loadGet();
    const res = await GET(listRequest());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });
});
