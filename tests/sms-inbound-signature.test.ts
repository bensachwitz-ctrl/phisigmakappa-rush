import { describe, it, expect, afterEach, vi } from "vitest";
import crypto from "crypto";
import {
  signatureMatchesToken,
  verifyTwilioSignatureMultiToken,
} from "@/lib/twilio-verify";

// ---------------------------------------------------------------------------
// Tenant-aware Twilio inbound-signature verification.
//
// Twilio signs each inbound webhook with the auth token of the ACCOUNT that
// owns the receiving number. The platform supports per-tenant Twilio creds, so
// a chapter on its OWN Twilio account signs a STOP with its OWN token — NOT the
// platform env token. Verifying against only process.env.TWILIO_AUTH_TOKEN
// would 403 that chapter's STOP and the opt-out would never record (TCPA harm).
//
// These tests build a REAL Twilio signature (HMAC-SHA1 of URL + sorted params,
// base64) with an arbitrary token and assert the multi-token verifier accepts
// it when that token is among the candidates and rejects it otherwise.
// ---------------------------------------------------------------------------

const URL_UNDER_TEST = "https://phisig.greekstack.vercel.app/api/sms/inbound";

/** Reproduce Twilio's request-signature algorithm for test fixtures. */
function twilioSign(
  url: string,
  params: Record<string, string>,
  token: string
): string {
  let signed = url;
  for (const k of Object.keys(params).sort()) signed += k + params[k];
  return crypto.createHmac("sha1", token).update(signed, "utf-8").digest("base64");
}

const STOP_PARAMS = { From: "+18035551234", Body: "STOP", To: "+18035559999" };

describe("signatureMatchesToken", () => {
  it("accepts a signature produced with the same token", () => {
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "tenant-token-abc");
    expect(
      signatureMatchesToken(URL_UNDER_TEST, STOP_PARAMS, sig, "tenant-token-abc")
    ).toBe(true);
  });

  it("rejects a signature produced with a different token", () => {
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "tenant-token-abc");
    expect(
      signatureMatchesToken(URL_UNDER_TEST, STOP_PARAMS, sig, "platform-env-token")
    ).toBe(false);
  });

  it("rejects when params are tampered with after signing", () => {
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "tenant-token-abc");
    const tampered = { ...STOP_PARAMS, From: "+19998887777" };
    expect(
      signatureMatchesToken(URL_UNDER_TEST, tampered, sig, "tenant-token-abc")
    ).toBe(false);
  });

  it("rejects an empty signature or empty token", () => {
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "tenant-token-abc");
    expect(signatureMatchesToken(URL_UNDER_TEST, STOP_PARAMS, "", "tenant-token-abc")).toBe(false);
    expect(signatureMatchesToken(URL_UNDER_TEST, STOP_PARAMS, sig, "")).toBe(false);
  });

  it("rejects a signature of a different length (avoids timing attack exception)", () => {
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "tenant-token-abc");
    expect(signatureMatchesToken(URL_UNDER_TEST, STOP_PARAMS, sig + "x", "tenant-token-abc")).toBe(false);
    expect(signatureMatchesToken(URL_UNDER_TEST, STOP_PARAMS, sig.slice(0, -1), "tenant-token-abc")).toBe(false);
  });

  it("accepts when params are empty", () => {
    const sig = twilioSign(URL_UNDER_TEST, {}, "tenant-token-abc");
    expect(signatureMatchesToken(URL_UNDER_TEST, {}, sig, "tenant-token-abc")).toBe(true);
  });

  it("handles special characters in params correctly", () => {
    const specialParams = { "Body": "Hello 🌍! This is a test & special # characters.", "To": "+1234567890", "From": "+0987654321" };
    const sig = twilioSign(URL_UNDER_TEST, specialParams, "tenant-token-abc");
    expect(signatureMatchesToken(URL_UNDER_TEST, specialParams, sig, "tenant-token-abc")).toBe(true);
  });
});

describe("verifyTwilioSignatureMultiToken — tenant-aware acceptance", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ACCEPTS a STOP signed with a tenant-configured token (the core bug fix)", () => {
    const tenantToken = "chapter-own-twilio-token";
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, tenantToken);
    // Candidate list contains the platform env token AND the tenant token.
    const accepted = verifyTwilioSignatureMultiToken(
      URL_UNDER_TEST,
      STOP_PARAMS,
      sig,
      ["platform-env-token", tenantToken]
    );
    expect(accepted).toBe(true);
  });

  it("REJECTS a STOP signed with a tenant token NOT in the candidate set", () => {
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "unknown-rogue-token");
    expect(
      verifyTwilioSignatureMultiToken(URL_UNDER_TEST, STOP_PARAMS, sig, [
        "platform-env-token",
        "some-tenant-token",
      ])
    ).toBe(false);
  });

  it("accepts a STOP signed with the platform env token", () => {
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "platform-env-token");
    expect(
      verifyTwilioSignatureMultiToken(URL_UNDER_TEST, STOP_PARAMS, sig, [
        "platform-env-token",
        "a-tenant-token",
      ])
    ).toBe(true);
  });

  it("de-dupes candidate tokens and ignores blanks", () => {
    const tenantToken = "dup-token";
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, tenantToken);
    expect(
      verifyTwilioSignatureMultiToken(URL_UNDER_TEST, STOP_PARAMS, sig, [
        "",
        tenantToken,
        tenantToken,
        "   ",
      ])
    ).toBe(true);
  });

  it("fail-closed in production when NO token is configured anywhere", () => {
    vi.stubEnv("NODE_ENV", "production");
    const sig = twilioSign(URL_UNDER_TEST, STOP_PARAMS, "whatever");
    expect(verifyTwilioSignatureMultiToken(URL_UNDER_TEST, STOP_PARAMS, sig, [])).toBe(false);
  });

  it("fail-open in dev/test when NO token is configured (local testing)", () => {
    // Make the non-prod path explicit so this never depends on the runner's
    // ambient NODE_ENV (vitest may default it to "production").
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
    expect(verifyTwilioSignatureMultiToken(URL_UNDER_TEST, STOP_PARAMS, null, [])).toBe(true);
  });

  it("rejects a missing signature header even with candidate tokens present", () => {
    expect(
      verifyTwilioSignatureMultiToken(URL_UNDER_TEST, STOP_PARAMS, null, ["t1", "t2"])
    ).toBe(false);
  });
});
