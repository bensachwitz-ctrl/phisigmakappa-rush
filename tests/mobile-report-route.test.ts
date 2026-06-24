import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";

// ── iOS Guideline 1.2: in-app Report + Block for cross-member UGC ─────────────
// POST /api/mobile/report is the wired moderation path the bundled app uses to
// REPORT objectionable content + record a member BLOCK. It must:
//   (a) be TOKEN-BOUND + self-only — no token → 401; a token minted for ANOTHER
//       chapter must not verify (tenant isolation),
//   (b) record the report (an immutable AuditLog row), AND
//   (c) NOTIFY chapter admins through the EXISTING notification path (an
//       EBOARD-audience Announcement the web /admin surface already lists).
// Zero new Prisma model — the report rides the AuditLog + Announcement tables.

const SUB = "usc-psk";

const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockPortalUserFindUnique: vi.fn(),
  mockBrotherFindUnique: vi.fn(),
  mockAlumniFindUnique: vi.fn(),
  mockAnnouncementCreate: vi.fn(),
  mockAuditLogCreate: vi.fn(),
}));

const tenantClient = {
  portalUser: { findUnique: mocks.mockPortalUserFindUnique },
  brother: { findUnique: mocks.mockBrotherFindUnique },
  alumniProfile: { findUnique: mocks.mockAlumniFindUnique },
  announcement: { create: mocks.mockAnnouncementCreate },
  auditLog: { create: mocks.mockAuditLogCreate },
};

vi.mock("@/lib/prisma", () => ({
  centralDb: { tenant: { findUnique: mocks.mockTenantFindUnique } },
  getTenantClient: () => tenantClient,
  getSubdomain: (host: string | null) => host?.split(".")[0] || null,
}));

import { POST as reportPOST } from "@/app/api/mobile/report/route";

const TEST_SECRET = "test-portal-secret-32-chars-.........";

function primeMember(role: "brother" | "alumni" = "brother") {
  mocks.mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: SUB, isActive: true });
  mocks.mockPortalUserFindUnique.mockResolvedValue({
    id: "user-1",
    email: "member@usc.edu",
    role,
    brotherId: role === "brother" ? "me-1" : null,
    alumniId: role === "alumni" ? "alum-1" : null,
  });
  mocks.mockBrotherFindUnique.mockResolvedValue({ name: "Reporter Member" });
  mocks.mockAlumniFindUnique.mockResolvedValue({ fullName: "Reporter Alum" });
  mocks.mockAnnouncementCreate.mockResolvedValue({ id: "ann-1" });
  mocks.mockAuditLogCreate.mockResolvedValue({});
}

function reportReq(body: any, opts?: { token?: string; noAuth?: boolean }) {
  const token = opts?.token ?? signPortalTokenForTenant("user-1", "brother", SUB);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (!opts?.noAuth) headers.authorization = `Bearer ${token}`;
  return new Request("https://greekstack.vercel.app/api/mobile/report", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/mobile/report — token-bound moderation (Apple 1.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
    vi.stubEnv("NODE_ENV", "test");
  });

  it("401s when NO token is presented — no audit, no admin alert", async () => {
    primeMember();
    const res = await reportPOST(
      reportReq({ subdomain: SUB, kind: "report", targetType: "announcement", targetId: "a1", targetName: "Bad post" }, { noAuth: true }),
    );
    expect(res.status).toBe(401);
    expect(mocks.mockAuditLogCreate).not.toHaveBeenCalled();
    expect(mocks.mockAnnouncementCreate).not.toHaveBeenCalled();
  });

  it("401s a token minted for ANOTHER chapter (tenant-bound isolation)", async () => {
    primeMember();
    const foreign = signPortalTokenForTenant("user-1", "brother", "other-chapter");
    const res = await reportPOST(
      reportReq(
        { subdomain: SUB, kind: "report", targetType: "member", targetId: "m9", targetName: "Someone" },
        { token: foreign },
      ),
    );
    expect(res.status).toBe(401);
    expect(mocks.mockAnnouncementCreate).not.toHaveBeenCalled();
  });

  it("records a report AND notifies admins via an EBOARD announcement", async () => {
    primeMember();
    const res = await reportPOST(
      reportReq({ subdomain: SUB, kind: "report", targetType: "announcement", targetId: "a1", targetName: "Bad post", reason: "spam" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.notified).toBe(true);
    // (b) immutable forensic record
    expect(mocks.mockAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockAuditLogCreate.mock.calls[0][0].data.action).toBe("CONTENT_REPORTED");
    // (c) admin notification through the EXISTING path — EBOARD-scoped, sent.
    expect(mocks.mockAnnouncementCreate).toHaveBeenCalledTimes(1);
    const ann = mocks.mockAnnouncementCreate.mock.calls[0][0].data;
    expect(ann.audience).toBe("EBOARD");
    expect(ann.status).toBe("sent");
    // Never authored by the reporter (system alert), never named to members.
    expect(ann.authorId).toBeNull();
  });

  it("records a member BLOCK and notifies admins", async () => {
    primeMember();
    const res = await reportPOST(
      reportReq({ subdomain: SUB, kind: "block", targetType: "member", targetId: "m9", targetName: "Bad Actor" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.mockAuditLogCreate.mock.calls[0][0].data.action).toBe("MEMBER_BLOCKED");
    expect(mocks.mockAnnouncementCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockAnnouncementCreate.mock.calls[0][0].data.audience).toBe("EBOARD");
  });

  it("400s an unknown report kind — no writes", async () => {
    primeMember();
    const res = await reportPOST(reportReq({ subdomain: SUB, kind: "nuke", targetId: "x" }));
    expect(res.status).toBe(400);
    expect(mocks.mockAuditLogCreate).not.toHaveBeenCalled();
    expect(mocks.mockAnnouncementCreate).not.toHaveBeenCalled();
  });

  it("400s a report with no target — nothing to moderate", async () => {
    primeMember();
    const res = await reportPOST(reportReq({ subdomain: SUB, kind: "report", targetType: "announcement" }));
    expect(res.status).toBe(400);
    expect(mocks.mockAnnouncementCreate).not.toHaveBeenCalled();
  });
});
