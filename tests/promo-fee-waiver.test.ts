import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  isFeeWaiverPromo,
  isPromoValid,
  classifyPromo,
  applyPromoToFees,
  feeWaiverAllowlist,
  feeWaiverMaxRedemptions,
  feeWaiverRedeemBy,
} from "@/lib/promo-server";
import { isMarketingPromo, MARKETING_PROMO_CODES } from "@/lib/promo";
import { POST as validatePromo } from "@/app/api/onboard/validate-promo/route";

/**
 * P1 #2 — full-fee-waiver coupon hardening.
 *
 * The waiver code is now SERVER-ONLY, allowlisted (env FEE_WAIVER_CODES with a
 * legacy fallback), redemption-capped, and expirable — and the literal no longer
 * ships in the client bundle. These tests pin: (a) the server allowlist/expiry
 * contract, (b) that the client-safe module can NOT self-grant the waiver, and
 * (c) that the validate endpoint mirrors the server rules.
 */

const FEES = { platformCents: 5000, rushCents: 20000 };

afterEach(() => {
  vi.unstubAllEnvs();
});

async function validate(code: unknown) {
  const req = new Request("https://x/api/onboard/validate-promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const res = await validatePromo(req);
  return res.json() as Promise<{ ok: boolean; valid: boolean; waiver: boolean }>;
}

describe("fee-waiver allowlist (env-driven, REQUIRES explicit config)", () => {
  it("grants NOTHING when FEE_WAIVER_CODES is UNSET (no hardcoded fallback)", () => {
    // P2c: an unconfigured env must NOT default-grant the forever-100%-off
    // coupon. The legacy `bensachwitzrocks` code no longer works by omission —
    // the allowlist is empty until the operator explicitly sets the env.
    vi.stubEnv("FEE_WAIVER_CODES", undefined as any);
    expect(feeWaiverAllowlist()).toEqual([]);
    expect(isFeeWaiverPromo("bensachwitzrocks")).toBe(false);
    expect(isFeeWaiverPromo("BENSACHWITZROCKS")).toBe(false);
  });

  it("works when FEE_WAIVER_CODES is explicitly CONFIGURED (case/space-insensitive)", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    expect(feeWaiverAllowlist()).toEqual(["bensachwitzrocks"]);
    expect(isFeeWaiverPromo("bensachwitzrocks")).toBe(true);
    expect(isFeeWaiverPromo("BENSACHWITZROCKS")).toBe(true);
    expect(isFeeWaiverPromo("  bensachwitzrocks  ")).toBe(true);
  });

  it("honors a custom multi-code allowlist and rejects codes outside it", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "founder-2026, ops-comp");
    expect(feeWaiverAllowlist()).toEqual(["founder-2026", "ops-comp"]);
    expect(isFeeWaiverPromo("FOUNDER-2026")).toBe(true);
    expect(isFeeWaiverPromo("ops-comp")).toBe(true);
    // A code not on the configured allowlist never grants the waiver.
    expect(isFeeWaiverPromo("bensachwitzrocks")).toBe(false);
  });

  it("disables the waiver entirely when FEE_WAIVER_CODES is empty string", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "");
    expect(feeWaiverAllowlist()).toEqual([]);
    expect(isFeeWaiverPromo("bensachwitzrocks")).toBe(false);
  });

  it("rejects unknown / empty / non-string codes even when the env is configured", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    expect(isFeeWaiverPromo("WELCOME100")).toBe(false);
    expect(isFeeWaiverPromo("bensachwitz")).toBe(false);
    expect(isFeeWaiverPromo("")).toBe(false);
    expect(isFeeWaiverPromo(null)).toBe(false);
    expect(isFeeWaiverPromo(undefined)).toBe(false);
  });
});

describe("fee-waiver expiry + redemption cap", () => {
  it("refuses an allowlisted code once past FEE_WAIVER_EXPIRES_AT", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    vi.stubEnv("FEE_WAIVER_EXPIRES_AT", "2000-01-01T00:00:00Z");
    expect(feeWaiverRedeemBy()?.getTime()).toBe(Date.parse("2000-01-01T00:00:00Z"));
    expect(isFeeWaiverPromo("bensachwitzrocks")).toBe(false);
  });

  it("still accepts before an expiry that is in the future", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    vi.stubEnv("FEE_WAIVER_EXPIRES_AT", "2999-01-01T00:00:00Z");
    expect(isFeeWaiverPromo("bensachwitzrocks")).toBe(true);
  });

  it("defaults the redemption cap to 5 and honors an override", () => {
    vi.stubEnv("FEE_WAIVER_MAX_REDEMPTIONS", undefined as any);
    expect(feeWaiverMaxRedemptions()).toBe(5);
    vi.stubEnv("FEE_WAIVER_MAX_REDEMPTIONS", "2");
    expect(feeWaiverMaxRedemptions()).toBe(2);
    vi.stubEnv("FEE_WAIVER_MAX_REDEMPTIONS", "0"); // invalid → default
    expect(feeWaiverMaxRedemptions()).toBe(5);
  });
});

describe("applyPromoToFees + isPromoValid", () => {
  it("a CONFIGURED waiver code zeroes BOTH fees (100% off)", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    const out = applyPromoToFees("bensachwitzrocks", FEES);
    expect(out).toEqual({ platformCents: 0, rushCents: 0, waived: true });
  });

  it("an UNKNOWN code leaves both fees unchanged", () => {
    const out = applyPromoToFees("WELCOME100", FEES);
    expect(out).toEqual({ platformCents: 5000, rushCents: 20000, waived: false });
  });

  it("does NOT waive fees for the legacy code when the env is unset (no fallback grant)", () => {
    vi.stubEnv("FEE_WAIVER_CODES", undefined as any);
    const out = applyPromoToFees("bensachwitzrocks", FEES);
    expect(out).toEqual({ platformCents: 5000, rushCents: 20000, waived: false });
  });

  it("isPromoValid accepts marketing codes AND a CONFIGURED waiver", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    expect(isPromoValid("WELCOME100")).toBe(true);
    expect(isPromoValid("bensachwitzrocks")).toBe(true);
    expect(isPromoValid("nope")).toBe(false);
  });

  it("isPromoValid still accepts marketing codes but NOT the waiver when env is unset", () => {
    vi.stubEnv("FEE_WAIVER_CODES", undefined as any);
    expect(isPromoValid("WELCOME100")).toBe(true);
    expect(isPromoValid("bensachwitzrocks")).toBe(false);
  });
});

describe("CLIENT cannot self-grant the waiver", () => {
  it("the client-safe module does not recognize the waiver code as valid", () => {
    // isMarketingPromo is the ONLY promo check available to the client bundle,
    // and it must never treat a waiver code as valid.
    expect(isMarketingPromo("bensachwitzrocks")).toBe(false);
    expect(MARKETING_PROMO_CODES).not.toContain("bensachwitzrocks");
  });

  it("the client-safe lib/promo.ts source contains no waiver literal", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "lib", "promo.ts"), "utf8");
    expect(src.toLowerCase()).not.toContain("bensachwitz");
  });

  it("the client wizard does not import the server-only waiver module or hardcode the code", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "app", "onboard", "onboard-wizard.tsx"),
      "utf8",
    );
    expect(src.toLowerCase()).not.toContain("bensachwitz");
    expect(src).not.toContain("promo-server");
  });
});

describe("validate-promo endpoint mirrors the server rules", () => {
  it("accepts a marketing code (not a waiver)", async () => {
    const out = await validate("WELCOME100");
    expect(out).toMatchObject({ ok: true, valid: true, waiver: false });
  });

  it("accepts a CONFIGURED waiver code and flags it as a waiver", async () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    const out = await validate("bensachwitzrocks");
    expect(out).toMatchObject({ ok: true, valid: true, waiver: true });
  });

  it("does NOT flag the waiver for the legacy code when the env is unset (no fallback grant)", async () => {
    vi.stubEnv("FEE_WAIVER_CODES", undefined as any);
    const out = await validate("bensachwitzrocks");
    expect(out).toMatchObject({ ok: true, valid: false, waiver: false });
  });

  it("rejects a random guessed code (client can't self-grant via the endpoint)", async () => {
    const out = await validate("totally-made-up-code");
    expect(out).toMatchObject({ ok: true, valid: false, waiver: false });
  });

  it("does not flag the waiver once the allowlist excludes it", async () => {
    vi.stubEnv("FEE_WAIVER_CODES", "some-other-code");
    const out = await validate("bensachwitzrocks");
    expect(out).toMatchObject({ ok: true, valid: false, waiver: false });
  });

  it("classifyPromo agrees with the endpoint shape (waiver requires configured env)", () => {
    vi.stubEnv("FEE_WAIVER_CODES", "bensachwitzrocks");
    expect(classifyPromo("bensachwitzrocks")).toEqual({ valid: true, waiver: true });
    expect(classifyPromo("WELCOME100")).toEqual({ valid: true, waiver: false });
    expect(classifyPromo("xxx")).toEqual({ valid: false, waiver: false });
  });
});
