import { describe, it, expect, vi, beforeEach } from "vitest";

// ── P1 #3 — billing/trial lockout is now enforced SERVER-SIDE ─────────────────
// Before this fix the lockout lived ONLY in middleware, keyed off a NON-HttpOnly
// `greekstack_billing_locked` cookie the admin layout set via document.cookie. Delete
// the cookie (or call with a curl/Bearer request that never carries it) and every
// mutation passed — no server route re-checked entitlement. So expired/canceled
// chapters kept full write access.
//
// The fix wires the AUTHORITATIVE entitlement check into the shared officer
// guards (requireOfficerPermission/guardOfficer write-path) and the officer
// Bearer path (authorizeMobileExec). These requests carry NO billing cookie —
// they are refused with 402 purely from the server-side entitlement re-check.
//
// Coverage:
//   1. Real route (POST /api/admin/announcements) → 402 when locked, body skipped.
//   2. guardOfficer: write blocked (402); read never blocked; permission still
//      takes precedence (403 for a non-officer, never leaking billing state).
//   3. authorizeMobileExec (officer Bearer) → 402 when locked.

// Session + officer-assignment seams (read lazily by the mocks below).
let session: { brother: { id: string }; isAdmin: boolean } | null = null;
let officerAssignments: any[] = [];
// The entitlement the mocked getEntitlement returns (set per test).
let entitlementResult: any;

const ENTITLED = {
  entitled: true,
  status: "active",
  trialEndsAt: null,
  daysLeft: null,
  reason: "subscribed",
  plan: "monthly",
};
// entitled:true but CANCELED — proves the guard blocks on real billing state,
// not merely on the fail-open `entitled` flag.
const LOCKED_CANCELED = {
  entitled: true,
  status: "canceled",
  trialEndsAt: null,
  daysLeft: null,
  reason: "canceled",
  plan: "monthly",
};

const { announcementCreate } = vi.hoisted(() => ({
  announcementCreate: vi.fn(async () => ({ id: "a1" })),
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: (k: string) => (k === "host" ? "alpha.greekstack.vercel.app" : null) }),
}));

vi.mock("@/lib/auth", () => ({
  isAdminAuthed: () => true,
  getCurrentSession: async () => session,
  getCurrentBrotherId: () => session?.brother.id ?? null,
  getCurrentBrother: async () => ({ id: session?.brother.id ?? "admin1", name: "Admin" }),
  isAdminRole: () => !!session?.isAdmin,
  isSameOrigin: () => true,
}));
vi.mock("@/lib/notify", () => ({ auditAndNotify: async () => undefined }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    officerAssignment: { findMany: async () => officerAssignments },
    announcement: { create: announcementCreate, findMany: async () => [] },
  },
  centralDb: { tenant: { findUnique: async () => ({ subdomain: "alpha", isActive: true }) } },
  getTenantClient: () => ({
    portalUser: {
      findUnique: async () => ({ id: "pu1", email: "o@x.com", role: "brother", brotherId: "b1", alumniId: null }),
    },
    brother: { findUnique: async () => ({ id: "b1", name: "Officer", position: "President" }) },
  }),
  getSubdomain: () => "alpha",
}));

// Keep the REAL isBillingLockedOut predicate; mock only the DB-hitting lookup.
vi.mock("@/lib/entitlement", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/entitlement")>();
  return { ...actual, getEntitlement: vi.fn(async () => entitlementResult) };
});

vi.mock("@/lib/audit", () => ({ audit: async () => undefined }));
vi.mock("@/lib/portal-auth", () => ({
  verifyPortalTokenForTenant: () => ({ userId: "pu1", role: "brother" }),
}));
vi.mock("@/lib/member-capabilities", () => ({
  computeMemberCapabilities: () => ({ exec: true }),
}));

import { POST as announcementsPost } from "@/app/api/admin/announcements/route";
import { guardOfficer } from "@/lib/permissions";
import { authorizeMobileExec } from "@/lib/mobile-exec-auth";
import { guardElectionRequest } from "@/lib/elections-server";

beforeEach(() => {
  vi.clearAllMocks();
  session = { brother: { id: "admin1" }, isAdmin: true };
  officerAssignments = [];
  entitlementResult = ENTITLED;
});

describe("P1 #3 — billing lockout enforced server-side (no cookie required)", () => {
  it("real route POST /api/admin/announcements → 402 when the chapter is locked; the write body never runs", async () => {
    entitlementResult = LOCKED_CANCELED;
    const req = new Request("https://alpha.greekstack.vercel.app/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ title: "Locked out", body: "should never be created", audience: "ALL" }),
      headers: { "content-type": "application/json" },
    });
    const res = await announcementsPost(req);
    expect(res.status).toBe(402);
    // The mutation body was short-circuited — nothing was written.
    expect(announcementCreate).not.toHaveBeenCalled();
  });

  it("same route is NOT 402 when the chapter is entitled (guard passes)", async () => {
    entitlementResult = ENTITLED;
    const req = new Request("https://alpha.greekstack.vercel.app/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ title: "All good", body: "hello world", audience: "ALL" }),
      headers: { "content-type": "application/json" },
    });
    const res = await announcementsPost(req);
    expect(res.status).not.toBe(402);
  });

  it("guardOfficer WRITE is blocked (402) for a locked chapter", async () => {
    entitlementResult = LOCKED_CANCELED;
    const denied = await guardOfficer("announcements", "write");
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(402);
  });

  it("guardOfficer WRITE passes (null) for an entitled chapter", async () => {
    entitlementResult = ENTITLED;
    const denied = await guardOfficer("announcements", "write");
    expect(denied).toBeNull();
  });

  it("guardOfficer READ is NEVER blocked, even when locked (reads stay available)", async () => {
    entitlementResult = LOCKED_CANCELED;
    const denied = await guardOfficer("announcements", "read");
    expect(denied).toBeNull();
  });

  it("permission takes precedence: a non-officer gets 403 (not 402) even when locked", async () => {
    entitlementResult = LOCKED_CANCELED;
    session = { brother: { id: "member1" }, isAdmin: false };
    officerAssignments = []; // no officer assignments → no write permission
    const denied = await guardOfficer("announcements", "write");
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(403);
  });

  it("officer Bearer path (authorizeMobileExec) → 402 when locked", async () => {
    entitlementResult = LOCKED_CANCELED;
    const req = new Request("https://greekstack.vercel.app/api/mobile/exec/roster", {
      method: "POST",
      headers: { authorization: "Bearer tok" },
    });
    const res = await authorizeMobileExec(req, "alpha");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(402);
  });

  it("officer Bearer path (authorizeMobileExec) → ok when entitled", async () => {
    entitlementResult = ENTITLED;
    const req = new Request("https://greekstack.vercel.app/api/mobile/exec/roster", {
      method: "POST",
      headers: { authorization: "Bearer tok" },
    });
    const res = await authorizeMobileExec(req, "alpha");
    expect(res.ok).toBe(true);
  });

  it("shared elections gate (guardElectionRequest) WRITE → 402 when locked; READ passes", async () => {
    const req = new Request("https://alpha.greekstack.vercel.app/api/admin/elections", {
      method: "POST",
    });
    entitlementResult = LOCKED_CANCELED;
    const write = await guardElectionRequest(req, "write");
    expect(write.ok).toBe(false);
    if (!write.ok) expect(write.status).toBe(402);

    // Reads are never billing-blocked.
    const read = await guardElectionRequest(req, "read");
    expect(read.ok).toBe(true);
  });

  it("shared elections gate WRITE passes when entitled", async () => {
    entitlementResult = ENTITLED;
    const req = new Request("https://alpha.greekstack.vercel.app/api/admin/elections", {
      method: "POST",
    });
    const write = await guardElectionRequest(req, "write");
    expect(write.ok).toBe(true);
  });
});
