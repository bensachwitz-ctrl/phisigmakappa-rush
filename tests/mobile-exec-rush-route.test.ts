import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";

// ── EXEC WRITE BACKEND: PNM / rush status management ─────────────────────────
// /api/mobile/exec/rush must, exactly like the other mobile exec routes:
//   (a) recompute capabilities.exec SERVER-SIDE from the verified session role +
//       the caller's REAL admin-set Brother.position → a non-officer (plain
//       member OR alumni token) gets 403 and NO write happens, and
//   (b) PERSIST a single Rush.status update for a real officer.
// It shares lib/mobile-exec-auth with the roster/announce/reset routes, so the
// same tenant-bound + officer gate applies.

const SUB = "usc-psk";

const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockPortalUserFindUnique: vi.fn(),
  mockBrotherFindUnique: vi.fn(),
  mockRushFindUnique: vi.fn(),
  mockRushUpdate: vi.fn(),
  mockRushFindMany: vi.fn(),
  mockAuditLogCreate: vi.fn(),
}));

const tenantClient = {
  portalUser: { findUnique: mocks.mockPortalUserFindUnique },
  brother: { findUnique: mocks.mockBrotherFindUnique },
  rush: {
    findUnique: mocks.mockRushFindUnique,
    update: mocks.mockRushUpdate,
    findMany: mocks.mockRushFindMany,
  },
  auditLog: { create: mocks.mockAuditLogCreate },
};

vi.mock("@/lib/prisma", () => ({
  centralDb: { tenant: { findUnique: mocks.mockTenantFindUnique } },
  getTenantClient: () => tenantClient,
  getSubdomain: (host: string | null) => host?.split(".")[0] || null,
}));

import { POST as rushPOST } from "@/app/api/mobile/exec/rush/route";

const TEST_SECRET = "test-portal-secret-32-chars-.........";

function prime(position: string | null, role: "brother" | "alumni" = "brother") {
  mocks.mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: SUB, isActive: true });
  mocks.mockPortalUserFindUnique.mockResolvedValue({
    id: "user-1",
    email: "prez@usc.edu",
    role,
    brotherId: role === "brother" ? "officer-1" : null,
    alumniId: role === "alumni" ? "alum-1" : null,
  });
  mocks.mockBrotherFindUnique.mockImplementation(({ where }: any) => {
    if (where.id === "officer-1") return Promise.resolve({ id: "officer-1", name: "Pat Prez", position });
    return Promise.resolve(null);
  });
  mocks.mockRushFindUnique.mockResolvedValue({ id: "pnm-1", name: "Rushee One", status: "ACTIVE" });
  mocks.mockRushUpdate.mockResolvedValue({ id: "pnm-1", name: "Rushee One", status: "BID_EXTENDED", year: null, major: null });
  mocks.mockRushFindMany.mockResolvedValue([
    { id: "pnm-1", name: "Rushee One", status: "BID_EXTENDED", year: null, major: null, createdAt: new Date() },
  ]);
  mocks.mockAuditLogCreate.mockResolvedValue({});
}

function req(body: any) {
  const token = signPortalTokenForTenant("user-1", "brother", SUB);
  return new Request(`https://greekstack.vercel.app/api/mobile/exec/rush`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("mobile exec rush route — officer gate + persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
    vi.stubEnv("NODE_ENV", "test");
  });

  it("403s a NON-officer (plain active member) — no write", async () => {
    prime("Active Member");
    const res = await rushPOST(req({ subdomain: SUB, pnmId: "pnm-1", status: "BID_EXTENDED" }));
    expect(res.status).toBe(403);
    expect(mocks.mockRushUpdate).not.toHaveBeenCalled();
  });

  it("403s an ALUMNI token even with an officer-looking position — no write", async () => {
    prime("President", "alumni");
    const res = await rushPOST(req({ subdomain: SUB, pnmId: "pnm-1", status: "BID_EXTENDED" }));
    expect(res.status).toBe(403);
    expect(mocks.mockRushUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid status — no write", async () => {
    prime("President");
    const res = await rushPOST(req({ subdomain: SUB, pnmId: "pnm-1", status: "NOT_A_STATUS" }));
    expect(res.status).toBe(400);
    expect(mocks.mockRushUpdate).not.toHaveBeenCalled();
  });

  it("PERSISTS a status advance for an officer (President)", async () => {
    prime("President");
    const res = await rushPOST(req({ subdomain: SUB, pnmId: "pnm-1", status: "BID_EXTENDED" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.mockRushUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.mockRushUpdate.mock.calls[0][0].where.id).toBe("pnm-1");
    expect(mocks.mockRushUpdate.mock.calls[0][0].data.status).toBe("BID_EXTENDED");
    expect(mocks.mockAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(Array.isArray(body.pnms)).toBe(true);
  });

  it("404s when the PNM does not exist — no update", async () => {
    prime("Treasurer");
    mocks.mockRushFindUnique.mockResolvedValueOnce(null);
    const res = await rushPOST(req({ subdomain: SUB, pnmId: "ghost", status: "DROPPED" }));
    expect(res.status).toBe(404);
    expect(mocks.mockRushUpdate).not.toHaveBeenCalled();
  });

  it("rejects a token minted for ANOTHER chapter (tenant-bound)", async () => {
    prime("President");
    const foreignToken = signPortalTokenForTenant("user-1", "brother", "other-chapter");
    const r = new Request(`https://greekstack.vercel.app/api/mobile/exec/rush`, {
      method: "POST",
      headers: { authorization: `Bearer ${foreignToken}`, "content-type": "application/json" },
      body: JSON.stringify({ subdomain: SUB, pnmId: "pnm-1", status: "BID_EXTENDED" }),
    });
    const res = await rushPOST(r);
    expect(res.status).toBe(401);
    expect(mocks.mockRushUpdate).not.toHaveBeenCalled();
  });
});
