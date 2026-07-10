import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * P0 REGRESSION — invite account-takeover.
 *
 * The brother-invite redeem (app/api/onboard/[token]/route.ts) used to match an
 * EXISTING brother purely by the attacker-supplied `body.name` and overwrite
 * that brother's passwordHash. An invite holder could therefore set the password
 * of ANY existing member — including a role=ADMIN brother — and seize the
 * chapter. The fix binds the redeem to the invite: an existing brother may only
 * be updated when it is the invite's own bound target (matching prefillName,
 * email, or a stored brotherId). This suite proves an invite can NOT overwrite an
 * unrelated existing (admin) brother's passwordHash, while the legitimate flows
 * (a genuine invitee completing their own pending record, and a brand-new
 * brother) still work.
 */

const mocks = vi.hoisted(() => ({
  inviteFindUnique: vi.fn(),
  inviteUpdate: vi.fn(),
  brotherFindUnique: vi.fn(),
  brotherUpdate: vi.fn(),
  brotherCreate: vi.fn(),
  documentCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brotherInvite: { findUnique: mocks.inviteFindUnique, update: mocks.inviteUpdate },
    brother: {
      findUnique: mocks.brotherFindUnique,
      update: mocks.brotherUpdate,
      create: mocks.brotherCreate,
    },
    document: { create: mocks.documentCreate },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: (pw: string) => `hashed:${pw}`,
}));

vi.mock("@/lib/esign", () => ({
  // Best-effort in the route (wrapped in try/catch) — resolve with no URL so the
  // Document.create step is skipped and we stay on the core happy path.
  generateAndUploadSignedPdf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/site-config", () => ({
  getSiteConfig: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/client-ip", () => ({
  getClientIp: () => "1.2.3.4",
}));

import { POST } from "@/app/api/onboard/[token]/route";

const futureExpiry = () => new Date(Date.now() + 60 * 60 * 1000);

function redeem(body: Record<string, unknown>) {
  const req = new Request("https://alpha.greekstack.vercel.app/api/onboard/tok", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req, { params: { token: "tok" } });
}

const validWaiverFields = {
  signatureName: "Adam Admin",
  agreedToHazingWaiver: true,
  password: "newpass123",
  confirmPassword: "newpass123",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("onboard invite redeem — account-takeover guard", () => {
  it("REJECTS overwriting an unrelated existing ADMIN's passwordHash (409, no update)", async () => {
    // A PENDING invite bound to a DIFFERENT target (a pledge), not the admin.
    mocks.inviteFindUnique.mockResolvedValue({
      id: "inv1",
      token: "tok",
      status: "PENDING",
      expiresAt: futureExpiry(),
      prefillName: "New Pledge",
      email: "pledge@school.edu",
      brotherId: null,
    });
    // The attacker supplies the ADMIN's name; the lookup resolves to the admin.
    mocks.brotherFindUnique.mockResolvedValue({
      id: "admin1",
      name: "Adam Admin",
      email: "admin@school.edu",
      passwordHash: "ADMIN_OLD_HASH",
      role: "ADMIN",
    });

    const res = await redeem({ name: "Adam Admin", ...validWaiverFields });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    // The critical assertion: the admin's record is NEVER updated.
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
    expect(mocks.brotherCreate).not.toHaveBeenCalled();
    // The invite is not consumed either.
    expect(mocks.inviteUpdate).not.toHaveBeenCalled();
  });

  it("ALLOWS a genuine invitee to complete their OWN pending record (prefillName match)", async () => {
    mocks.inviteFindUnique.mockResolvedValue({
      id: "inv2",
      token: "tok",
      status: "PENDING",
      expiresAt: futureExpiry(),
      prefillName: "New Pledge",
      email: "pledge@school.edu",
      brotherId: null,
    });
    // The invitee's own pending record (name matches the invite's prefillName).
    mocks.brotherFindUnique.mockResolvedValue({
      id: "b2",
      name: "New Pledge",
      email: "pledge@school.edu",
      passwordHash: null,
      role: "MEMBER",
    });
    mocks.brotherUpdate.mockResolvedValue({ id: "b2", name: "New Pledge", email: "pledge@school.edu" });
    mocks.inviteUpdate.mockResolvedValue({});

    const res = await redeem({
      name: "New Pledge",
      signatureName: "New Pledge",
      agreedToHazingWaiver: true,
      password: "newpass123",
      confirmPassword: "newpass123",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.brotherUpdate).toHaveBeenCalledTimes(1);
    // Their own passwordHash IS set (the legitimate flow is preserved).
    const updateArg = mocks.brotherUpdate.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "b2" });
    expect(updateArg.data.passwordHash).toBe("hashed:newpass123");
  });

  it("ALLOWS creating a brand-new brother when no existing name matches", async () => {
    mocks.inviteFindUnique.mockResolvedValue({
      id: "inv3",
      token: "tok",
      status: "PENDING",
      expiresAt: futureExpiry(),
      prefillName: "Fresh Face",
      email: "fresh@school.edu",
      brotherId: null,
    });
    mocks.brotherFindUnique.mockResolvedValue(null); // name is free
    mocks.brotherCreate.mockResolvedValue({ id: "b3", name: "Fresh Face", email: "fresh@school.edu" });
    mocks.inviteUpdate.mockResolvedValue({});

    const res = await redeem({
      name: "Fresh Face",
      signatureName: "Fresh Face",
      agreedToHazingWaiver: true,
      password: "newpass123",
      confirmPassword: "newpass123",
    });

    expect(res.status).toBe(200);
    expect(mocks.brotherCreate).toHaveBeenCalledTimes(1);
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });

  it("REJECTS a fully-unbound invite (no prefillName/email) hitting any existing brother", async () => {
    mocks.inviteFindUnique.mockResolvedValue({
      id: "inv4",
      token: "tok",
      status: "PENDING",
      expiresAt: futureExpiry(),
      prefillName: null,
      email: null,
      brotherId: null,
    });
    mocks.brotherFindUnique.mockResolvedValue({
      id: "admin1",
      name: "Adam Admin",
      email: "admin@school.edu",
      passwordHash: "ADMIN_OLD_HASH",
      role: "ADMIN",
    });

    const res = await redeem({ name: "Adam Admin", ...validWaiverFields });

    expect(res.status).toBe(409);
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });
});
