import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression coverage for the Resend "unverified domain" auto-reroute in
// lib/email.ts. The canonical deploy sets RESEND_FROM_EMAIL to a custom domain
// that may not be verified in the Resend account; Resend rejects such sends with
// a 403 "domain is not verified" error. sendEmail() must detect that and retry
// from Resend's universally-allowed onboarding@resend.dev so transactional mail
// (password reset, alumni invite, booking confirmation) still lands.

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  getResendConfig: vi.fn(),
  getListmonkConfig: vi.fn(),
  getChapterIdentity: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

vi.mock("@/lib/messaging-config", () => ({
  getResendConfig: mocks.getResendConfig,
  getListmonkConfig: mocks.getListmonkConfig,
}));

vi.mock("@/lib/chapter-identity", () => ({
  getChapterIdentity: mocks.getChapterIdentity,
}));

import { sendEmail } from "@/lib/email";

const baseEmail = {
  to: "alum@example.com",
  subject: "Welcome",
  html: "<p>Hi</p>",
};

describe("sendEmail Resend domain fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // listmonk never configured → skip straight to Resend.
    mocks.getListmonkConfig.mockResolvedValue({ url: null, user: null, pass: null });
    mocks.getChapterIdentity.mockResolvedValue({
      chapterAttribution: "Phi Sig USC",
      fraternityName: "Phi Sigma Kappa",
    });
    mocks.getResendConfig.mockResolvedValue({
      apiKey: "re_live_key",
      fromEmail: "email@phisigusc.com", // a custom (possibly unverified) domain
    });
  });

  it("returns ok on a first-try success without re-routing", async () => {
    mocks.send.mockResolvedValueOnce({ id: "msg_1" });
    const res = await sendEmail(baseEmail);
    expect(res.ok).toBe(true);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    // First attempt uses the chapter's own From address.
    expect(mocks.send.mock.calls[0][0].from).toContain("email@phisigusc.com");
  });

  it("re-routes through onboarding@resend.dev when the From-domain is unverified", async () => {
    mocks.send
      .mockResolvedValueOnce({ error: { message: "The phisigusc.com domain is not verified." } })
      .mockResolvedValueOnce({ id: "msg_fallback" });

    const res = await sendEmail(baseEmail);

    expect(res.ok).toBe(true);
    expect((res as { id?: string }).id).toBe("msg_fallback");
    expect(mocks.send).toHaveBeenCalledTimes(2);
    // Fallback send uses the always-verified Resend shared sender, preserving
    // the chapter-aware From NAME.
    const fallbackFrom = mocks.send.mock.calls[1][0].from as string;
    expect(fallbackFrom).toContain("onboarding@resend.dev");
    expect(fallbackFrom).toContain("Phi Sig USC");
  });

  it("does NOT re-route on a non-domain error (e.g. invalid recipient)", async () => {
    mocks.send.mockResolvedValueOnce({ error: { message: "Invalid `to` field." } });
    const res = await sendEmail(baseEmail);
    expect(res.ok).toBe(false);
    // Only the original attempt — no pointless retry from the fallback sender.
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the From address is already the fallback sender", async () => {
    mocks.getResendConfig.mockResolvedValue({
      apiKey: "re_live_key",
      fromEmail: "onboarding@resend.dev",
    });
    mocks.send.mockResolvedValueOnce({ error: { message: "domain is not verified" } });
    const res = await sendEmail(baseEmail);
    expect(res.ok).toBe(false);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("stays in mock mode (no send) when no API key is configured", async () => {
    mocks.getResendConfig.mockResolvedValue({ apiKey: null, fromEmail: "x@y.com" });
    const res = await sendEmail(baseEmail);
    expect(res.ok).toBe(true);
    expect((res as { provider: string }).provider).toBe("mock");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
