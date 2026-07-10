import { describe, it, expect, vi, beforeEach } from "vitest";

// Money-integrity regression: the alumni DONATION checkout must reject server-side
// when the chapter has NO connected, charges-ready Stripe payout account. The
// dashboard already hides the Donate button in that state, but the POST used to
// fall through to the platform-collect branch — routing the donor's money into
// Greek Stack's OWN account. The server gate (isConnectChargesReady) now matches
// the UI: not connect-ready → 403, and NO Stripe session / PENDING row is minted.

const mocks = vi.hoisted(() => ({
  getPortalSession: vi.fn(() => ({ role: "alumni", userId: "pu1" })),
  isAdminOverride: vi.fn(() => false),
  getSiteConfig: vi.fn(async () => ({})),
  getStripe: vi.fn(),
  getSiteUrl: vi.fn(() => "https://greekstack.vercel.app"),
  getConnectAccountId: vi.fn(() => ""),
  isConnectChargesReady: vi.fn(() => false),
  portalUserFindUnique: vi.fn(async () => ({ id: "pu1", alumniId: "a1" })),
  alumniFindUnique: vi.fn(async () => ({ id: "a1", email: "alum@chapter.org" })),
  alumniFindFirst: vi.fn(),
  donationFindFirst: vi.fn(),
  donationCreate: vi.fn(),
  donationUpdate: vi.fn(async () => ({})),
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
    rushSubmitLog: { count: async () => 0, create: async () => ({}) },
  };
  surface.$transaction = vi.fn(async (fn: any) => fn(surface));
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
    headers: { "content-type": "application/json", "x-forwarded-for": `9.9.9.${Math.floor(Math.random() * 250)}` },
  });
}

describe("alumni donation checkout — Connect-ready server gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPortalSession.mockReturnValue({ role: "alumni", userId: "pu1" });
    mocks.isAdminOverride.mockReturnValue(false);
    mocks.portalUserFindUnique.mockResolvedValue({ id: "pu1", alumniId: "a1" });
    mocks.alumniFindUnique.mockResolvedValue({ id: "a1", email: "alum@chapter.org" });
    mocks.getStripe.mockReturnValue({
      checkout: { sessions: { create: mocks.sessionsCreate, retrieve: mocks.sessionsRetrieve } },
    });
  });

  it("rejects with 403 and mints NO session/PENDING row when the chapter is not Connect-ready", async () => {
    mocks.isConnectChargesReady.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
    // The crux: the donor's money never had a chance to route to the platform.
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    expect(mocks.donationCreate).not.toHaveBeenCalled();
  });

  it("allows checkout when the chapter IS Connect-ready", async () => {
    mocks.isConnectChargesReady.mockReturnValue(true);
    mocks.getConnectAccountId.mockReturnValue("acct_123");
    mocks.donationFindFirst.mockResolvedValueOnce(null);
    mocks.donationCreate.mockResolvedValueOnce({ id: "ad_new" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
  });
});
