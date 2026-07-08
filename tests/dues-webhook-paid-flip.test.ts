import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Stripe test-coverage gap 2(a): the dues webhook PAID-flip path ────────────
// The primary way a dues payment is confirmed is a `checkout.session.completed`
// event driven through app/api/dues/webhook → handleCheckoutCompleted. Until now
// ONLY the reconcile cron's equivalent transition was covered — the webhook's own
// PAID flip was never exercised by a webhook test. This suite drives a real
// checkout.session.completed event through the webhook (mocking Stripe signature
// verification exactly as the sibling dues-refund-webhook suite does) and asserts:
//   • the DuesPayment flips PENDING → PAID,
//   • the Brother's duesPaid badge (+ denormalized dues mirror) is set,
//   • a DUES_PAID audit row is written,
//   • a replay of the same event on an already-PAID row is a no-op (idempotent).

const mocks = vi.hoisted(() => {
  const duesFindUnique = vi.fn(async (): Promise<any> => null);
  const duesUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherFindUnique = vi.fn(async (): Promise<any> => ({ name: "Pat Paid", email: "pat@chapter.org" }));
  const donationFindUnique = vi.fn(async (): Promise<any> => null);
  const auditCreate = vi.fn(async (): Promise<any> => ({}));
  const siteConfigFindMany = vi.fn(async (): Promise<any[]> => []);
  const txn = vi.fn(async (ops: any[]): Promise<any> => Promise.all(ops));
  const db = {
    duesPayment: { findUnique: duesFindUnique, update: duesUpdate, findFirst: vi.fn() },
    brother: { update: brotherUpdate, findUnique: brotherFindUnique },
    alumniDonation: { findUnique: donationFindUnique, findFirst: vi.fn() },
    alumniProfile: { findUnique: vi.fn() },
    auditLog: { create: auditCreate },
    siteConfig: { findMany: siteConfigFindMany },
    $transaction: txn,
  } as any;
  return {
    constructEvent: vi.fn(),
    duesFindUnique, duesUpdate, brotherUpdate, brotherFindUnique,
    donationFindUnique, auditCreate, siteConfigFindMany, txn, db,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.db,
  getTenantClient: () => mocks.db,
  forEachTenant: vi.fn(async () => {}),
}));
// getStripe here returns only the webhooks surface — handleCheckoutCompleted's
// best-effort paymentIntents.retrieve throws and is swallowed (receipt URL stays
// null), which does NOT affect the PAID flip we assert.
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/email-template", () => ({ renderEmail: () => "<html></html>", renderEmailText: () => "text" }));
vi.mock("@/lib/chapter-identity", () => ({
  chapterIdentityFromCfg: () => ({ fraternityName: "Alpha", chapterAttribution: "Alpha", schoolName: "" }),
}));
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

const SESSION = {
  id: "cs_paid_1",
  payment_intent: "pi_paid_1",
  metadata: { subdomain: "alpha", duesPaymentId: "dp_1", brotherId: "b1", duesYear: "2026-fall" },
};

describe("dues webhook — checkout.session.completed PAID flip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: SESSION },
    });
    mocks.brotherFindUnique.mockResolvedValue({ name: "Pat Paid", email: "pat@chapter.org" });
    mocks.siteConfigFindMany.mockResolvedValue([]);
  });

  it("flips DuesPayment PENDING → PAID, sets the brother's duesPaid badge, and audits DUES_PAID", async () => {
    mocks.duesFindUnique.mockResolvedValue({
      id: "dp_1", brotherId: "b1", amountCents: 15000, year: "2026-fall", status: "PENDING",
    });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);

    // Both writes ride in a single $transaction: dues row PAID + brother badge set.
    expect(mocks.txn).toHaveBeenCalledTimes(1);
    expect(mocks.duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "dp_1" },
      data: expect.objectContaining({ status: "PAID", stripePaymentIntentId: "pi_paid_1" }),
    }));
    expect(mocks.brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "b1" },
      data: expect.objectContaining({
        duesPaid: true,
        duesPaymentMethod: "STRIPE",
        duesPaymentId: "dp_1",
        duesAmountCents: 15000,
        duesYear: "2026-fall",
      }),
    }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DUES_PAID", subjectId: "b1" }),
    }));
  });

  it("is idempotent on replay — an already-PAID row does NOT re-flip or re-audit", async () => {
    mocks.duesFindUnique.mockResolvedValue({
      id: "dp_1", brotherId: "b1", amountCents: 15000, year: "2026-fall", status: "PAID",
    });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    // No mutation on a replayed, already-confirmed payment.
    expect(mocks.txn).not.toHaveBeenCalled();
    expect(mocks.duesUpdate).not.toHaveBeenCalled();
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
