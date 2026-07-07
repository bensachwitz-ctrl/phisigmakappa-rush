import { describe, it, expect } from "vitest";
import {
  computeVerificationFingerprint,
  DEFAULT_CONSENT_TEXT,
} from "@/lib/esign";

// ---------------------------------------------------------------------------
// lib/esign.ts verification fingerprint — evidentiary binding hardening.
//
// Previously the printed "Verification Hash" was sha256(name|email|ip|timestamp)
// and the agreement text was only DRAWN, never hashed — so the hash had NO
// cryptographic binding to the exact agreement the signer accepted. The
// fingerprint now also hashes the agreement text, so a different agreement
// produces a different hash (real signature↔document binding).
// ---------------------------------------------------------------------------

const base = {
  name: "Jane Doe",
  email: "jane@stateu.edu",
  ipAddress: "203.0.113.7",
};
const TS = "2026-07-07T12:00:00.000Z";

describe("computeVerificationFingerprint", () => {
  it("is deterministic for identical inputs", () => {
    expect(computeVerificationFingerprint(base, TS)).toBe(
      computeVerificationFingerprint(base, TS),
    );
  });

  it("is a 32-char uppercase hex string", () => {
    expect(computeVerificationFingerprint(base, TS)).toMatch(/^[0-9A-F]{32}$/);
  });

  it("CHANGES when the agreement text changes (the binding)", () => {
    const withDefault = computeVerificationFingerprint(
      { ...base, consentText: DEFAULT_CONSENT_TEXT },
      TS,
    );
    const withAmended = computeVerificationFingerprint(
      { ...base, consentText: DEFAULT_CONSENT_TEXT + " Amended clause v2." },
      TS,
    );
    expect(withAmended).not.toBe(withDefault);
  });

  it("changes when signer identity / ip / timestamp change", () => {
    const ref = computeVerificationFingerprint(base, TS);
    expect(computeVerificationFingerprint({ ...base, name: "John Roe" }, TS)).not.toBe(ref);
    expect(computeVerificationFingerprint({ ...base, ipAddress: "198.51.100.9" }, TS)).not.toBe(ref);
    expect(computeVerificationFingerprint(base, "2026-07-07T12:00:01.000Z")).not.toBe(ref);
  });

  it("an omitted consentText hashes the DEFAULT text (same as passing it explicitly)", () => {
    expect(computeVerificationFingerprint(base, TS)).toBe(
      computeVerificationFingerprint({ ...base, consentText: DEFAULT_CONSENT_TEXT }, TS),
    );
  });
});
