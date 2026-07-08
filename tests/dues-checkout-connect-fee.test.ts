import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Stripe test-coverage gap 2(b): the Connect destination-charge path ────────
// When a chapter has a connected Express account with charges enabled AND is on
// the dues_percentage platform plan, app/api/dues/checkout routes the charge to
// the chapter's account (payment_intent_data.transfer_data.destination) and takes
// a Greek Stack application_fee_amount = effective fee pct × totalCents. Every
// existing checkout test forced isConnectChargesReady → false and stubbed
// duesPlatformFeePct → 0, so neither the destination routing nor the fee math ran
// under test. This suite exercises the REAL platform-billing math on the live
// Connect path and pins destination + application_fee_amount for both intro (1.5%)
// and post-intro (3.0%) states.

const mocks = vi.hoisted(() => ({
  resolveDuesActor: vi.fn(),
  getStripe: vi.fn(),
  getSiteUrl: vi.fn(() => "https://greekstack.vercel.app"),
  applyPassThrough: vi.fn((n: number) => n),
  getConnectAccountId: vi.fn(() => "acct_CHAPTER_123"),
  isConnectChargesReady: vi.fn(() => true),
  tenantFindUnique: vi.fn(async () => ({ plan: "dues_percentage" })),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(async () => ({})),
  sessionsCreate: vi.fn(async (_params: any) => ({ id: "cs_new", url: "https://checkout.stripe/cs_new" })),
  sessionsRetrieve: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: () => ({ get: () => "greekstack.vercel.app" }) }));
vi.mock("@/lib/prisma", () => ({
  centralDb: { tenant: { findUnique: mocks.tenantFindUnique } },
  getSubdomain: () => "alpha",
}));
vi.mock("@/lib/dues-actor", () => ({ resolveDuesActor: mocks.resolveDuesActor }));
vi.mock("@/lib/stripe", () => ({
  getStripe: mocks.getStripe,
  getSiteUrl: mocks.getSiteUrl,
  applyPassThrough: mocks.applyPassThrough,
}));
vi.mock("@/lib/stripe-connect", () => ({
  getConnectAccountId: mocks.getConnectAccountId,
  isConnectChargesReady: mocks.isConnectChargesReady,
}));
// Use the REAL platform-billing so duesPlatformFeePct + normalizePlan actually run
// (this is the whole point — proving the intro-fee math on the Connect path).
vi.mock("@/lib/platform-billing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platform-billing")>();
  return { ...actual };
});
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, errorSink: vi.fn() }));
vi.mock("@/lib/mobile-cors", () => ({
  mobileCorsHeaders: () => ({}),
  mobilePreflightResponse: () => new Response(null, { status: 204 }),
}));

import { POST } from "@/app/api/dues/checkout/route";

function duesDb() {
  const surface = {
    duesPayment: { findFirst: mocks.findFirst, create: mocks.create, update: mocks.update },
  } as any;
  surface.$transaction = vi.fn(async (fn: any, _opts?: unknown) => fn(surface));
  return surface;
}

function req(body: unknown = { subdomain: "alpha" }) {
  return new Request("https://greekstack.vercel.app/api/dues/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const BASE_CFG: Record<string, string> = {
  "dues.enabled": "true",
  "dues.stripePublishableKey": "pk_test_x",
  "dues.year": "2026-fall",
  "dues.amountCents": "15000",
};

describe("dues checkout — Connect destination charge + dues_percentage application fee", () => {
  const ORIGINAL = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_GLOBAL_TRUTH";
    mocks.getStripe.mockReturnValue({
      checkout: { sessions: { create: mocks.sessionsCreate, retrieve: mocks.sessionsRetrieve } },
    });
    mocks.isConnectChargesReady.mockReturnValue(true);
    mocks.getConnectAccountId.mockReturnValue("acct_CHAPTER_123");
    mocks.tenantFindUnique.mockResolvedValue({ plan: "dues_percentage" });
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "dp_new" });
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL;
  });

  it("routes to the chapter account + charges the 1.5% INTRO fee before the intro cycle is used", async () => {
    mocks.resolveDuesActor.mockResolvedValue({
      ok: true,
      brother: { id: "b1", name: "Test Brother", email: "b1@chapter.org" },
      db: duesDb(),
      cfg: { ...BASE_CFG }, // no dues.introFeeUsed → introUsed = false
      subdomain: "alpha",
      transport: "native",
    });

    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);

    const params = mocks.sessionsCreate.mock.calls[0][0];
    // Destination charge routed to the chapter's connected account.
    expect(params.payment_intent_data.transfer_data.destination).toBe("acct_CHAPTER_123");
    // 1.5% of 15000 cents = 225.
    expect(params.payment_intent_data.application_fee_amount).toBe(225);
    // Plan + intro snapshot stamped for the webhook.
    expect(params.metadata.platformPlan).toBe("dues_percentage");
    expect(params.metadata.introFeeUsed).toBe("false");
  });

  it("charges the 3.0% STANDARD fee once the intro cycle has been used", async () => {
    mocks.resolveDuesActor.mockResolvedValue({
      ok: true,
      brother: { id: "b1", name: "Test Brother", email: "b1@chapter.org" },
      db: duesDb(),
      cfg: { ...BASE_CFG, "dues.introFeeUsed": "true" }, // introUsed = true
      subdomain: "alpha",
      transport: "native",
    });

    const res = await POST(req());
    expect(res.status).toBe(200);

    const params = mocks.sessionsCreate.mock.calls[0][0];
    expect(params.payment_intent_data.transfer_data.destination).toBe("acct_CHAPTER_123");
    // 3.0% of 15000 cents = 450.
    expect(params.payment_intent_data.application_fee_amount).toBe(450);
    expect(params.metadata.introFeeUsed).toBe("true");
  });
});
