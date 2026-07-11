import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * P1 #1 — unverified self-serve alumni PII exposure.
 *
 * A self-serve alumni registration used to instantly receive an `alumni` session
 * that could read the ENTIRE active-brother roster (email/phone) and every active
 * PNM's contact info — unauthenticated PII harvesting. The fix: a self-serve
 * sign-up (no invite proof) now gets NO session — it must verify its email first —
 * and must supply data-use consent. An invite-proven sign-up (chapter vouched) is
 * still logged in immediately.
 *
 * These tests pin the security contract at the route boundary: NO cookie for a
 * self-serve sign-up, consent required, cookie only for the invite-proven path.
 */

const mocks = vi.hoisted(() => ({
  portalUserFindUnique: vi.fn(),
  portalUserCreate: vi.fn(),
  portalUserUpdate: vi.fn(),
  alumniInviteFindUnique: vi.fn(),
  alumniInviteUpdate: vi.fn(),
  alumniProfileFindFirst: vi.fn(),
  alumniProfileFindUnique: vi.fn(),
  alumniProfileCreate: vi.fn(),
  alumniProfileUpdate: vi.fn(),
  setPortalCookie: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    portalUser: {
      findUnique: mocks.portalUserFindUnique,
      create: mocks.portalUserCreate,
      update: mocks.portalUserUpdate,
    },
    alumniInvite: {
      findUnique: mocks.alumniInviteFindUnique,
      update: mocks.alumniInviteUpdate,
    },
    alumniProfile: {
      findFirst: mocks.alumniProfileFindFirst,
      findUnique: mocks.alumniProfileFindUnique,
      create: mocks.alumniProfileCreate,
      update: mocks.alumniProfileUpdate,
    },
  },
}));

vi.mock("@/lib/password", () => ({ hashPassword: (pw: string) => `hashed:${pw}` }));
vi.mock("@/lib/portal-auth", () => ({ setPortalCookie: mocks.setPortalCookie }));
vi.mock("@/lib/notify", () => ({
  auditAndNotify: vi.fn().mockResolvedValue(undefined),
  actorFromRequest: vi.fn().mockReturnValue({ name: "x", role: "alumni" }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/email-template", () => ({
  renderEmail: () => "<html></html>",
  renderEmailText: () => "text",
}));
vi.mock("@/lib/chapter-identity", () => ({
  getChapterIdentity: vi.fn().mockResolvedValue({ fraternityName: "Phi Sigma Kappa" }),
}));
vi.mock("@/lib/site-config", () => ({
  getSiteConfig: vi.fn().mockResolvedValue({ "brand.primaryHex": "#7a0019" }),
}));

import { POST } from "@/app/api/portal/alumni/register/route";

function register(body: Record<string, unknown>) {
  return POST(
    new Request("https://alpha.greekstack.vercel.app/api/portal/alumni/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const baseBody = {
  fullName: "Jane Alum",
  email: "jane@example.com",
  password: "password123",
  graduationYear: 2018,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.portalUserFindUnique.mockResolvedValue(null); // no existing login
  mocks.alumniProfileFindFirst.mockResolvedValue(null); // no existing profile
  mocks.alumniInviteFindUnique.mockResolvedValue(null); // no invite by default
  mocks.alumniProfileCreate.mockResolvedValue({ id: "alum-1" });
  mocks.alumniProfileUpdate.mockResolvedValue({ id: "alum-1" });
  mocks.portalUserCreate.mockResolvedValue({ id: "pu-1", email: "jane@example.com", role: "alumni" });
  mocks.portalUserUpdate.mockResolvedValue({ id: "pu-1" });
  mocks.alumniInviteUpdate.mockResolvedValue({});
  mocks.sendEmail.mockResolvedValue({ ok: true });
});

describe("self-serve alumni registration — no session until verified", () => {
  it("issues NO alumni cookie and returns pendingVerification for a consented self-serve signup", async () => {
    const res = await register({ ...baseBody, agreedToDataUse: true });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.pendingVerification).toBe(true);

    // The critical assertion: no session was issued to an unverified self-signup.
    expect(mocks.setPortalCookie).not.toHaveBeenCalled();

    // A single-use verification token was stored and an email was sent.
    const updateArg = mocks.portalUserUpdate.mock.calls[0][0];
    expect(updateArg.data.magicToken).toBeTruthy();
    expect(updateArg.data.magicTokenExpiresAt).toBeInstanceOf(Date);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("REJECTS a self-serve signup that did not consent (creates nothing)", async () => {
    const res = await register({ ...baseBody }); // no agreedToDataUse
    expect(res.status).toBe(400);
    expect(mocks.alumniProfileCreate).not.toHaveBeenCalled();
    expect(mocks.portalUserCreate).not.toHaveBeenCalled();
    expect(mocks.setPortalCookie).not.toHaveBeenCalled();
  });
});

describe("invite-proven alumni registration — logged in immediately", () => {
  it("issues the alumni cookie for a valid, authorizing invite (no verification needed)", async () => {
    mocks.alumniInviteFindUnique.mockResolvedValue({
      id: "inv-1",
      token: "tok",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 3600_000),
      email: "jane@example.com",
      alumniId: null,
    });
    const res = await register({ ...baseBody, inviteToken: "tok" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pendingVerification).toBe(false);
    // Trusted path: session issued immediately, no verification email.
    expect(mocks.setPortalCookie).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    // The invite is burned.
    expect(mocks.alumniInviteUpdate).toHaveBeenCalledTimes(1);
  });
});
