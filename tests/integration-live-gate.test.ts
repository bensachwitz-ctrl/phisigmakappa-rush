import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Pins the env-gated live/mock contract for the remaining integrations touched
// by the 2026-06-24 wiring pass: Stripe (getStripe), Cloudinary, and Tavily
// auto-enrichment. Each must construct/activate the real provider ONLY when its
// credentials are present, and degrade to an honest fallback otherwise — never
// fake the live path.

vi.mock("@/lib/site-config", () => ({
  getSiteConfig: vi.fn().mockResolvedValue({}),
}));

import { getStripe } from "@/lib/stripe";

describe("Stripe getStripe() env gate", () => {
  const saved = process.env.STRIPE_SECRET_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = saved;
    vi.resetModules();
  });

  it("returns null (graceful 503 path) when STRIPE_SECRET_KEY is unset", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(getStripe()).toBeNull();
  });

  it("constructs a live Stripe client when the secret key is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummyKeyForUnitTest";
    const client = getStripe();
    expect(client).not.toBeNull();
    // Sanity: a real Stripe instance exposes the resources we call.
    expect(client && typeof client.checkout?.sessions?.create).toBe("function");
  });
});

describe("Cloudinary isCloudinaryConfigured() env gate", () => {
  const KEYS = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ] as const;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    vi.resetModules();
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.resetModules();
  });

  it("is FALSE (Blob fallback) when no Cloudinary creds are set", async () => {
    const { isCloudinaryConfigured, optimizedUrl } = await import("@/lib/cloudinary");
    expect(isCloudinaryConfigured()).toBe(false);
    // Unconfigured → URLs pass through untouched (no broken rewrite).
    const blobUrl = "https://blob.vercel-storage.com/x/headshot.png";
    expect(optimizedUrl(blobUrl, { w: 200 })).toBe(blobUrl);
  });

  it("is TRUE (live delivery) when all three server creds are set", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456789012345";
    process.env.CLOUDINARY_API_SECRET = "abcdefghijklmnopqrstuvwxyz0";
    const { isCloudinaryConfigured } = await import("@/lib/cloudinary");
    expect(isCloudinaryConfigured()).toBe(true);
  });
});

describe("Tavily auto-enrichment env gate (honest manual fallback)", () => {
  const saved = process.env.TAVILY_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = saved;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns source 'search-links' (manual mode) when TAVILY_API_KEY is unset", async () => {
    delete process.env.TAVILY_API_KEY;
    const { enrichRushee } = await import("@/lib/enrich");
    const res = await enrichRushee({ name: "Jane Doe" });
    expect(res.source).toBe("search-links");
    // Honest copy that tells the owner how to upgrade — not a fake result.
    expect(res.summary).toContain("manual mode");
    expect(res.links?.length ?? 0).toBeGreaterThan(0);
  });
});
