import { describe, it, expect, vi, beforeEach } from "vitest";

// Money-integrity regression coverage for the dues WEBHOOK refund / dispute
// handling (app/api/dues/webhook/route.ts). When Stripe reports a refund or a
// dispute, the matching DuesPayment / AlumniDonation must be set REFUNDED, and a
// FULL dues refund must clear the brother's duesPaid badge — so the chapter
// ledger / standing never claim money that was given back.

const mocks = vi.hoisted(() => {
  const duesFindFirst = vi.fn(async (): Promise<any> => null);
  const duesUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherFindUnique = vi.fn(async (): Promise<any> => ({ name: "Test Brother" }));
  const donationFindFirst = vi.fn(async (): Promise<any> => null);
  const donationUpdate = vi.fn(async (): Promise<any> => ({}));
  const alumniFindUnique = vi.fn(async (): Promise<any> => ({ fullName: "Test Alum" }));
  const auditCreate = vi.fn(async (): Promise<any> => ({}));
  const txn = vi.fn(async (ops: any[]): Promise<any> => Promise.all(ops));
  const db = {
    duesPayment: { findFirst: duesFindFirst, update: duesUpdate, findUnique: vi.fn() },
    brother: { update: brotherUpdate, findUnique: brotherFindUnique },
    alumniDonation: { findFirst: donationFindFirst, update: donationUpdate },
    alumniProfile: { findUnique: alumniFindUnique },
    auditLog: { create: auditCreate },
    siteConfig: { findMany: vi.fn(async () => []) },
    $transaction: txn,
  } as any;
  return {
    constructEvent: vi.fn(),
    duesFindFirst, duesUpdate, brotherUpdate, brotherFindUnique,
    donationFindFirst, donationUpdate, alumniFindUnique, auditCreate, txn, db,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.db,
  getTenantClient: () => mocks.db,
  forEachTenant: vi.fn(async () => {}),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}));

vi.mock("@/lib/site-config", () => ({ getSiteConfig: vi.fn(async () => ({})) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/email-template", () => ({ renderEmail: () => "<html></html>", renderEmailText: () => "text" }));
vi.mock("@/lib/chapter-identity", () => ({ chapterIdentityFromCfg: () => ({ fraternityName: "Alpha", chapterAttribution: "Alpha", schoolName: "" }) }));
vi.mock("@/lib/platform-billing", () => ({ DUES_INTRO_FEE_USED_KEY: "dues.introFeeUsed" }));
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

describe("dues webhook — refunds & disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.brotherFindUnique.mockResolvedValue({ name: "Test Brother" });
    mocks.donationFindFirst.mockResolvedValue(null);
  });

  it("FULL refund → DuesPayment REFUNDED and brother duesPaid cleared", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "charge.refunded",
      data: { object: { id: "ch_1", payment_intent: "pi_1", amount: 15000, amount_refunded: 15000, metadata: { subdomain: "alpha" } } },
    });
    mocks.duesFindFirst.mockResolvedValue({ id: "dp_1", brotherId: "b1", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    // Dues row set REFUNDED + brother badge cleared (via $transaction).
    expect(mocks.txn).toHaveBeenCalledTimes(1);
    expect(mocks.duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "dp_1" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "b1" },
      data: expect.objectContaining({ duesPaid: false }),
    }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DUES_REFUNDED" }),
    }));
  });

  it("PARTIAL refund → DuesPayment REFUNDED but brother badge NOT cleared", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "charge.refunded",
      data: { object: { id: "ch_2", payment_intent: "pi_2", amount: 15000, amount_refunded: 5000, metadata: { subdomain: "alpha" } } },
    });
    mocks.duesFindFirst.mockResolvedValue({ id: "dp_2", brotherId: "b2", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.duesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "dp_2" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    // Partial: no brother badge clear, no transaction.
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });

  it("refund is idempotent — already-REFUNDED row is a no-op", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "charge.refunded",
      data: { object: { id: "ch_3", payment_intent: "pi_3", amount: 15000, amount_refunded: 15000, metadata: { subdomain: "alpha" } } },
    });
    mocks.duesFindFirst.mockResolvedValue({ id: "dp_3", brotherId: "b3", amountCents: 15000, year: "2026-fall", status: "REFUNDED" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.duesUpdate).not.toHaveBeenCalled();
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });

  it("dispute → DuesPayment REFUNDED and brother badge cleared (treated as full reversal)", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "charge.dispute.created",
      data: { object: { id: "dp_dispute", payment_intent: "pi_4", metadata: { subdomain: "alpha" } } },
    });
    mocks.duesFindFirst.mockResolvedValue({ id: "dp_4", brotherId: "b4", amountCents: 15000, year: "2026-fall", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.brotherUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "b4" },
      data: expect.objectContaining({ duesPaid: false }),
    }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "DUES_DISPUTED" }),
    }));
  });

  it("refund of an alumni donation → donation REFUNDED (no brother touch)", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "charge.refunded",
      data: { object: { id: "ch_5", payment_intent: "pi_5", amount: 5000, amount_refunded: 5000, metadata: { subdomain: "alpha" } } },
    });
    mocks.duesFindFirst.mockResolvedValue(null); // not a dues payment
    mocks.donationFindFirst.mockResolvedValue({ id: "ad_1", alumniId: "a1", amountCents: 5000, campaign: "Annual", status: "PAID" });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);
    expect(mocks.donationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ad_1" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "ALUMNI_DONATION_REFUNDED" }),
    }));
  });
});
