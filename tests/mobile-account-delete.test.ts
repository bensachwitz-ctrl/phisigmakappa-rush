import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";

// ── Apple 5.1.1(v): in-app account deletion ──────────────────────────────────
// DELETE /api/mobile/account removes the signed-in member's OWN PortalUser +
// cascades their member record. Auth-required + tenant-scoped: only the account
// the verified token belongs to is ever touched.

const SUB = "usc-psk";

const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockPortalUserFindUnique: vi.fn(),
  mockBrotherFindUnique: vi.fn(),
  mockTxPortalDelete: vi.fn(),
  mockTxBrotherDelete: vi.fn(),
  mockTxAlumniDelete: vi.fn(),
  mockTransaction: vi.fn(),
  mockPortalDelete: vi.fn(),
  mockAuditLogCreate: vi.fn(),
}));

const tenantClient = {
  portalUser: {
    findUnique: mocks.mockPortalUserFindUnique,
    delete: mocks.mockPortalDelete,
  },
  brother: { findUnique: mocks.mockBrotherFindUnique },
  alumniProfile: { findUnique: vi.fn() },
  auditLog: { create: mocks.mockAuditLogCreate },
  // The route runs delete inside $transaction(async (tx) => …). Drive the cb
  // with a tx whose models point at our spies.
  $transaction: mocks.mockTransaction,
};

vi.mock("@/lib/prisma", () => ({
  centralDb: { tenant: { findUnique: mocks.mockTenantFindUnique } },
  getTenantClient: () => tenantClient,
  getSubdomain: (host: string | null) => host?.split(".")[0] || null,
}));

import { DELETE as deleteAccount } from "@/app/api/mobile/account/route";

const TEST_SECRET = "test-portal-secret-32-chars-.........";

function deleteReq(token?: string, withBody = true) {
  const t = token ?? signPortalTokenForTenant("user-1", "brother", SUB);
  return new Request(`https://greekstack.vercel.app/api/mobile/account`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
    ...(withBody ? { body: JSON.stringify({ subdomain: SUB }) } : {}),
  });
}

describe("DELETE /api/mobile/account — self-service account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
    vi.stubEnv("NODE_ENV", "test");
    mocks.mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: SUB, isActive: true });
    mocks.mockAuditLogCreate.mockResolvedValue({});
    // Default: the transaction executes its callback with a tx pointing at spies.
    mocks.mockTransaction.mockImplementation(async (cb: any) =>
      cb({
        portalUser: { delete: mocks.mockTxPortalDelete },
        brother: { delete: mocks.mockTxBrotherDelete },
        alumniProfile: { delete: mocks.mockTxAlumniDelete },
      }),
    );
  });

  it("401s without a token", async () => {
    const req = new Request(`https://greekstack.vercel.app/api/mobile/account`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: SUB }),
    });
    const res = await deleteAccount(req);
    expect(res.status).toBe(401);
  });

  it("deletes the member's PortalUser + cascades their Brother record", async () => {
    mocks.mockPortalUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "me@usc.edu",
      role: "brother",
      brotherId: "brother-1",
      alumniId: null,
    });
    mocks.mockBrotherFindUnique.mockResolvedValue({ name: "Me Member" });

    const res = await deleteAccount(deleteReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(true);
    expect(body.memberRecordDeleted).toBe(true);
    // PortalUser + the Brother record both deleted (cascade) in the transaction.
    expect(mocks.mockTxPortalDelete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(mocks.mockTxBrotherDelete).toHaveBeenCalledWith({ where: { id: "brother-1" } });
  });

  it("is idempotent — a missing PortalUser returns ok (already gone)", async () => {
    mocks.mockPortalUserFindUnique.mockResolvedValue(null);
    const res = await deleteAccount(deleteReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyGone).toBe(true);
    expect(mocks.mockTransaction).not.toHaveBeenCalled();
  });

  it("falls back to PortalUser-only delete when the member-record delete is FK-blocked", async () => {
    mocks.mockPortalUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alum@usc.edu",
      role: "alumni",
      brotherId: null,
      alumniId: "alum-1",
    });
    // Transaction throws (e.g. alumni has non-cascading donations) → route falls
    // back to deleting JUST the PortalUser so the account/login is still removed.
    mocks.mockTransaction.mockRejectedValue(Object.assign(new Error("FK"), { code: "P2003" }));
    mocks.mockPortalDelete.mockResolvedValue({ id: "user-1" });

    const res = await deleteAccount(deleteReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.memberRecordDeleted).toBe(false);
    expect(mocks.mockPortalDelete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("rejects a token minted for ANOTHER chapter (tenant-bound)", async () => {
    const foreign = signPortalTokenForTenant("user-1", "brother", "other-chapter");
    const res = await deleteAccount(deleteReq(foreign));
    expect(res.status).toBe(401);
    expect(mocks.mockTransaction).not.toHaveBeenCalled();
  });
});
