import { describe, it, expect } from "vitest";
import {
  isConnectChargesReady,
  getConnectAccountId,
  CONNECT_ACCOUNT_KEY,
  CONNECT_CHARGES_KEY,
} from "@/lib/stripe-connect";

// ---------------------------------------------------------------------------
// lib/stripe-connect.ts — the payout-routing SAFETY CONTRACT.
//
// isConnectChargesReady is the SINGLE gate the checkout routes consult before
// routing a charge to a chapter's own Stripe account. It must be true ONLY when
// the chapter has a connected account id AND connectChargesEnabled === "true".
// Any false-positive here would route money to a not-yet-verified account; any
// false-negative silently keeps legacy platform-collect behavior. Pin both.
// ---------------------------------------------------------------------------

describe("getConnectAccountId", () => {
  it("returns the trimmed account id when present", () => {
    expect(getConnectAccountId({ [CONNECT_ACCOUNT_KEY]: "  acct_123  " })).toBe("acct_123");
  });

  it('returns "" for a missing key', () => {
    expect(getConnectAccountId({})).toBe("");
  });

  it('returns "" for null / undefined cfg', () => {
    expect(getConnectAccountId(null)).toBe("");
    expect(getConnectAccountId(undefined)).toBe("");
  });

  it('returns "" for a whitespace-only value', () => {
    expect(getConnectAccountId({ [CONNECT_ACCOUNT_KEY]: "   " })).toBe("");
  });
});

describe("isConnectChargesReady — true only when account id AND charges-enabled flag", () => {
  it("is true with an account id and charges flag === 'true'", () => {
    expect(
      isConnectChargesReady({
        [CONNECT_ACCOUNT_KEY]: "acct_123",
        [CONNECT_CHARGES_KEY]: "true",
      }),
    ).toBe(true);
  });

  it("is false when the charges flag is missing", () => {
    expect(isConnectChargesReady({ [CONNECT_ACCOUNT_KEY]: "acct_123" })).toBe(false);
  });

  it("is false when the account id is missing even if the flag is 'true'", () => {
    expect(isConnectChargesReady({ [CONNECT_CHARGES_KEY]: "true" })).toBe(false);
  });

  it('is false when the charges flag is "false"', () => {
    expect(
      isConnectChargesReady({
        [CONNECT_ACCOUNT_KEY]: "acct_123",
        [CONNECT_CHARGES_KEY]: "false",
      }),
    ).toBe(false);
  });

  it("is false for a non-'true' truthy-looking flag value (strict equality)", () => {
    // Guards against a loose check — only the literal string "true" enables.
    for (const v of ["1", "TRUE", "yes", "on", "enabled"]) {
      expect(
        isConnectChargesReady({ [CONNECT_ACCOUNT_KEY]: "acct_123", [CONNECT_CHARGES_KEY]: v }),
      ).toBe(false);
    }
  });

  it("is false for empty / null / undefined cfg (legacy platform-collect)", () => {
    expect(isConnectChargesReady({})).toBe(false);
    expect(isConnectChargesReady(null)).toBe(false);
    expect(isConnectChargesReady(undefined)).toBe(false);
  });

  it("is false when the account id is whitespace even with the flag set", () => {
    expect(
      isConnectChargesReady({ [CONNECT_ACCOUNT_KEY]: "   ", [CONNECT_CHARGES_KEY]: "true" }),
    ).toBe(false);
  });
});
