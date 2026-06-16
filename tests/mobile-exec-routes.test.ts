import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";

// ── Council blocker: EXEC WRITE BACKENDS ─────────────────────────────────────
// /api/mobile/exec/{roster,announce} must:
//   (a) recompute capabilities.exec SERVER-SIDE from the verified session role +
//       the caller's REAL admin-set Brother.position → a non-officer gets 403, and
//   (b) PERSIST for an officer (roster add/remove writes Brother rows; announce
//       writes an Announcement row).
// The gate is shared (lib/mobile-exec-auth) so proving it on these two routes
// covers the reset route's identical gate too.

const SUB = "usc-psk";

const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockPortalUserFindUnique: vi.fn(),
  mockBrotherFindUnique: vi.fn(),
  mockBrotherCreate: vi.fn(),
  mockBrotherDelete: vi.fn(),
  mockAnnouncementCreate: vi.fn(),
  mockAuditLogCreate: vi.fn(),
}));

const tenantClient = {
  portalUser: { findUnique: mocks.mockPortalUserFindUnique },
  brother: {
    findUnique: mocks.mockBrotherFindUnique,
    create: mocks.mockBrotherCreate,
    delete: mocks.mockBrotherDelete,
  },
  announcement: { create: mocks.mockAnnouncementCreate },
  auditLog: { create: mocks.mockAuditLogCreate },
};

vi.mock("@/lib/prisma", () => ({
  centralDb: { tenant: { findUnique: mocks.mockTenantFindUnique } },
  getTenantClient: () => tenantClient,
  getSubdomain: (host: string | null) => host?.split(".")[0] || null,
}));

import { POST as rosterPOST } from "@/app/api/mobile/exec/roster/route";
import { POST as announcePOST } from "@/app/api/mobile/exec/announce/route";

const TEST_SECRET = "test-portal-secret-32-chars-.........";

function primeOfficer(position: string | null, role: "brother" | "alumni" = "brother") {
  mocks.mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: SUB, isActive: true });
  mocks.mockPortalUserFindUnique.mockResolvedValue({
    id: "user-1",
    email: "prez@usc.edu",
    role,
    brotherId: role === "brother" ? "officer-1" : null,
    alumniId: role === "alumni" ? "alum-1" : null,
  });
  // The caller's REAL Brother row (admin-set position) — this is what the gate
  // recomputes exec from.
  mocks.mockBrotherFindUnique.mockImplementation(({ where }: any) => {
    if (where.id === "officer-1") {
      return Promise.resolve({ id: "officer-1", name: "Pat Prez", position });
    }
    // The remove-target lookup.
    if (where.id === "victim-1") {
      return Promise.resolve({ id: "victim-1", name: "Old Member", position: "Active Member" });
    }
    return Promise.resolve(null);
  });
  mocks.mockAuditLogCreate.mockResolvedValue({});
}

function execReq(path: string, body: any) {
  const token = signPortalTokenForTenant("user-1", "brother", SUB);
  return new Request(`https://greekstack.vercel.app${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("mobile exec routes — officer gate + persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
    vi.stubEnv("NODE_ENV", "test");
  });

  it("403s a NON-officer (plain active member) on roster add — no write", async () => {
    primeOfficer("Active Member");
    const res = await rosterPOST(execReq("/api/mobile/exec/roster", { subdomain: SUB, action: "add", name: "New Guy" }));
    expect(res.status).toBe(403);
    expect(mocks.mockBrotherCreate).not.toHaveBeenCalled();
  });

  it("403s an ALUMNI token even with an officer-looking position — no write", async () => {
    primeOfficer("President", "alumni");
    const res = await announcePOST(execReq("/api/mobile/exec/announce", { subdomain: SUB, title: "Hi", body: "Body here" }));
    expect(res.status).toBe(403);
    expect(mocks.mockAnnouncementCreate).not.toHaveBeenCalled();
  });

  it("PERSISTS a roster ADD for an officer (President)", async () => {
    primeOfficer("President");
    mocks.mockBrotherCreate.mockResolvedValue({ id: "new-1", name: "New Guy", position: null });
    const res = await rosterPOST(
      execReq("/api/mobile/exec/roster", { subdomain: SUB, action: "add", name: "New Guy", email: "new@usc.edu" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.mockBrotherCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockBrotherCreate.mock.calls[0][0].data.name).toBe("New Guy");
    expect(mocks.mockBrotherCreate.mock.calls[0][0].data.status).toBe("ACTIVE");
    // An audit row is written for the action.
    expect(mocks.mockAuditLogCreate).toHaveBeenCalledTimes(1);
  });

  it("PERSISTS a roster REMOVE for an officer (Treasurer)", async () => {
    primeOfficer("Treasurer");
    mocks.mockBrotherDelete.mockResolvedValue({ id: "victim-1" });
    const res = await rosterPOST(
      execReq("/api/mobile/exec/roster", { subdomain: SUB, action: "remove", brotherId: "victim-1" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.mockBrotherDelete).toHaveBeenCalledTimes(1);
    expect(mocks.mockBrotherDelete.mock.calls[0][0].where.id).toBe("victim-1");
  });

  // ── CONTRACT INTEGRATION: the REAL client payload shape ──────────────────────
  // The bundled shell (mobile-shell/index.html) and MobileAppClient.tsx BOTH POST
  //   { action: "remove", roster, memberId }
  // — NOT { brotherId }. The prior test above hand-sends `brotherId`, which masked
  // a contract bug where the server only read body.brotherId → every real remove
  // 400'd "brotherId is required". This asserts the server honors `memberId` so
  // the actual client payload persists the delete.
  it("PERSISTS a remove when the client sends `memberId` (real shell/MobileAppClient payload)", async () => {
    primeOfficer("President");
    mocks.mockBrotherDelete.mockResolvedValue({ id: "victim-1" });
    // The exact body shape the shipped clients send (roster kind + memberId).
    const res = await rosterPOST(
      execReq("/api/mobile/exec/roster", {
        subdomain: SUB,
        action: "remove",
        roster: "actives",
        memberId: "victim-1",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.mockBrotherDelete).toHaveBeenCalledTimes(1);
    expect(mocks.mockBrotherDelete.mock.calls[0][0].where.id).toBe("victim-1");
  });

  it("blocks an officer from removing their OWN row when sent as `memberId`", async () => {
    // The self-delete guard must also key off the resolved id, not just brotherId.
    primeOfficer("President");
    const res = await rosterPOST(
      execReq("/api/mobile/exec/roster", {
        subdomain: SUB,
        action: "remove",
        roster: "actives",
        memberId: "officer-1",
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.mockBrotherDelete).not.toHaveBeenCalled();
  });

  it("blocks an officer from removing their OWN row", async () => {
    primeOfficer("President");
    const res = await rosterPOST(
      execReq("/api/mobile/exec/roster", { subdomain: SUB, action: "remove", brotherId: "officer-1" }),
    );
    expect(res.status).toBe(400);
    expect(mocks.mockBrotherDelete).not.toHaveBeenCalled();
  });

  it("PERSISTS an announcement for an officer (Recruitment Chair)", async () => {
    primeOfficer("Recruitment Chair");
    mocks.mockAnnouncementCreate.mockResolvedValue({
      id: "ann-1",
      title: "Chapter BBQ",
      body: "Saturday at the house",
      audience: "ALL",
      pinned: false,
      createdAt: new Date(),
      author: { name: "Pat Prez", position: "Recruitment Chair" },
    });
    const res = await announcePOST(
      execReq("/api/mobile/exec/announce", { subdomain: SUB, title: "Chapter BBQ", body: "Saturday at the house" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.mockAnnouncementCreate).toHaveBeenCalledTimes(1);
    const data = mocks.mockAnnouncementCreate.mock.calls[0][0].data;
    expect(data.status).toBe("sent");
    expect(data.authorId).toBe("officer-1");
    expect(data.audience).toBe("ALL");
  });

  it("rejects a token minted for ANOTHER chapter (tenant-bound)", async () => {
    primeOfficer("President");
    // Token signed for a DIFFERENT subdomain must not verify against SUB.
    const foreignToken = signPortalTokenForTenant("user-1", "brother", "other-chapter");
    const req = new Request(`https://greekstack.vercel.app/api/mobile/exec/roster`, {
      method: "POST",
      headers: { authorization: `Bearer ${foreignToken}`, "content-type": "application/json" },
      body: JSON.stringify({ subdomain: SUB, action: "add", name: "X" }),
    });
    const res = await rosterPOST(req);
    expect(res.status).toBe(401);
    expect(mocks.mockBrotherCreate).not.toHaveBeenCalled();
  });
});
