import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";

// ── FINDING 3 (HIGH): mobile Edit-Profile must persist for real members ───────
// The mobile Edit-Profile form used to only mutate local React state and toast
// "Profile updated successfully!" with no backend write. This pins the new real
// endpoint POST /api/mobile/account: tenant-bound token auth, persists ONLY the
// safe self-editable fields, and NEVER writes role/duesPaid/position/admin flags.

const mocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  portalUserFindUnique: vi.fn(),
  brotherUpdate: vi.fn(),
  alumniUpdate: vi.fn(),
  auditCreate: vi.fn(async () => ({})),
}));

const tenantClient = {
  portalUser: { findUnique: mocks.portalUserFindUnique },
  brother: { update: mocks.brotherUpdate },
  alumniProfile: { update: mocks.alumniUpdate },
  auditLog: { create: mocks.auditCreate },
} as any;

vi.mock("@/lib/prisma", () => ({
  centralDb: { tenant: { findUnique: mocks.tenantFindUnique } },
  getTenantClient: () => tenantClient,
}));

vi.mock("@/lib/mobile-cors", () => ({
  mobileCorsHeaders: () => ({}),
  mobilePreflightResponse: () => new Response(null, { status: 204 }),
}));

// auditMobileExec writes via the tenant db — stub to a no-op so the test focuses
// on the profile write.
vi.mock("@/lib/mobile-exec-auth", () => ({ auditMobileExec: vi.fn(async () => {}) }));

import { POST } from "@/app/api/mobile/account/route";

const TEST_SECRET = "test-portal-secret-32-chars-.........";

function req(body: unknown, token?: string) {
  return new Request("https://greekstack.vercel.app/api/mobile/account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
  vi.clearAllMocks();
  mocks.tenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "usc", isActive: true });
});

describe("POST /api/mobile/account (profile update)", () => {
  it("401 without a token", async () => {
    const res = await POST(req({ subdomain: "usc", phone: "123" }));
    expect(res.status).toBe(401);
  });

  it("400 without a subdomain", async () => {
    const token = signPortalTokenForTenant("u1", "brother", "usc");
    const res = await POST(req({ phone: "123" }, token));
    expect(res.status).toBe(400);
  });

  it("brother: persists ONLY safe fields and NEVER role/duesPaid/position", async () => {
    const token = signPortalTokenForTenant("u1", "brother", "usc");
    mocks.portalUserFindUnique.mockResolvedValue({ id: "u1", role: "brother", brotherId: "b1" });
    mocks.brotherUpdate.mockResolvedValue({ id: "b1", name: "Marcus", phone: "555" });

    const res = await POST(
      req(
        {
          subdomain: "usc",
          phone: "555",
          major: "CS",
          // Hostile fields that MUST be ignored:
          role: "ADMIN",
          duesPaid: true,
          position: "President",
          serviceHours: 999,
        },
        token,
      ),
    );
    expect(res.status).toBe(200);
    expect(mocks.brotherUpdate).toHaveBeenCalledTimes(1);
    const arg = mocks.brotherUpdate.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "b1" });
    // Safe fields present:
    expect(arg.data.phone).toBe("555");
    expect(arg.data.major).toBe("CS");
    // Privileged fields absent:
    expect(arg.data).not.toHaveProperty("role");
    expect(arg.data).not.toHaveProperty("duesPaid");
    expect(arg.data).not.toHaveProperty("position");
    expect(arg.data).not.toHaveProperty("serviceHours");
  });

  it("alumni: persists alumni-editable fields on the AlumniProfile record", async () => {
    const token = signPortalTokenForTenant("u2", "alumni", "usc");
    mocks.portalUserFindUnique.mockResolvedValue({ id: "u2", role: "alumni", alumniId: "a1" });
    mocks.alumniUpdate.mockResolvedValue({ id: "a1", fullName: "Seneca" });

    const res = await POST(
      req({ subdomain: "usc", employer: "Acme", city: "Columbia", role: "ADMIN" }, token),
    );
    expect(res.status).toBe(200);
    expect(mocks.alumniUpdate).toHaveBeenCalledTimes(1);
    const arg = mocks.alumniUpdate.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "a1" });
    expect(arg.data.employer).toBe("Acme");
    expect(arg.data.city).toBe("Columbia");
    expect(arg.data).not.toHaveProperty("role");
    // A brother token can never reach the alumni branch and vice-versa.
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });
});
