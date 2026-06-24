import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Dues webhook signing-secret source-of-truth pin (fail-closed) ────────────
// Stripe POSTs the dues webhook server-to-server with NO chapter subdomain on
// the Host. The route MUST verify signatures with the platform-GLOBAL
// `process.env.STRIPE_WEBHOOK_SECRET` only. The old code fell back to a
// per-chapter `dues.stripeWebhookSecret` resolved through the Host proxy — which
// on a subdomain-less webhook POST resolves to the EMPTY public schema, so it
// could never read a real chapter secret (a latent fail-closed bug) and could
// silently read a wrong public-schema value. This suite proves:
//   1. With the global env UNSET, the route fails CLOSED (503) even if a
//      per-chapter secret exists in site-config — it never falls back to it.
//   2. With the global env SET, signature verification uses exactly that value.

const mocks = vi.hoisted(() => {
  const constructEvent = vi.fn();
  // getSiteConfig is mocked to RETURN a per-chapter secret so we can prove the
  // route does NOT consult it. (The route no longer imports getSiteConfig at
  // all; this mock is harmless if unused and guards against a regression that
  // re-adds the fallback.)
  const getSiteConfig = vi.fn(async () => ({
    "dues.stripeWebhookSecret": "whsec_PER_CHAPTER_SHOULD_BE_IGNORED",
  }));
  const db = {
    duesPayment: { findUnique: vi.fn(), findFirst: vi.fn() },
    alumniDonation: { findUnique: vi.fn(), findFirst: vi.fn() },
    brother: { findUnique: vi.fn() },
    alumniProfile: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    siteConfig: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops)),
  } as any;
  return { constructEvent, getSiteConfig, db };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.db,
  getTenantClient: () => mocks.db,
  forEachTenant: vi.fn(async () => {}),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}));
vi.mock("@/lib/site-config", () => ({ getSiteConfig: mocks.getSiteConfig }));
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
    headers: { "stripe-signature": "sig_test" },
  });
}

describe("dues webhook — STRIPE_WEBHOOK_SECRET is the sole signing-secret source", () => {
  const ORIGINAL = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL;
  });

  it("fails CLOSED with 503 when the global env is unset — never falls back to the per-chapter secret", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const res = await POST(webhookReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/not configured/i);

    // The route must NOT have attempted verification at all (no secret to use)…
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    // …and must NOT have consulted the per-chapter site-config fallback.
    expect(mocks.getSiteConfig).not.toHaveBeenCalled();
  });

  it("verifies the signature using exactly the global env value", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_GLOBAL_TRUTH";
    mocks.constructEvent.mockReturnValue({ type: "ignored.event", data: { object: { metadata: {} } } });

    const res = await POST(webhookReq());
    expect(res.status).toBe(200);

    expect(mocks.constructEvent).toHaveBeenCalledTimes(1);
    // 3rd arg to Stripe.webhooks.constructEvent is the signing secret.
    expect(mocks.constructEvent).toHaveBeenCalledWith("{}", "sig_test", "whsec_GLOBAL_TRUTH");
    // Still never reads the per-chapter secret.
    expect(mocks.getSiteConfig).not.toHaveBeenCalled();
  });
});
