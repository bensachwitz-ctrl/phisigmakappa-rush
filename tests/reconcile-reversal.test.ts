import { describe, it, expect, vi, beforeEach } from "vitest";

// ── MONEY INTEGRITY (P2): reconcile-stripe backstops DROPPED refund/dispute webhooks ─
// The webhook (charge.refunded / charge.dispute.*) is the primary path that
// reverses a PAID row when money is given back. A DROPPED such webhook leaves a
// refunded/disputed DuesPayment stuck PAID — money left Stripe while the ledger
// still claims it AND the brother keeps a paid badge. This suite drives the cron
// end-to-end and asserts it lists recent refunds/disputes from Stripe and applies
// the SAME reversal the webhook would to a still-PAID row.

const mocks = vi.hoisted(() => {
  const duesFindMany = vi.fn(async (args: any): Promise<any[]> =>
    args?.where?.status === "PAID" ? [STUCK_PAID_DUES] : [],
  );
  const duesFindUnique = vi.fn(async (): Promise<any> => ({ status: "PAID" }));
  const duesUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherFindUnique = vi.fn(async (): Promise<any> => ({ name: "Pat Paid" }));
  const auditCreate = vi.fn(async (): Promise<any> => ({}));
  const donationFindMany = vi.fn(async (): Promise<any[]> => []);
  const donationFindUnique = vi.fn(async (): Promise<any> => ({ status: "PAID" }));
  const donationUpdate = vi.fn(async (): Promise<any> => ({}));
  const alumniFindUnique = vi.fn(async (): Promise<any> => ({ fullName: "Al Um" }));
  const txn = vi.fn(async (ops: any[]): Promise<any> => Promise.all(ops));
  const db = {
    duesPayment: { findMany: duesFindMany, findUnique: duesFindUnique, update: duesUpdate },
    brother: { update: brotherUpdate, findUnique: brotherFindUnique },
    alumniDonation: { findMany: donationFindMany, findUnique: donationFindUnique, update: donationUpdate },
    alumniProfile: { findUnique: alumniFindUnique },
    auditLog: { create: auditCreate },
    siteConfig: { upsert: vi.fn() },
    $transaction: txn,
  } as any;

  const sessionsRetrieve = vi.fn();
  const paymentIntentsRetrieve = vi.fn(async (): Promise<any> => ({ latest_charge: null }));
  const refundsList = vi.fn(() => ({ autoPagingToArray: async () => [] as any[] }));
  const disputesList = vi.fn(() => ({ autoPagingToArray: async () => [] as any[] }));
  const stripe = {
    checkout: { sessions: { retrieve: sessionsRetrieve } },
    paymentIntents: { retrieve: paymentIntentsRetrieve },
    refunds: { list: refundsList },
    disputes: { list: disputesList },
  };

  return {
    duesFindMany, duesFindUnique, duesUpdate, brotherUpdate, brotherFindUnique,
    auditCreate, donationFindMany, donationFindUnique, donationUpdate, alumniFindUnique,
    txn, db, sessionsRetrieve, refundsList, disputesList, stripe,
  };
});

// A dues payment the webhook confirmed PAID whose refund/dispute webhook was
// dropped — its PaymentIntent is what the reversal list matches on.
const STUCK_PAID_DUES = {
  id: "dp1",
  brotherId: "b1",
  amountCents: 15000,
  year: "2026-fall",
  status: "PAID",
  stripePaymentIntentId: "pi_1",
};

vi.mock("@/lib/prisma", () => ({
  forEachTenant: vi.fn(async (fn: any) => {
    const result = await fn(mocks.db, { subdomain: "alpha" });
    return [{ tenant: "alpha", ok: true, result }];
  }),
  centralDb: { tenant: { findMany: vi.fn(async () => []) } },
}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => mocks.stripe }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  errorSink: vi.fn(),
}));

import { GET } from "@/app/api/cron/reconcile-stripe/route";

function cronReq() {
  return new Request("http://localhost/api/cron/reconcile-stripe", {
    method: "GET",
    headers: { host: "localhost" },
  });
}

function setReversals(opts: { refunds?: any[]; disputes?: any[] }) {
  mocks.refundsList.mockReturnValue({ autoPagingToArray: async () => opts.refunds ?? [] });
  mocks.disputesList.mockReturnValue({ autoPagingToArray: async () => opts.disputes ?? [] });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
  mocks.duesFindMany.mockImplementation(async (args: any) =>
    args?.where?.status === "PAID" ? [STUCK_PAID_DUES] : [],
  );
  mocks.duesFindUnique.mockResolvedValue({ status: "PAID" });
  mocks.donationFindMany.mockResolvedValue([]);
  setReversals({});
});

describe("reconcile-stripe reverses dropped refund/dispute webhooks", () => {
  it("FULL refund → stuck-PAID dues row REFUNDED and brother badge cleared", async () => {
    setReversals({
      refunds: [{ payment_intent: "pi_1", amount: 15000, charge: { amount: 15000, amount_refunded: 15000 } }],
    });

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reversed).toBe(1);

    expect(mocks.duesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "dp1" }, data: expect.objectContaining({ status: "REFUNDED" }) }),
    );
    expect(mocks.brotherUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "b1" }, data: expect.objectContaining({ duesPaid: false }) }),
    );
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "DUES_REFUNDED", actorName: "stripe-reconcile" }) }),
    );
  });

  it("PARTIAL refund → dues row REFUNDED but brother badge NOT cleared", async () => {
    setReversals({
      refunds: [{ payment_intent: "pi_1", amount: 5000, charge: { amount: 15000, amount_refunded: 5000 } }],
    });

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    expect(mocks.duesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "dp1" }, data: expect.objectContaining({ status: "REFUNDED" }) }),
    );
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });

  it("DISPUTE (not won) → dues REFUNDED and badge cleared, audited as disputed", async () => {
    setReversals({ disputes: [{ payment_intent: "pi_1", status: "needs_response" }] });

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    expect(mocks.brotherUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duesPaid: false }) }),
    );
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "DUES_DISPUTED" }) }),
    );
  });

  it("WON dispute → NOT a reversal (funds restored); row left untouched", async () => {
    setReversals({ disputes: [{ payment_intent: "pi_1", status: "won" }] });

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reversed).toBe(0);
    expect(mocks.duesUpdate).not.toHaveBeenCalled();
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });

  it("idempotent: if the webhook already flipped the row to REFUNDED, the sweep is a no-op", async () => {
    setReversals({
      refunds: [{ payment_intent: "pi_1", amount: 15000, charge: { amount: 15000, amount_refunded: 15000 } }],
    });
    // The fresh re-read sees the row already reversed → nothing to apply.
    mocks.duesFindUnique.mockResolvedValue({ status: "REFUNDED" });

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reversed).toBe(0);
    expect(mocks.duesUpdate).not.toHaveBeenCalled();
    expect(mocks.brotherUpdate).not.toHaveBeenCalled();
  });

  it("no recent refunds/disputes → reversal sweep is a clean no-op", async () => {
    setReversals({});
    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reversed).toBe(0);
    expect(mocks.duesUpdate).not.toHaveBeenCalled();
  });
});
