import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Pins the "live-when-configured, honest-mock-otherwise" contract that the
// 2026-06-24 integration-wiring pass relies on. lib/messaging-config resolves
// per-tenant SiteConfig first, then process.env. These tests fix the env path
// (SiteConfig mocked empty) so the gates can't silently regress into either:
//   - faking "live" on a partial credential set (Twilio 2-of-3), or
//   - treating a docs placeholder Resend key as usable.
//
// This is the exact behavior that keeps Twilio in the honest mock path while
// only TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN are on hand (no phone number yet).

vi.mock("@/lib/site-config", () => ({
  // No per-tenant overrides → every resolver falls through to process.env,
  // which is what a fresh single-tenant deploy + .env.local does.
  getSiteConfig: vi.fn(async () => ({}) as Record<string, string>),
}));

import {
  getTwilioConfig,
  getResendConfig,
  getListmonkConfig,
  getTextbeeConfig,
} from "@/lib/messaging-config";

const ENV_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "LISTMONK_URL",
  "LISTMONK_USER",
  "LISTMONK_PASS",
  "TEXTBEE_API_URL",
  "TEXTBEE_API_KEY",
  "TEXTBEE_DEVICE_ID",
] as const;

describe("messaging-config live-when-configured gates", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  describe("Twilio all-three-or-none gate", () => {
    it("goes LIVE only when SID + token + phone number are ALL present", async () => {
      process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
      process.env.TWILIO_AUTH_TOKEN = "tok_live_value";
      process.env.TWILIO_PHONE_NUMBER = "+18035551234";
      const cfg = await getTwilioConfig();
      expect(cfg.accountSid).toBeTruthy();
      expect(cfg.authToken).toBeTruthy();
      expect(cfg.phoneNumber).toBe("+18035551234");
    });

    it("stays MOCK (all-null, no fake send) with SID + token but NO phone number", async () => {
      // This is the exact on-hand state: account-sid.txt + auth-token.txt present,
      // no purchased from-number. The gate MUST return all-null so lib/sms.ts
      // never claims a real send.
      process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
      process.env.TWILIO_AUTH_TOKEN = "tok_live_value";
      // TWILIO_PHONE_NUMBER intentionally unset
      const cfg = await getTwilioConfig();
      expect(cfg.accountSid).toBeNull();
      expect(cfg.authToken).toBeNull();
      expect(cfg.phoneNumber).toBeNull();
    });
  });

  describe("Resend usable-key gate", () => {
    it("returns the key when a real re_ key is set", async () => {
      process.env.RESEND_API_KEY = "re_realKeyValue123456";
      const cfg = await getResendConfig();
      expect(cfg.apiKey).toBe("re_realKeyValue123456");
    });

    it("treats the docs placeholder re_xxxxx... as NOT configured (apiKey null)", async () => {
      process.env.RESEND_API_KEY = "re_xxxxxxxxxxxxxxxxxxxxxxxx";
      const cfg = await getResendConfig();
      expect(cfg.apiKey).toBeNull();
    });

    it("falls back to a NEUTRAL platform fromEmail when none set", async () => {
      const cfg = await getResendConfig();
      expect(cfg.fromEmail).toBe("no-reply@greekstack.vercel.app");
    });
  });

  describe("listmonk / textbee partial-config gates (Docker-down honesty)", () => {
    it("listmonk returns all-null when only the URL is set (partial)", async () => {
      process.env.LISTMONK_URL = "http://localhost:9000";
      // user + pass intentionally unset → must NOT half-configure
      const cfg = await getListmonkConfig();
      expect(cfg.url).toBeNull();
      expect(cfg.user).toBeNull();
      expect(cfg.pass).toBeNull();
    });

    it("listmonk goes LIVE (and normalizes a trailing /api) when fully set", async () => {
      process.env.LISTMONK_URL = "http://localhost:9000/api/";
      process.env.LISTMONK_USER = "api_admin";
      process.env.LISTMONK_PASS = "token";
      const cfg = await getListmonkConfig();
      expect(cfg.url).toBe("http://localhost:9000");
      expect(cfg.user).toBe("api_admin");
      expect(cfg.pass).toBe("token");
    });

    it("textbee returns all-null on a partial config", async () => {
      process.env.TEXTBEE_API_URL = "https://api.textbee.dev";
      const cfg = await getTextbeeConfig();
      expect(cfg.apiUrl).toBeNull();
      expect(cfg.apiKey).toBeNull();
      expect(cfg.deviceId).toBeNull();
    });
  });
});
