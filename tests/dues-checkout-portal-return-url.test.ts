import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── P1 blocker #5: dues checkout return URLs must be PORTAL-aware ─────────────
// The Stripe success_url/cancel_url used to point at /admin/dues/success and
// /admin/brothers — both middleware-gated. A portal-only member (no greekstack_admin
// cookie) or a native caller (system browser, no session) got bounced to
// /admin/login after paying and never saw a receipt. This pins the return URLs
// to the ungated /portal/brothers/* routes so the receipt renders for the payer.

const mocks = vi.hoisted(() => ({
  resolveDuesActor: vi.fn(),
  getStripe: vi.fn(),
  getSiteUrl: vi.fn(() => "https://greekstack.vercel.app"),
  applyPassThrough: vi.fn((n: number) => n),
  getConnectAccountId: vi.fn(() => "acct_x"),
  isConnectChargesReady: vi.fn(() => false),
  tenantFindUnique: vi.fn(async () => null),
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

describe("dues checkout — portal-aware Stripe return URLs", () => {
  const ORIGINAL = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_GLOBAL_TRUTH";
    mocks.getStripe.mockReturnValue({
      checkout: { sessions: { create: mocks.sessionsCreate, retrieve: mocks.sessionsRetrieve } },
    });
    mocks.isConnectChargesReady.mockReturnValue(false);
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "dp_new" });
    mocks.resolveDuesActor.mockResolvedValue({
      ok: true,
      brother: { id: "b1", name: "Test Brother", email: "b1@chapter.org" },
      db: duesDb(),
      cfg: { ...BASE_CFG },
      subdomain: "alpha",
      transport: "native",
    });
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL;
  });

  it("success_url points at the ungated portal receipt route (never /admin)", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    const params = mocks.sessionsCreate.mock.calls[0][0];

    expect(params.success_url).toContain("/portal/brothers/dues/success");
    expect(params.success_url).toContain("session_id={CHECKOUT_SESSION_ID}");
    expect(params.success_url).not.toContain("/admin");
    // Built from the chapter subdomain origin, not the apex.
    expect(params.success_url.startsWith("https://alpha.greekstack.vercel.app")).toBe(true);
  });

  it("cancel_url returns the member to the portal dashboard (never /admin)", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    const params = mocks.sessionsCreate.mock.calls[0][0];

    expect(params.cancel_url).toContain("/portal/brothers/dashboard");
    expect(params.cancel_url).not.toContain("/admin");
  });
});
