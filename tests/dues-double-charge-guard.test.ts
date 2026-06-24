import { describe, it, expect, vi, beforeEach } from "vitest";

// Money-integrity regression coverage for the dues CHECKOUT double-charge guard
// (app/api/dues/checkout/route.ts). A brother who already has an in-flight
// PENDING DuesPayment for the same (brotherId, year) must NOT be able to mint a
// SECOND chargeable Checkout session — that would double-charge the card. The
// guard either resumes the existing OPEN session (idempotent, no new charge) or
// blocks with a 409, and never creates a duplicate session/ledger row.

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
  // db.duesPayment mock surface
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(async () => ({})),
  // stripe surface
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

const CFG = {
  "dues.enabled": "true",
  "dues.stripePublishableKey": "pk_test_x",
  "dues.year": "2026-fall",
  "dues.amountCents": "15000",
};

function duesDb() {
  const surface = {
    duesPayment: { findFirst: mocks.findFirst, create: mocks.create, update: mocks.update },
  } as any;
  // The route now runs the PAID/PENDING check + PENDING create inside a
  // Serializable $transaction (TOCTOU double-charge guard). Mock $transaction to
  // invoke the callback with a `tx` that exposes the SAME duesPayment surface, so
  // the existing findFirst/create ordering + call-count assertions still hold.
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

describe("dues checkout double-charge guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.resolveDuesActor.mockResolvedValue({
      ok: true,
      brother: { id: "b1", name: "Test Brother", email: "b1@chapter.org" },
      db: duesDb(),
      cfg: CFG,
      subdomain: "alpha",
      transport: "native",
    });
    mocks.getStripe.mockReturnValue({
      checkout: { sessions: { create: mocks.sessionsCreate, retrieve: mocks.sessionsRetrieve } },
    });
  });

  it("blocks (409) when a PENDING dues payment already exists and no resumable session", async () => {
    // No PAID row; one PENDING row whose session can't be resumed.
    mocks.findFirst
      .mockResolvedValueOnce(null) // PAID check
      .mockResolvedValueOnce({ id: "dp_pending", status: "PENDING", stripeSessionId: null }); // PENDING check
    const res = await POST(req({ subdomain: "alpha" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    // Crucially: NO new session created.
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    // And NO new PENDING ledger row created.
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("resumes the SAME open session (no new charge) when a PENDING row has an open session", async () => {
    mocks.findFirst
      .mockResolvedValueOnce(null) // PAID check
      .mockResolvedValueOnce({ id: "dp_pending", status: "PENDING", stripeSessionId: "cs_open" });
    mocks.sessionsRetrieve.mockResolvedValue({ id: "cs_open", status: "open", url: "https://checkout.stripe/cs_open" });
    const res = await POST(req({ subdomain: "alpha" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.url).toBe("https://checkout.stripe/cs_open");
    // Reused — never minted a second session.
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("blocks (409) when already PAID for the year", async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: "dp_paid", status: "PAID" }); // PAID check hits
    const res = await POST(req({ subdomain: "alpha" }));
    expect(res.status).toBe(409);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it("creates exactly ONE session when there is no PAID and no PENDING row", async () => {
    mocks.findFirst
      .mockResolvedValueOnce(null) // PAID check
      .mockResolvedValueOnce(null); // PENDING check
    mocks.create.mockResolvedValue({ id: "dp_new" });
    const res = await POST(req({ subdomain: "alpha" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.url).toBe("https://checkout.stripe/cs_new");
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(1); // exactly one PENDING row
  });

  it("TOCTOU: a Serializable write-conflict (P2034) from a concurrent request → 409, no second session", async () => {
    // Both checks pass (no PAID, no PENDING) but the create races a concurrent
    // request; the DB aborts the loser with a serialization conflict. The route
    // must map P2034 to the same "already in progress" 409 — never a 2nd session.
    mocks.findFirst
      .mockResolvedValueOnce(null) // PAID check
      .mockResolvedValueOnce(null); // PENDING check
    mocks.create.mockRejectedValueOnce(Object.assign(new Error("write conflict"), { code: "P2034" }));
    const res = await POST(req({ subdomain: "alpha" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    // Crucially: no Stripe session was minted on the losing request.
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});
