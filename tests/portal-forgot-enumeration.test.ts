import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * P1 REGRESSION — reset user-enumeration oracle.
 *
 * app/api/portal/forgot-password used to answer a NOT-YET-ACTIVATED roster email
 * (a Brother / AlumniProfile that has no PortalUser) with a DISTINCT 400 ("your
 * account is not activated yet…"), while a completely unknown email got a neutral
 * 200. That difference let an unauthenticated caller enumerate chapter
 * membership. The fix returns the SAME neutral 200 for both cases. This suite
 * proves an unknown email and a not-activated roster email yield an IDENTICAL
 * response (status + body).
 */

const mocks = vi.hoisted(() => ({
  portalUserFindFirst: vi.fn(),
  brotherFindFirst: vi.fn(),
  alumniFindFirst: vi.fn(),
  checkDbThrottle: vi.fn(),
  recordDbAttempt: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const db = {
    portalUser: { findFirst: mocks.portalUserFindFirst, update: vi.fn() },
    brother: { findFirst: mocks.brotherFindFirst },
    alumniProfile: { findFirst: mocks.alumniFindFirst },
    siteConfig: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return {
    prisma: db,
    centralDb: { tenant: { findUnique: vi.fn() } },
    getTenantClient: () => db,
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkDbThrottle: mocks.checkDbThrottle,
  recordDbAttempt: mocks.recordDbAttempt,
}));

vi.mock("@/lib/client-ip", () => ({ getClientIp: () => "1.2.3.4" }));

vi.mock("@/lib/mobile-cors", () => ({
  mobileCorsHeaders: () => ({}),
  mobilePreflightResponse: () => new Response(null, { status: 204 }),
}));

// These are only reached AFTER a PortalUser is found (past the neutral branch),
// so they are never invoked in these tests — stubbed only so the import resolves.
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email-template", () => ({ renderEmail: () => "", renderEmailText: () => "" }));
vi.mock("@/lib/chapter-identity", () => ({
  getChapterIdentity: vi.fn().mockResolvedValue({ chapterAttribution: "", fraternityShort: "" }),
  chapterIdentityFromCfg: () => ({ chapterAttribution: "", fraternityShort: "" }),
}));
vi.mock("@/lib/site-config", () => ({ getSiteConfig: vi.fn().mockResolvedValue({}) }));

import { POST } from "@/app/api/portal/forgot-password/route";

function forgot(email: string) {
  const req = new Request("https://alpha.greekstack.vercel.app/api/portal/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, role: "brother" }),
  });
  return POST(req);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkDbThrottle.mockResolvedValue({ ok: true });
  mocks.recordDbAttempt.mockResolvedValue(undefined);
  // No PortalUser for either email — the branch under test.
  mocks.portalUserFindFirst.mockResolvedValue(null);
});

describe("forgot-password — no membership-enumeration oracle", () => {
  it("unknown email and not-activated roster email yield an IDENTICAL neutral response", async () => {
    // 1. Completely unknown email: no PortalUser, no Brother.
    mocks.brotherFindFirst.mockResolvedValue(null);
    const resUnknown = await forgot("nobody@nowhere.edu");
    const bodyUnknown = await resUnknown.json();

    // 2. Not-yet-activated roster email: no PortalUser, but a Brother row exists.
    mocks.brotherFindFirst.mockResolvedValue({ id: "b1", email: "roster@school.edu" });
    const resRoster = await forgot("roster@school.edu");
    const bodyRoster = await resRoster.json();

    // Identical status AND body — nothing distinguishes a member from a stranger.
    expect(resUnknown.status).toBe(200);
    expect(resRoster.status).toBe(200);
    expect(bodyUnknown).toEqual(bodyRoster);
    expect(bodyRoster).toEqual({
      ok: true,
      message: "If your email is registered in our portal, a password reset link has been sent.",
    });
  });

  it("the not-activated case is neutral 200, never the old distinct 400", async () => {
    mocks.brotherFindFirst.mockResolvedValue({ id: "b1", email: "roster@school.edu" });
    const res = await forgot("roster@school.edu");
    const body = await res.json();
    expect(res.status).not.toBe(400);
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/not activated/i);
  });
});
