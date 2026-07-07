import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── P1 #4 — dues CHECKOUT webhook-secret prerequisite (money integrity) ───────
// The dues webhook (app/api/dues/webhook) verifies Stripe signatures with the
// platform-GLOBAL process.env.STRIPE_WEBHOOK_SECRET ONLY — the per-chapter
// dues.stripeWebhookSecret path was removed there (it resolved through the Host
// proxy to the empty public schema and could never verify). So checkout MUST
// require the SAME global secret. The bug: checkout treated dues as configured
// when EITHER the global env OR a per-chapter cfg secret was set. A chapter with
// ONLY the per-chapter secret would charge cards, but every
// checkout.session.completed would 503 at the webhook and DuesPayment would
// never flip PAID — real money charged, never reconciled.
//
// This suite pins: a per-chapter secret WITHOUT the global env is refused (503),
// and checkout only proceeds when the GLOBAL env is set.

const mocks = vi.hoisted(() => ({
  resolveDuesActor: vi.fn(),
  getStripe: vi.fn(),
  getSiteUrl: vi.fn(() => "https://greekstack.vercel.app"),
  applyPassThrough: vi.fn((n: number) => n),
  getConnectAccountId: vi.fn(() => ""),
  isConnectChargesReady: vi.fn(() => false),
  duesPlatformFeePct: vi.fn(() => 0),
  normalizePlan: vi.fn(() => "none"),
  tenantFindUnique: vi.fn(async () => ({ plan: "none" })),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(async () => ({})),
  sessionsCreate: vi.fn(async () => ({ id: "cs_new", url: "https://checkout.stripe/cs_new" })),
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
vi.mock("@/lib/platform-billing", () => ({
  duesPlatformFeePct: mocks.duesPlatformFeePct,
  normalizePlan: mocks.normalizePlan,
  DUES_INTRO_FEE_USED_KEY: "dues.introFeeUsed",
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, errorSink: vi.fn() }));
vi.mock("@/lib/mobile-cors", () => ({
  mobileCorsHeaders: () => ({}),
  mobilePreflightResponse: () => new Response(null, { status: 204 }),
}));

import { POST } from "@/app/api/dues/checkout/route";

// A chapter whose ONLY webhook secret is the legacy per-chapter cfg value.
const CFG_PER_CHAPTER_ONLY = {
  "dues.enabled": "true",
  "dues.stripePublishableKey": "pk_test_x",
  "dues.stripeWebhookSecret": "whsec_PER_CHAPTER_ONLY",
  "dues.year": "2026-fall",
  "dues.amountCents": "15000",
};

function duesDb() {
  const surface = {
    duesPayment: { findFirst: mocks.findFirst, create: mocks.create, update: mocks.update },
  } as any;
  surface.$transaction = vi.fn(async (fn: any, _opts?: unknown) => fn(surface));
  return surface;
}

function req(body: unknown = {}) {
  return new Request("https://greekstack.vercel.app/api/dues/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("dues checkout — requires the GLOBAL STRIPE_WEBHOOK_SECRET (the secret the webhook actually uses)", () => {
  const ORIGINAL = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveDuesActor.mockResolvedValue({
      ok: true,
      brother: { id: "b1", name: "Test Brother", email: "b1@chapter.org" },
      db: duesDb(),
      cfg: CFG_PER_CHAPTER_ONLY,
      subdomain: "alpha",
      transport: "native",
    });
    mocks.getStripe.mockReturnValue({
      checkout: { sessions: { create: mocks.sessionsCreate, retrieve: mocks.sessionsRetrieve } },
    });
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "dp_new" });
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL;
  });

  it("REFUSES checkout (503) when only a per-chapter cfg secret exists and the GLOBAL env is unset — no Stripe session, no charge", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const res = await POST(req({ subdomain: "alpha" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/not configured/i);

    // Critically: the card is NEVER charged when the payment can't be reconciled.
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    // …and no PENDING ledger row is minted either.
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("PROCEEDS to a Stripe session when the GLOBAL env IS set", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_GLOBAL_TRUTH";

    const res = await POST(req({ subdomain: "alpha" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.url).toBe("https://checkout.stripe/cs_new");
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
  });
});
