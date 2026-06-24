import { describe, it, expect, vi, beforeEach } from "vitest";

// ── MONEY INTEGRITY (council HIGH #3): reconcile-stripe consumes the intro fee ─
// The dues_percentage plan bills the chapter a 1.5% intro rate on its FIRST dues
// cycle, then 3% after `dues.introFeeUsed` flips true. The webhook flips it on
// the first PAID dues payment — but webhooks get dropped, which is the entire
// reason the reconcile-stripe cron exists. Before the fix the cron applied the
// PAID transition but NOT the intro-fee flip, so a chapter whose first payment
// was confirmed by the cron would be billed the intro rate forever (permanent
// platform under-collection). The fix routes BOTH paths through the shared
// markDuesIntroFeeUsedFromSession helper. This test drives the cron end-to-end
// and asserts it flips dues.introFeeUsed -> "true" via siteConfig.upsert.

const mocks = vi.hoisted(() => {
  const upsert = vi.fn(async (_args: any): Promise<any> => ({}));
  const duesFindMany = vi.fn(async (): Promise<any[]> => []);
  const duesFindUnique = vi.fn(async (): Promise<any> => null);
  const duesUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherUpdate = vi.fn(async (): Promise<any> => ({}));
  const brotherFindUnique = vi.fn(async (): Promise<any> => ({ name: "Pat Paid" }));
  const auditCreate = vi.fn(async (): Promise<any> => ({}));
  const donationFindMany = vi.fn(async (): Promise<any[]> => []);
  const txn = vi.fn(async (ops: any[]): Promise<any> => Promise.all(ops));
  const db = {
    duesPayment: {
      findMany: duesFindMany,
      findUnique: duesFindUnique,
      update: duesUpdate,
    },
    brother: { update: brotherUpdate, findUnique: brotherFindUnique },
    alumniDonation: { findMany: donationFindMany, findUnique: vi.fn(), update: vi.fn() },
    alumniProfile: { findUnique: vi.fn() },
    auditLog: { create: auditCreate },
    siteConfig: { upsert },
    $transaction: txn,
  } as any;

  const sessionsRetrieve = vi.fn();
  const paymentIntentsRetrieve = vi.fn(async (): Promise<any> => ({ latest_charge: null }));
  const stripe = {
    checkout: { sessions: { retrieve: sessionsRetrieve } },
    paymentIntents: { retrieve: paymentIntentsRetrieve },
  };

  return {
    upsert, duesFindMany, duesFindUnique, duesUpdate, brotherUpdate,
    brotherFindUnique, auditCreate, donationFindMany, txn, db,
    sessionsRetrieve, paymentIntentsRetrieve, stripe,
  };
});

vi.mock("@/lib/prisma", () => ({
  // forEachTenant invokes the reconcile fn once with our single mock tenant db.
  forEachTenant: vi.fn(async (fn: any) => {
    const result = await fn(mocks.db, { subdomain: "alpha" });
    return [{ tenant: "alpha", ok: true, result }];
  }),
}));

vi.mock("@/lib/stripe", () => ({ getStripe: () => mocks.stripe }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  errorSink: vi.fn(),
}));

import { GET } from "@/app/api/cron/reconcile-stripe/route";

function cronReq() {
  // No CRON_SECRET in test env → localhost is allowed.
  return new Request("http://localhost/api/cron/reconcile-stripe", {
    method: "GET",
    headers: { host: "localhost" },
  });
}

const PENDING_DUES = {
  id: "dp1",
  brotherId: "b1",
  amountCents: 15000,
  year: "2026-fall",
  status: "PENDING",
  stripeSessionId: "cs_test_1",
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
  mocks.duesFindMany.mockResolvedValue([PENDING_DUES]);
  // The idempotency re-read returns the still-PENDING row so the PAID transition runs.
  mocks.duesFindUnique.mockResolvedValue({ ...PENDING_DUES });
  mocks.donationFindMany.mockResolvedValue([]);
});

describe("reconcile-stripe consumes the dues_percentage intro fee", () => {
  it("flips dues.introFeeUsed -> true when the paid session is a dues_percentage plan (intro not yet used)", async () => {
    mocks.sessionsRetrieve.mockResolvedValue({
      payment_status: "paid",
      status: "complete",
      payment_intent: "pi_1",
      metadata: { platformPlan: "dues_percentage", introFeeUsed: "false", subdomain: "alpha" },
    });

    const res = await GET(cronReq());
    expect(res.status).toBe(200);

    // The PAID transition ran...
    expect(mocks.txn).toHaveBeenCalledTimes(1);
    // ...AND the intro fee was consumed via siteConfig.upsert(key=dues.introFeeUsed -> "true").
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const arg = mocks.upsert.mock.calls[0][0];
    expect(arg.where.key).toBe("dues.introFeeUsed");
    expect(arg.update.value).toBe("true");
    expect(arg.create).toEqual({ key: "dues.introFeeUsed", value: "true" });
  });

  it("does NOT flip the flag for a non-dues_percentage plan", async () => {
    mocks.sessionsRetrieve.mockResolvedValue({
      payment_status: "paid",
      status: "complete",
      payment_intent: "pi_1",
      metadata: { platformPlan: "flat_monthly", subdomain: "alpha" },
    });

    await GET(cronReq());
    expect(mocks.txn).toHaveBeenCalledTimes(1); // payment still confirmed
    expect(mocks.upsert).not.toHaveBeenCalled(); // but no intro-fee write
  });

  it("does NOT re-flip when the checkout already snapshotted introFeeUsed=true", async () => {
    mocks.sessionsRetrieve.mockResolvedValue({
      payment_status: "paid",
      status: "complete",
      payment_intent: "pi_1",
      metadata: { platformPlan: "dues_percentage", introFeeUsed: "true", subdomain: "alpha" },
    });

    await GET(cronReq());
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
