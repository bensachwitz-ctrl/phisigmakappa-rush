import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Item-6: onboarding now REQUIRES a card (free first month via trial) + a ────
// receipt email on launch. Source-pins so the "skip without a card" path can't
// silently return and the receipt block stays wired.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);

describe("onboard wizard requires a card (item 6)", () => {
  const src = readFileSync(root("app/onboard/onboard-wizard.tsx"), "utf8");

  it("removed the 'skip / start free without a card' button + handler", () => {
    expect(/Skip - start free without a card/.test(src)).toBe(false);
    expect(/function skipPayment/.test(src)).toBe(false);
  });

  it("the payment step Continue is gated on a verified card (returns without stripe/card)", () => {
    // goNext for the payment step still requires stripe + card before advancing.
    expect(src).toMatch(/if \(!stripe \|\| !card\) return;/);
  });

  it("no visible copy promises a card-free monthly launch", () => {
    expect(/No card required - you.{0,4}re launching free/.test(src)).toBe(false);
    expect(/skip and add it later/.test(src)).toBe(false);
  });
});

describe("onboard route emails a receipt when a card is on file (item 6)", () => {
  const src = readFileSync(root("app/api/onboard/route.ts"), "utf8");

  it("builds a receipt block (payment method + charged today) gated on cardProvided", () => {
    expect(src).toMatch(/receiptRowsHtml/);
    expect(src).toMatch(/Charged today/);
    expect(src).toMatch(/Card on file/);
  });

  it("still creates the first-month-free trial subscription", () => {
    expect(src).toMatch(/trial_period_days = 30/);
  });
});
