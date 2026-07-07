// P0 #1 regression — privilege escalation via self-edit on PATCH /api/admin/brothers.
//
// A plain member (valid tenant cookie, NO brothers:write, editing their OWN id)
// must NOT be able to set authz-sensitive fields on their own row:
//   • position:"President" — trusted by lib/mobile-exec-auth (isOfficerPosition)
//     to unlock /api/mobile/exec/* (roster/reset/announce/dues-reminder).
//   • status:"INITIATE"   — unlocks initiate-only ritual documents.
// They MUST still be able to edit benign profile fields (name, bio, ...).
//
// The self-edit branch used a DENYLIST (role/duesPaid/serviceHours) that missed
// position + status. This test drives the real PATCH handler and asserts the
// exact `data` written to prisma.brother.update: benign fields pass, sensitive
// fields are stripped. Red on the denylist code, green on the allowlist fix.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockIsAdminAuthed: vi.fn(),
  mockIsAdminRole: vi.fn(),
  mockGetCurrentBrotherId: vi.fn(),
  mockGetPerms: vi.fn(),
  mockHasPermission: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brother: {
      findUnique: mocks.mockFindUnique,
      update: mocks.mockUpdate,
    },
    duesPayment: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    memberStatusChange: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  isAdminAuthed: mocks.mockIsAdminAuthed,
  isAdminRole: mocks.mockIsAdminRole,
  getCurrentBrotherId: mocks.mockGetCurrentBrotherId,
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/lib/site-config", () => ({ getSiteConfig: vi.fn().mockResolvedValue({}) }));

vi.mock("@/lib/permissions", () => ({
  getCurrentOfficerPermissions: mocks.mockGetPerms,
  hasPermission: mocks.mockHasPermission,
  guardOfficer: vi.fn(),
  guardOfficerOrAdmin: vi.fn(),
}));

import { PATCH } from "@/app/api/admin/brothers/route";

const ME = "me-123";

function patchReq(body: Record<string, unknown>): Request {
  return new Request("https://phisig.greekstack.vercel.app/api/admin/brothers", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Return the `data` object that was passed to prisma.brother.update. */
function capturedUpdateData(): Record<string, unknown> {
  const call = mocks.mockUpdate.mock.calls.at(-1);
  return (call?.[0]?.data ?? {}) as Record<string, unknown>;
}

describe("PATCH /api/admin/brothers — self-edit privilege escalation (P0 #1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Plain member: authed to the tenant, but NOT a super-admin and holds no
    // brothers:write / academic:write permission. Editing their OWN row.
    mocks.mockIsAdminAuthed.mockReturnValue(true);
    mocks.mockIsAdminRole.mockReturnValue(false);
    mocks.mockGetCurrentBrotherId.mockReturnValue(ME);
    mocks.mockGetPerms.mockResolvedValue({});
    mocks.mockHasPermission.mockReturnValue(false); // no brothers:write, no academic:write
    mocks.mockFindUnique.mockResolvedValue({
      duesPaid: false,
      role: "MEMBER",
      position: "Member",
      name: "Old Name",
      status: "ACTIVE",
    });
    mocks.mockUpdate.mockImplementation(async ({ data }: any) => ({
      id: ME,
      name: data.name ?? "Old Name",
      ...data,
    }));
  });

  it("blocks a member from self-elevating position (mobile-exec RBAC) and status (ritual docs)", async () => {
    const res = await PATCH(
      patchReq({
        id: ME,
        name: "Legit New Name",
        bio: "my new bio",
        position: "President", // ATTEMPTED privilege escalation → mobile exec
        status: "INITIATE", // ATTEMPTED escalation → initiate-only ritual docs
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    const data = capturedUpdateData();
    // Sensitive authz fields must be stripped before the DB write.
    expect(data.position).toBeUndefined();
    expect(data.status).toBeUndefined();
    // Benign profile fields must still be applied.
    expect(data.name).toBe("Legit New Name");
    expect(data.bio).toBe("my new bio");
  });

  it("also strips role / duesPaid / serviceHours on self-edit (unchanged behavior)", async () => {
    const res = await PATCH(
      patchReq({
        id: ME,
        name: "Still Me",
        role: "ADMIN",
        duesPaid: true,
        serviceHours: 999,
      }),
    );

    expect(res.status).toBe(200);
    const data = capturedUpdateData();
    expect(data.role).toBeUndefined();
    expect(data.duesPaid).toBeUndefined();
    expect(data.serviceHours).toBeUndefined();
    expect(data.name).toBe("Still Me");
  });

  it("still allows studyHours/academicStanding self-edit ONLY with academic:write", async () => {
    // Grant academic:write for this case; brothers:write stays false.
    mocks.mockHasPermission.mockImplementation(
      (_perms: unknown, domain: string, action: string) =>
        domain === "academic" && action === "write",
    );

    const res = await PATCH(
      patchReq({
        id: ME,
        studyHours: 12,
        academicStanding: "Good",
        position: "Treasurer", // still must be stripped
      }),
    );

    expect(res.status).toBe(200);
    const data = capturedUpdateData();
    expect(data.studyHours).toBe(12);
    expect(data.academicStanding).toBe("Good");
    expect(data.position).toBeUndefined();
  });
});
