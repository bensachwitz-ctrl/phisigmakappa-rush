import { describe, it, expect, vi, beforeEach } from "vitest";

// Money-integrity regression coverage for the dues WEBHOOK refund / dispute
// handling (app/api/dues/webhook/route.ts).
//
// REGRESSION THIS SUITE LOCKS IN (P0): charge.refunded / charge.dispute.created /
// charge.dispute.closed / payment_intent.payment_failed deliver a Charge / Dispute
// / PaymentIntent object that does NOT carry the Checkout Session's metadata. The
// old webhook read `obj.metadata.subdomain` only, got undefined, and fell back to
// `prisma` (the EMPTY public schema). reverseByPaymentIntent then found no row and
// logged `reversal_unknown_pi` — money left Stripe while DuesPayment stayed PAID +
// Brother.duesPaid true.
//
// So these tests build REALISTIC reversal objects with NO metadata.subdomain and
// prove the webhook now resolves the tenant robustly (PaymentIntent metadata →
// originating Checkout Session metadata → registry-wide scan) and runs the
// reversal against the TENANT schema. The public (`prisma`) client is deliberately
// EMPTY: if resolution ever regressed to the public-schema fallback, the reversal
// would find nothing and every assertion below would fail.

const mocks = vi.hoisted(() => {
  // ── TENANT schema (schema_alpha) — holds the real dues/donation rows ──────────
  const t_duesFindFirst = vi.fn(async (): Promise<any> => null);
  const t_duesUpdate = vi.fn(async (): Promise<any> => ({}));
  const t_brotherUpdate = vi.fn(async (): Promise<any> => ({}));
  const t_brotherFindUnique = vi.fn(async (): Promise<any> => ({ name: "Test Brother" }));
  const t_donationFindFirst = vi.fn(async (): Promise<any> => null);
  const t_donationUpdate = vi.fn(async (): Promise<any> => ({}));
  const t_alumniFindUnique = vi.fn(async (): Promise<any> => ({ fullName: "Test Alum" }));
  const t_auditCreate = vi.fn(async (): Promise<any> => ({}));
  const t_txn = vi.fn(async (ops: any[]): Promise<any> => Promise.all(ops));
  const tenantDb = {
    duesPayment: { findFirst: t_duesFindFirst, update: t_duesUpdate, findUnique: vi.fn() },
    brother: { update: t_brotherUpdate, findUnique: t_brotherFindUnique },
    alumniDonation: { findFirst: t_donationFindFirst, update: t_donationUpdate },
    alumniProfile: { findUnique: t_alumniFindUnique },
    auditLog: { create: t_auditCreate },
    siteConfig: { findMany: vi.fn(async () => []) },
    $transaction: t_txn,
  } as any;

  // ── PUBLIC schema (`prisma`) — EMPTY. A bug that leaves subdomain unresolved
  //    writes here and finds NOTHING, which the assertions then catch. ──────────
  const pub_duesFindFirst = vi.fn(async (): Promise<any> => null);
  const pub_duesUpdate = vi.fn(async (): Promise<any> => ({}));
  const pub_donationFindFirst = vi.fn(async (): Promise<any> => null);
  const pub_donationUpdate = vi.fn(async (): Promise<any> => ({}));
  const pub_brotherUpdate = vi.fn(async (): Promise<any> => ({}));
  const publicDb = {
    duesPayment: { findFirst: pub_duesFindFirst, update: pub_duesUpdate, findUnique: vi.fn() },
    brother: { update: pub_brotherUpdate, findUnique: vi.fn(async () => null) },
    alumniDonation: { findFirst: pub_donationFindFirst, update: pub_donationUpdate },
    alumniProfile: { findUnique: vi.fn(async () => null) },
    auditLog: { create: vi.fn(async () => ({})) },
    siteConfig: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops)),
  } as any;

  // ── Stripe (server-to-server) ─────────────────────────────────────────────────
  const constructEvent = vi.fn();
  const piRetrieve = vi.fn(async (): Promise<any> => ({ metadata: {} }));
  const chargeRetrieve = vi.fn(async (): Promise<any> => null);
  const sessionsList = vi.fn(async (): Promise<any> => ({ data: [] }));

  // ── Tenant routing ──────────────────────────────────────────────────────────
  const getTenantClient = vi.fn((_sub: string) => tenantDb);
  // Backstop scan: run the callback against the single tenant so a PI-id lookup
  // can resolve "alpha" when neither the PI nor the session carries metadata.
  const forEachTenant = vi.fn(async (fn: any) => {
    const result = await fn(tenantDb, { subdomain: "alpha" });
    return [{ tenant: "alpha", ok: true, result }];
  });

  return {
    constructEvent, piRetrieve, chargeRetrieve, sessionsList,
    getTenantClient, forEachTenant,
    tenantDb, publicDb,
    t_duesFindFirst, t_duesUpdate, t_brotherUpdate, t_brotherFindUnique,
    t_donationFindFirst, t_donationUpdate, t_alumniFindUnique, t_auditCreate, t_txn,
    pub_duesUpdate, pub_donationUpdate, pub_brotherUpdate,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.publicDb,
  getTenantClient: mocks.getTenantClient,
  forEachTenant: mocks.forEachTenant,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    paymentIntents: { retrieve: mocks.piRetrieve },
    charges: { retrieve: mocks.chargeRetrieve },
    checkout: { sessions: { list: mocks.sessionsList } },
  }),
}));

vi.mock("@/lib/site-config", () => ({ getSiteConfig: vi.fn(async () => ({})) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/email-template", () => ({ renderEmail: () => "<html></html>", renderEmailText: () => "text" }));
vi.mock("@/lib/chapter-identity", () => ({ chapterIdentityFromCfg: () => ({ fraternityName: "Alpha", chapterAttribution: "Alpha", schoolName: "" }) }));
vi.mock("@/lib/platform-billing", () => ({
  DUES_INTRO_FEE_USED_KEY: "dues.introFeeUsed",
  markDuesIntroFeeUsedFromSession: vi.fn(async () => false),
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, errorSink: vi.fn() }));
vi.mock("@/lib/dues-receipt", () => ({ generateAndUploadDuesReceipt: vi.fn(async () => null) }));

import { POST } from "@/app/api/dues/webhook/route";

function webhookReq() {
  return new Request("https://greekstack.vercel.app/api/dues/webhook", {
    method: "POST",
    body: "{}",
    headers: { "stripe-signature": "sig" },
  });
}

// REALISTIC reversal objects — a real Charge / Dispute from Stripe carries NO
// Checkout-Session metadata. (We NEVER inject metadata.subdomain here; that is the
// whole point of the regression.)
function chargeRefunded(over: { id: string; payment_intent: string; amount: number; amount_refunded: number }) {
  return { type: "charge.refunded", data: { object: { ...over } } };
}
function disputeEvent(
  type: "charge.dispute.created" | "charge.dispute.closed",
  over: { id: string; payment_intent: string; status?: string; charge?: string },
) {
  return { type, data: { object: { ...over } } };
}

describe("dues webhook — refunds & disputes (realistic tenant resolution)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    // Default resolution source: the PaymentIntent carries the subdomain we stamp
    // at checkout via payment_intent_data.metadata. Individual tests override this
    // to exercise the session-metadata and registry-scan fallbacks.
    mocks.piRetrieve.mockResolvedValue({ metadata: { subdomain: "alpha" } });
    mocks.sessionsList.mockResolvedValue({ data: [] });
    mocks.t_brotherFindUnique.mockResolvedValue({ name: "Test Brother" });
    mocks.t_donationFindFirst.mockResolvedValue(null);
  });

  // ── TENANT RESOLUTION (the P0 regression) ────────────────────────────────────

  it("resolves the tenant from PaymentIntent metadata (Charge carries none) and runs the reversal on the TENANT schema", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_1", payment_intent: "pi_1", amount: 15000, amount_refunded: 15000 }));
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_1", brotherId: "b1", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    // Resolution happened via the PaymentIntent, and bound the ALPHA tenant client.
    expect(mocks.piRetrieve).toHaveBeenCalledWith("pi_1");
    expect(mocks.getTenantClient).toHaveBeenCalledWith("alpha");
    // Reversal ran on the TENANT db, never the empty public schema.
    expect(mocks.t_duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "dp_1" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.pub_duesUpdate).not.toHaveBeenCalled();
    expect(mocks.pub_brotherUpdate).not.toHaveBeenCalled();
  });

  it("falls back to the originating Checkout Session metadata when the PaymentIntent has none", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_s", payment_intent: "pi_s", amount: 15000, amount_refunded: 15000 }));
    mocks.piRetrieve.mockResolvedValue({ metadata: {} }); // PI carries nothing
    mocks.sessionsList.mockResolvedValue({ data: [{ id: "cs_1", metadata: { subdomain: "alpha" } }] });
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_s", brotherId: "bs", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.sessionsList).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_s" }));
    expect(mocks.getTenantClient).toHaveBeenCalledWith("alpha");
    expect(mocks.t_duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.pub_duesUpdate).not.toHaveBeenCalled();
  });

  it("backstops via a registry-wide scan when neither the PaymentIntent nor the session carries a subdomain", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_b", payment_intent: "pi_b", amount: 15000, amount_refunded: 15000 }));
    mocks.piRetrieve.mockResolvedValue({ metadata: {} });
    mocks.sessionsList.mockResolvedValue({ data: [] });
    // Only the scan can resolve it: the tenant schema owns the row for pi_b.
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_b", brotherId: "bb", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.forEachTenant).toHaveBeenCalled();
    expect(mocks.getTenantClient).toHaveBeenCalledWith("alpha");
    expect(mocks.t_duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.pub_duesUpdate).not.toHaveBeenCalled();
  });

  it("resolves a DISPUTE (Dispute carries no session metadata) via its PaymentIntent", async () => {
    // A real Dispute carries payment_intent (which the reversal handler also reads
    // to find the row) but NOT the Checkout Session's metadata — so the tenant must
    // be resolved from the PaymentIntent's own metadata.subdomain.
    mocks.constructEvent.mockReturnValue(
      disputeEvent("charge.dispute.created", { id: "dp_disp", payment_intent: "pi_disp" }),
    );
    mocks.piRetrieve.mockResolvedValue({ metadata: { subdomain: "alpha" } });
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_d", brotherId: "bd", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.piRetrieve).toHaveBeenCalledWith("pi_disp");
    expect(mocks.getTenantClient).toHaveBeenCalledWith("alpha");
    expect(mocks.t_brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ duesPaid: false }),
    }));
    expect(mocks.pub_brotherUpdate).not.toHaveBeenCalled();
  });

  // ── REVERSAL / IDEMPOTENCY LOGIC (already correct — now proven on the right tenant) ─

  it("FULL refund → DuesPayment REFUNDED and brother duesPaid cleared", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_2", payment_intent: "pi_2", amount: 15000, amount_refunded: 15000 }));
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_2", brotherId: "b2", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_txn).toHaveBeenCalledTimes(1);
    expect(mocks.t_duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "dp_2" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.t_brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "b2" },
      data: expect.objectContaining({ duesPaid: false }),
    }));
    expect(mocks.t_auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DUES_REFUNDED" }),
    }));
  });

  it("PARTIAL refund → DuesPayment REFUNDED but brother badge NOT cleared", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_3", payment_intent: "pi_3", amount: 15000, amount_refunded: 5000 }));
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_3", brotherId: "b3", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "dp_3" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.t_brotherUpdate).not.toHaveBeenCalled();
  });

  it("refund is idempotent — a true duplicate (already REFUNDED, badge already cleared) is a no-op", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_4", payment_intent: "pi_4", amount: 15000, amount_refunded: 15000 }));
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_4", brotherId: "b4", amountCents: 15000, year: "2026-fall", status: "REFUNDED" });
    mocks.t_brotherFindUnique.mockResolvedValue({ duesPaid: false });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_duesUpdate).not.toHaveBeenCalled();
    expect(mocks.t_brotherUpdate).not.toHaveBeenCalled();
  });

  it("partial-then-remainder: a now-FULL refund on an already-REFUNDED row STILL clears a brother who is still duesPaid", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_rem", payment_intent: "pi_rem", amount: 15000, amount_refunded: 15000 }));
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_rem", brotherId: "b_rem", amountCents: 15000, year: "2026-fall", status: "REFUNDED" });
    mocks.t_brotherFindUnique.mockResolvedValue({ duesPaid: true });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_txn).toHaveBeenCalledTimes(1);
    expect(mocks.t_brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "b_rem" },
      data: expect.objectContaining({ duesPaid: false }),
    }));
  });

  it("partial refund AFTER a row is already REFUNDED is a no-op (no escalation)", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_p2", payment_intent: "pi_p2", amount: 15000, amount_refunded: 5000 }));
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_p2", brotherId: "b_p2", amountCents: 15000, year: "2026-fall", status: "REFUNDED" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_duesUpdate).not.toHaveBeenCalled();
    expect(mocks.t_brotherUpdate).not.toHaveBeenCalled();
  });

  it("dispute WON → DuesPayment restored to PAID and brother badge re-set", async () => {
    mocks.constructEvent.mockReturnValue(
      disputeEvent("charge.dispute.closed", { id: "dp_won", status: "won", payment_intent: "pi_won" }),
    );
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_w1", brotherId: "bw1", amountCents: 15000, year: "2026-fall", status: "REFUNDED" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "dp_w1" },
      data: expect.objectContaining({ status: "PAID" }),
    }));
    expect(mocks.t_brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "bw1" },
      data: expect.objectContaining({ duesPaid: true }),
    }));
    expect(mocks.t_auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DUES_DISPUTE_WON" }),
    }));
  });

  it("dispute LOST → no restore (stays REFUNDED, no money movement)", async () => {
    mocks.constructEvent.mockReturnValue(
      disputeEvent("charge.dispute.closed", { id: "dp_lost", status: "lost", payment_intent: "pi_lost" }),
    );
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_l1", brotherId: "bl1", amountCents: 15000, year: "2026-fall", status: "REFUNDED" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_duesUpdate).not.toHaveBeenCalled();
    expect(mocks.t_brotherUpdate).not.toHaveBeenCalled();
  });

  it("dispute WON on an alumni donation → donation restored to PAID", async () => {
    mocks.constructEvent.mockReturnValue(
      disputeEvent("charge.dispute.closed", { id: "ad_won", status: "won", payment_intent: "pi_adwon" }),
    );
    mocks.t_duesFindFirst.mockResolvedValue(null); // not a dues payment
    mocks.t_donationFindFirst.mockResolvedValue({ id: "ad_1", alumniId: "a1", amountCents: 5000, campaign: "Annual", status: "REFUNDED" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_donationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ad_1" },
      data: expect.objectContaining({ status: "PAID" }),
    }));
    expect(mocks.t_brotherUpdate).not.toHaveBeenCalled();
    expect(mocks.t_auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "ALUMNI_DONATION_DISPUTE_WON" }),
    }));
  });

  it("dispute → DuesPayment REFUNDED and brother badge cleared (treated as full reversal)", async () => {
    mocks.constructEvent.mockReturnValue(
      disputeEvent("charge.dispute.created", { id: "dp_dispute", payment_intent: "pi_5" }),
    );
    mocks.t_duesFindFirst.mockResolvedValue({ id: "dp_5", brotherId: "b5", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "b5" },
      data: expect.objectContaining({ duesPaid: false }),
    }));
    expect(mocks.t_auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DUES_DISPUTED" }),
    }));
  });

  it("FULL refund of an alumni donation → donation REFUNDED (no brother touch)", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_6", payment_intent: "pi_6", amount: 5000, amount_refunded: 5000 }));
    mocks.t_duesFindFirst.mockResolvedValue(null); // not a dues payment
    mocks.t_donationFindFirst.mockResolvedValue({ id: "ad_2", alumniId: "a2", amountCents: 5000, campaign: "Annual", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_donationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ad_2" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.t_brotherUpdate).not.toHaveBeenCalled();
    expect(mocks.t_auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "ALUMNI_DONATION_REFUNDED" }),
    }));
  });

  it("PARTIAL refund of an alumni donation → donation STAYS PAID (counts in 'donations raised')", async () => {
    mocks.constructEvent.mockReturnValue(chargeRefunded({ id: "ch_7", payment_intent: "pi_7", amount: 5000, amount_refunded: 1500 }));
    mocks.t_duesFindFirst.mockResolvedValue(null); // not a dues payment
    mocks.t_donationFindFirst.mockResolvedValue({ id: "ad_3", alumniId: "a3", amountCents: 5000, campaign: "Annual", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.t_donationUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.t_donationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ad_3" },
      data: expect.objectContaining({ notes: expect.stringMatching(/partial refund/i) }),
    }));
    expect(mocks.t_donationUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.t_auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "ALUMNI_DONATION_PARTIALLY_REFUNDED" }),
    }));
    expect(mocks.t_brotherUpdate).not.toHaveBeenCalled();
  });
});
