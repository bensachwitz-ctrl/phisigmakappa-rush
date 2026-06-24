import { describe, it, expect, beforeEach, vi } from "vitest";

// ── POST /api/send-email officer/admin floor (AOTY council R3 finding) ────────
// Before R3, the rush-blast endpoint gated only on `isAdminAuthed()` — which
// proves nothing more than "the cookie HMAC is valid for THIS tenant", i.e. it
// is TRUE for a plain member who logged in via the "Active brothers" flow. That
// member (adminFlag=0, zero officer assignments) could therefore fire a branded
// email blast to every selected PNM, burning Resend credits.
//
// The fix wraps the handler in `withOfficer("rushPipeline","write", …)`, whose
// floor is: isAdminAuthed() 401 pre-check → guardOfficer("rushPipeline","write")
// 403. A chapter admin (SUPER_ADMIN_PERMISSIONS) and an officer holding
// rushPipeline:write pass; a plain member is now 403'd before the handler body.
//
// This is a BEHAVIORAL test: it drives the REAL exported POST handler with the
// session/permission seam mocked to model each persona, and asserts the HTTP
// status. The auth seam mocked is the same one both the wrapper (isAdminAuthed)
// and the permission layer (getCurrentSession + the officer-assignment query)
// read, so a regression that drops the wrapper fails loudly here.

// Mutable session knobs the mocks read, reset per test.
let adminAuthed = false;
// getCurrentSession() return — null (no session), or { brother, isAdmin }.
let session: { brother: { id: string }; isAdmin: boolean } | null = null;
// officerAssignment.findMany result for the member-permission lookup.
let officerAssignments: any[] = [];

// Mock @/lib/auth: the wrapper calls isAdminAuthed(); lib/permissions calls
// getCurrentSession(). Both resolve here. (Other exports are unused on the
// denial path but stubbed so the module import resolves.)
vi.mock("@/lib/auth", () => ({
  isAdminAuthed: () => adminAuthed,
  getCurrentSession: async () => session,
  getCurrentBrotherId: () => session?.brother.id ?? null,
}));

// Mock @/lib/prisma: getOfficerPermissionsForBrother() runs
// officerAssignment.findMany(); the handler body (only reached by an
// admit) would run rush.findMany + emailLog.create — stub them so an admitted
// request returns cleanly (no real DB) and we can assert it got PAST the floor.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    officerAssignment: { findMany: async () => officerAssignments },
    // Return a recipient so an ADMITTED request reaches the mock-Resend branch
    // (ok:true, mode:"mock") and resolves 200 — rather than the empty-set 404.
    rush: { findMany: async () => [{ id: "r1", email: "pnm@example.com", name: "PNM One" }] },
    emailLog: { create: async () => ({}) },
  },
  getSubdomain: () => null,
}));

// Resend creds: returning no key drives the handler's mock branch (ok:true,
// mode:"mock") so an ADMITTED request resolves without a live send.
vi.mock("@/lib/messaging-config", () => ({
  getResendConfig: async () => ({ apiKey: "", fromEmail: "noreply@example.com" }),
}));
vi.mock("@/lib/chapter-identity", () => ({
  getChapterIdentity: async () => ({
    fraternityName: "Test Chapter",
    schoolName: "Test U",
    schoolShort: "TU",
    chapterAttribution: "Test Chapter",
  }),
}));
vi.mock("@/lib/site-config", () => ({ getSiteConfig: async () => ({}) }));

beforeEach(() => {
  adminAuthed = false;
  session = null;
  officerAssignments = [];
});

async function loadPost() {
  return (await import("@/app/api/send-email/route")).POST;
}

function blastRequest() {
  return new Request("https://alpha.greekstack.vercel.app/api/send-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      rushIds: ["r1"],
      subject: "Come to rush",
      body: "Join us Thursday at the house.",
    }),
  });
}

describe("POST /api/send-email — officer/admin floor", () => {
  it("a member cookie (valid tenant HMAC, zero officer assignments) gets 403", async () => {
    // Member: cookie verifies (isAdminAuthed true) BUT not an admin and holds no
    // officer assignment → guardOfficer('rushPipeline','write') denies → 403.
    adminAuthed = true;
    session = { brother: { id: "member_1" }, isAdmin: false };
    officerAssignments = [];

    const POST = await loadPost();
    const res = await POST(blastRequest());
    expect(res.status).toBe(403);
  });

  it("no/invalid session gets 401 (isAdminAuthed pre-check)", async () => {
    adminAuthed = false;
    session = null;

    const POST = await loadPost();
    const res = await POST(blastRequest());
    expect(res.status).toBe(401);
  });

  it("a chapter admin passes the gate (not 401/403)", async () => {
    // Admin flag → SUPER_ADMIN_PERMISSIONS → floor admits → handler runs (mock
    // Resend branch) → 200. The discriminating signal is "not denied".
    adminAuthed = true;
    session = { brother: { id: "boss_1" }, isAdmin: true };

    const POST = await loadPost();
    const res = await POST(blastRequest());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });

  it("an officer holding rushPipeline:write passes the gate (not 401/403)", async () => {
    // Non-admin, but an active assignment whose position grants rushPipeline
    // write. mergePermissions(parsePermissions(...)) yields write on the domain,
    // so guardOfficer admits.
    adminAuthed = true;
    session = { brother: { id: "officer_1" }, isAdmin: false };
    officerAssignments = [
      {
        endDate: null,
        position: {
          active: true,
          permissions: JSON.stringify({
            superAdmin: false,
            domain: { rushPipeline: "write" },
          }),
        },
      },
    ];

    const POST = await loadPost();
    const res = await POST(blastRequest());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });

  it("an officer with only an UNRELATED domain is still 403 (discriminating)", async () => {
    // Holds events:write but NOT rushPipeline — must NOT be admitted to the
    // rush blast. Proves the floor is domain-specific, not "any officer".
    adminAuthed = true;
    session = { brother: { id: "officer_2" }, isAdmin: false };
    officerAssignments = [
      {
        endDate: null,
        position: {
          active: true,
          permissions: JSON.stringify({
            superAdmin: false,
            domain: { events: "write" },
          }),
        },
      },
    ];

    const POST = await loadPost();
    const res = await POST(blastRequest());
    expect(res.status).toBe(403);
  });
});
