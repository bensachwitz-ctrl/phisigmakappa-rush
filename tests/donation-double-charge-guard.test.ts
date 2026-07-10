import { describe, it, expect, vi, beforeEach } from "vitest";

// Money-integrity regression coverage for the alumni DONATION checkout double-
// charge guard (app/api/alumni/donate/checkout/route.ts). A donor who double-
// clicks / opens two tabs / has a fetch retried must NOT mint a SECOND chargeable
// Stripe Checkout session for the same intended donation — that would charge the
// card twice. Mirrors tests/dues-double-charge-guard.test.ts: the recent-open-
// PENDING check + PENDING create run inside a Serializable $transaction; the guard
// either resumes the existing OPEN session (idempotent, no new charge), blocks
// with a 409, or — on a genuinely new donation — creates exactly one session.

const mocks = vi.hoisted(() => ({
  getPortalSession: vi.fn(),
  isAdminOverride: vi.fn(() => false),
  getSiteConfig: vi.fn(async () => ({})),
  getStripe: vi.fn(),
  getSiteUrl: vi.fn(() => "https://greekstack.vercel.app"),
  getConnectAccountId: vi.fn(() => ""),
  isConnectChargesReady: vi.fn(() => false),
  // prisma surfaces
  portalUserFindUnique: vi.fn(),
  alumniFindUnique: vi.fn(),
  alumniFindFirst: vi.fn(),
  donationFindFirst: vi.fn(),
  donationCreate: vi.fn(),
  donationUpdate: vi.fn(async () => ({})),
  // stripe
  sessionsCreate: vi.fn(async () => ({ id: "cs_new", url: "https://checkout.stripe/cs_new" })),
  sessionsRetrieve: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: () => ({ get: () => "alpha.greekstack.vercel.app" }) }));

vi.mock("@/lib/prisma", () => {
  const surface: any = {
    portalUser: { findUnique: mocks.portalUserFindUnique },
    alumniProfile: { findUnique: mocks.alumniFindUnique, findFirst: mocks.alumniFindFirst },
    alumniDonation: {
      findFirst: mocks.donationFindFirst,
      create: mocks.donationCreate,
      update: mocks.donationUpdate,
    },
  };
  // The route runs the recent-PENDING check + PENDING create inside a Serializable
  // $transaction. Mock it to invoke the callback with a `tx` exposing the SAME
  // alumniDonation surface so the findFirst/create ordering assertions hold.
  surface.$transaction = vi.fn(async (fn: any, _opts?: unknown) => fn(surface));
  return { prisma: surface, getSubdomain: () => "alpha" };
});

vi.mock("@/lib/site-config", () => ({ getSiteConfig: mocks.getSiteConfig }));
vi.mock("@/lib/portal-auth", () => ({
  getPortalSession: mocks.getPortalSession,
  isAdminOverride: mocks.isAdminOverride,
}));
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe, getSiteUrl: mocks.getSiteUrl }));
vi.mock("@/lib/stripe-connect", () => ({
  getConnectAccountId: mocks.getConnectAccountId,
  isConnectChargesReady: mocks.isConnectChargesReady,
}));
vi.mock("@/lib/logger", () => ({ errorSink: vi.fn() }));

import { POST } from "@/app/api/alumni/donate/checkout/route";

function req(body: unknown = { amountCents: 5000, campaign: "Annual" }) {
  return new Request("https://alpha.greekstack.vercel.app/api/alumni/donate/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": `1.2.3.${Math.floor(Math.random() * 250)}` },
  });
}

describe("alumni donation checkout double-charge guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPortalSession.mockReturnValue({ role: "alumni", userId: "pu1" });
    mocks.isAdminOverride.mockReturnValue(false);
    // The route now REQUIRES a connected, charges-ready payout account (money-
    // integrity gate); these double-charge cases exercise the happy path, so the
    // chapter is connect-ready. The gate itself is covered by
    // tests/donation-connect-gate.test.ts.
    mocks.isConnectChargesReady.mockReturnValue(true);
    mocks.portalUserFindUnique.mockResolvedValue({ id: "pu1", alumniId: "a1" });
    mocks.alumniFindUnique.mockResolvedValue({ id: "a1", email: "alum@chapter.org" });
    mocks.getStripe.mockReturnValue({
      checkout: { sessions: { create: mocks.sessionsCreate, retrieve: mocks.sessionsRetrieve } },
    });
  });

  it("creates exactly ONE session when there is no recent PENDING donation", async () => {
    mocks.donationFindFirst.mockResolvedValueOnce(null); // no recent PENDING
    mocks.donationCreate.mockResolvedValueOnce({ id: "ad_new" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.url).toBe("https://checkout.stripe/cs_new");
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.donationCreate).toHaveBeenCalledTimes(1); // exactly one PENDING row
  });

  it("resumes the SAME open session (no new charge) on a duplicate POST with a resumable session", async () => {
    mocks.donationFindFirst.mockResolvedValueOnce({ id: "ad_pending", stripeSessionId: "cs_open" });
    mocks.sessionsRetrieve.mockResolvedValue({ id: "cs_open", status: "open", url: "https://checkout.stripe/cs_open" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.url).toBe("https://checkout.stripe/cs_open");
    // Reused — NEVER minted a second session, NEVER created a second PENDING row.
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    expect(mocks.donationCreate).not.toHaveBeenCalled();
  });

  it("blocks (409) on a duplicate POST when the existing PENDING session is not resumable", async () => {
    mocks.donationFindFirst.mockResolvedValueOnce({ id: "ad_pending", stripeSessionId: null });
    const res = await POST(req());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    // Crucially: no second chargeable session, no second PENDING row.
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    expect(mocks.donationCreate).not.toHaveBeenCalled();
  });

  it("TOCTOU: a Serializable write-conflict (P2034) from a concurrent request → 409, no second session", async () => {
    // The recent-PENDING check passes (none seen) but the create races a concurrent
    // request; the DB aborts the loser with a serialization conflict. The route must
    // map P2034 to a 409 and never mint a second chargeable session.
    mocks.donationFindFirst.mockResolvedValueOnce(null);
    mocks.donationCreate.mockRejectedValueOnce(Object.assign(new Error("write conflict"), { code: "P2034" }));
    const res = await POST(req());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});
