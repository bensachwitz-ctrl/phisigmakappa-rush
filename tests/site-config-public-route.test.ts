import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression coverage for GET /api/site-config/public — the endpoint the
// client-safe <PublicFooterClient/> fetches so "use client" pages (alumni
// onboard, reset-password, alumni register) can render the footer without
// rendering the async server <PublicFooter/> in a client tree.
//
// CRITICAL invariant: the route must ONLY return the explicit footer-display
// allow-list. It must NEVER echo secrets that may live in the same SiteConfig
// KV store (Stripe keys, webhook signing secrets, listmonk creds).

const mocks = vi.hoisted(() => ({
  getSiteConfig: vi.fn(),
}));

vi.mock("@/lib/site-config", () => ({
  getSiteConfig: mocks.getSiteConfig,
}));

import { GET } from "@/app/api/site-config/public/route";

describe("GET /api/site-config/public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns allow-listed footer keys and DROPS everything else (incl. secrets)", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      // Public footer keys — should pass through.
      "chapter.fraternityName": "Phi Sigma Kappa",
      "chapter.greekLetters": "Gamma Triton",
      "contact.advisorName": "Jane Doe",
      "antiHazing.hotlineUrl": "https://hazingprevention.org/help/",
      // Secrets / non-footer keys — must be dropped.
      "dues.stripePublishableKey": "pk_live_should_not_leak",
      "dues.stripeWebhookSecret": "whsec_super_secret",
      "resend.apiKey": "re_live_secret",
      "listmonk.pass": "topsecret",
      "twilio.authToken": "twilio_secret",
      "some.random.key": "value",
    });

    const res = await GET();
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.config["chapter.fraternityName"]).toBe("Phi Sigma Kappa");
    expect(json.config["contact.advisorName"]).toBe("Jane Doe");

    // The security assertion: no secret/non-allow-listed key ever appears.
    expect(json.config["dues.stripePublishableKey"]).toBeUndefined();
    expect(json.config["dues.stripeWebhookSecret"]).toBeUndefined();
    expect(json.config["resend.apiKey"]).toBeUndefined();
    expect(json.config["listmonk.pass"]).toBeUndefined();
    expect(json.config["twilio.authToken"]).toBeUndefined();
    expect(json.config["some.random.key"]).toBeUndefined();

    // Serialize the whole payload and ensure no secret VALUE leaked anywhere.
    const blob = JSON.stringify(json);
    expect(blob).not.toContain("pk_live_should_not_leak");
    expect(blob).not.toContain("whsec_super_secret");
    expect(blob).not.toContain("re_live_secret");
  });

  it("degrades to an empty config (still ok) when getSiteConfig throws", async () => {
    mocks.getSiteConfig.mockRejectedValue(new Error("db down"));
    const res = await GET();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.config).toEqual({});
  });

  it("omits allow-listed keys that are absent rather than emitting undefined", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      "chapter.fraternityName": "Beta Sigma",
    });
    const res = await GET();
    const json = await res.json();
    expect(Object.keys(json.config)).toEqual(["chapter.fraternityName"]);
  });
});
