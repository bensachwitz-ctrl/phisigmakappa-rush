import { describe, it, expect, beforeEach, vi } from "vitest";

// ── getCurrentBrotherIdAsync — two-cookie resolution (P1 blocker #6) ──────────
// The synchronous getCurrentBrotherId() reads ONLY the admin cookie
// (phisig_admin), so a plain portal member holding only a phisig_portal cookie
// resolved to null and their own self-service routes (mark-read, service-hours,
// expenses, chores-complete, excused-absence) 401'd. getCurrentBrotherIdAsync()
// adds the portal fallback: it must resolve a brother id from EITHER cookie.
//
// This drives the REAL exported helper with REAL signed tokens (admin +
// portal) minted through the shipped signing paths, mocking only the ambient
// next/headers cookie/host seam and the portalUser lookup. That exercises the
// actual dynamic import of lib/portal-auth + getPortalSession() decode.

let adminCookie: string | undefined;
let portalCookie: string | undefined;
let host: string | null = "alpha.greekstack.vercel.app";
let portalUserRow: { brotherId: string | null } | null = null;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === "phisig_admin") return adminCookie ? { value: adminCookie } : undefined;
      if (name === "phisig_portal") return portalCookie ? { value: portalCookie } : undefined;
      return undefined;
    },
    set: () => undefined,
    delete: () => undefined,
  }),
  headers: () => ({
    get: (n: string) => (n.toLowerCase() === "host" ? host : null),
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    portalUser: { findUnique: async () => portalUserRow },
  },
  // Leading-label subdomain: "alpha.greekstack.vercel.app" -> "alpha", apex -> null.
  getSubdomain: (h: string | null) => (h ? h.split(".")[0] : null),
}));

const TEST_SECRET = "test-secret-32-chars-................";

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
  vi.stubEnv("NODE_ENV", "test");
  adminCookie = undefined;
  portalCookie = undefined;
  host = "alpha.greekstack.vercel.app";
  portalUserRow = null;
});

async function loadAuth() {
  return await import("@/lib/auth");
}
async function loadPortal() {
  return await import("@/lib/portal-auth");
}

describe("getCurrentBrotherIdAsync — resolves both cookie types", () => {
  it("resolves the brother id from an admin cookie (phisig_admin)", async () => {
    const { createSessionToken, getCurrentBrotherIdAsync } = await loadAuth();
    adminCookie = createSessionToken("brother_admin", false, "alpha");

    expect(await getCurrentBrotherIdAsync()).toBe("brother_admin");
  });

  it("resolves the brother id from a portal brother session (phisig_portal)", async () => {
    const { getCurrentBrotherIdAsync } = await loadAuth();
    const { signPortalToken } = await loadPortal();
    // No admin cookie — only a valid portal cookie.
    portalCookie = signPortalToken("portaluser_1", "brother");
    portalUserRow = { brotherId: "brother_portal" };

    expect(await getCurrentBrotherIdAsync()).toBe("brother_portal");
  });

  it("returns null when neither cookie is present", async () => {
    const { getCurrentBrotherIdAsync } = await loadAuth();
    expect(await getCurrentBrotherIdAsync()).toBeNull();
  });

  it("ignores a non-brother portal session (alumni cannot self-resolve as a brother)", async () => {
    const { getCurrentBrotherIdAsync } = await loadAuth();
    const { signPortalToken } = await loadPortal();
    portalCookie = signPortalToken("portaluser_2", "alumni");
    portalUserRow = { brotherId: "should_not_be_used" };

    expect(await getCurrentBrotherIdAsync()).toBeNull();
  });

  it("prefers the admin cookie when both are present", async () => {
    const { createSessionToken, getCurrentBrotherIdAsync } = await loadAuth();
    const { signPortalToken } = await loadPortal();
    adminCookie = createSessionToken("brother_admin", true, "alpha");
    portalCookie = signPortalToken("portaluser_1", "brother");
    portalUserRow = { brotherId: "brother_portal" };

    expect(await getCurrentBrotherIdAsync()).toBe("brother_admin");
  });

  it("returns null when a portal session's user has no linked brother", async () => {
    const { getCurrentBrotherIdAsync } = await loadAuth();
    const { signPortalToken } = await loadPortal();
    portalCookie = signPortalToken("portaluser_3", "brother");
    portalUserRow = { brotherId: null };

    expect(await getCurrentBrotherIdAsync()).toBeNull();
  });
});
