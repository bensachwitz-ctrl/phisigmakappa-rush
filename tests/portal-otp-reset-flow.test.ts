import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * PHASE-3 OTP reset — route + login-flow integrity guard (source-text, no DB).
 *
 * Pins the security + brand properties of the EXACT login flow so they can't
 * silently regress:
 *   - request route: hashes (never stores plaintext), neutral no-enumeration
 *     response, real send via sendEmail (no fabricated "sent"), rate-limited.
 *   - verify route: constant-time verify, single-use (usedAt), mustReset flag.
 *   - complete route: requires the mustReset session, strength + match.
 *   - Screen 1 + Screen 2: centered seal + "Greekstack" wordmark under it,
 *     "{School} · {Chapter}" subline, the inline OTP flow, demo link kept.
 *
 * Mirrors tests/classical-type-system.test.ts (inspects source text).
 */

const ROOT = resolve(__dirname, "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const REQUEST = read("app/api/portal/reset/request/route.ts");
const VERIFY = read("app/api/portal/reset/verify/route.ts");
const COMPLETE = read("app/api/portal/reset/complete/route.ts");
const OTP = read("lib/otp.ts");

describe("reset/request — hashed, neutral, rate-limited, real send", () => {
  it("stores only a HASH (issueOtp/hashOtp), never the plaintext code", () => {
    expect(REQUEST).toMatch(/issueOtp\(/);
    expect(REQUEST).toMatch(/codeHash/);
    // The plaintext `code` is emailed + (dev-only) echoed, but the persisted
    // create() payload must carry codeHash, not the raw code.
    expect(REQUEST).toMatch(/data:\s*\{[\s\S]*?codeHash[\s\S]*?\}/);
    // Defensive: there must be no `code,` field written into the reset row.
    expect(REQUEST).not.toMatch(/portalPasswordReset\.create\([\s\S]*?\bcode:\s/);
  });

  it("ALWAYS responds with the same NEUTRAL message (no enumeration)", () => {
    // One shared NEUTRAL constant returned on found / not-found / send-fail.
    expect(REQUEST).toMatch(/const NEUTRAL\s*=/);
    // The not-found branch returns the neutral message, never a 404 "no account".
    expect(REQUEST).toMatch(/if\s*\(!portalUser\)[\s\S]*?message:\s*NEUTRAL/);
  });

  it("rate-limits per-IP AND per-account before generating a code", () => {
    expect(REQUEST).toMatch(/rateLimit\(/);
    expect(REQUEST).toMatch(/portal-otp-req:ip:/);
    expect(REQUEST).toMatch(/portal-otp-req:acct:/);
  });

  it("sends a REAL email via sendEmail (honest provider, never faked)", () => {
    expect(REQUEST).toMatch(/sendEmail\(\{/);
    // No literal fabricated success string anywhere in the route.
    expect(REQUEST.toLowerCase()).not.toContain("email sent");
  });

  it("only echoes the code in true local development (NODE_ENV)", () => {
    expect(REQUEST).toMatch(/process\.env\.NODE_ENV === "development"/);
    expect(REQUEST).toMatch(/isDev\s*\?\s*\{\s*devCode/);
  });
});

describe("reset/verify — constant-time, single-use, mustReset", () => {
  it("verifies via the constant-time verifyOtp + expiry/used predicates", () => {
    expect(VERIFY).toMatch(/verifyOtp\(/);
    expect(VERIFY).toMatch(/isOtpExpired\(/);
    expect(VERIFY).toMatch(/isOtpUsed\(/);
  });

  it("consumes the code (sets usedAt) → single-use", () => {
    expect(VERIFY).toMatch(/usedAt:\s*now/);
  });

  it("flags mustReset and issues a tenant-scoped session", () => {
    expect(VERIFY).toMatch(/mustReset:\s*true/);
    expect(VERIFY).toMatch(/setPortalCookie|signPortalTokenForTenant/);
  });

  it("returns a generic failure (no leak of code state / no enumeration)", () => {
    expect(VERIFY).toMatch(/const INVALID\s*=/);
    expect(VERIFY).toMatch(/if\s*\(!portalUser\)[\s\S]*?INVALID/);
  });
});

describe("reset/complete — gated by mustReset session, strength + match", () => {
  it("requires a valid portal session for THIS tenant", () => {
    expect(COMPLETE).toMatch(/verifyPortalTokenForTenant\(/);
    expect(COMPLETE).toMatch(/status:\s*401/);
  });

  it("rejects a non-mustReset session (can't be an arbitrary pw change)", () => {
    expect(COMPLETE).toMatch(/!portalUser\.mustReset/);
    expect(COMPLETE).toMatch(/status:\s*403/);
  });

  it("validates strength + match, then clears mustReset on update", () => {
    expect(COMPLETE).toMatch(/validateNewPassword\(/);
    expect(COMPLETE).toMatch(/password\s*!==\s*confirm/);
    expect(COMPLETE).toMatch(/mustReset:\s*false/);
    expect(COMPLETE).toMatch(/hashPassword\(/);
  });
});

describe("OTP core — tenant binding is wired into hashing", () => {
  it("hash is keyed per-tenant (gs-otp-tenant) so chapters are isolated", () => {
    expect(OTP).toMatch(/gs-otp-tenant:/);
    expect(OTP).toMatch(/timingSafeEqual/);
  });
});

describe("Screen 1 (Find your chapter) + Screen 2 (login) — exact layout", () => {
  const PICKER = read("app/app/_demo/surfaces/SchoolChapterPickerSurface.tsx");
  const APEX = read("components/site/login-entry.tsx");
  const BRO = read("app/portal/brothers/BrothersLoginPage.tsx");
  const ALUM = read("app/portal/alumni/AlumniLoginPage.tsx");

  it("cold-start picker centers the temple SEAL with the wordmark under it", () => {
    expect(PICKER).toMatch(/<GreekstackLogo[\s\S]*?variant="seal"/);
    // "Greek" + gold "stack" wordmark rendered as the centered lockup.
    expect(PICKER).toMatch(/>Greek<\/span>/);
    expect(PICKER).toMatch(/>stack<\/span>/);
    expect(PICKER).toMatch(/Find your chapter/);
  });

  it("cold-start picker keeps the 'see a live demo' (no sign-in) option", () => {
    expect(PICKER).toMatch(/live demo/i);
  });

  it("apex sign-in shows the seal + 'Greekstack' wordmark under it", () => {
    expect(APEX).toMatch(/<GreekstackLogo[\s\S]*?variant="seal"/);
    expect(APEX).toMatch(/>Greek<\/span>\s*<span className="gs-gold-text">stack<\/span>/);
  });

  it("both portal logins center seal + wordmark + '{School} · {Chapter}' subline", () => {
    for (const src of [BRO, ALUM]) {
      expect(src).toMatch(/<GreekstackLogo[\s\S]*?variant="seal"/);
      expect(src).toMatch(/>Greek<\/span>/);
      expect(src).toMatch(/gs-gold-text">stack<\/span>/);
      // "{School} · {Chapter}" subline composed from the identity props.
      expect(src).toMatch(/\[schoolName, chapterName\]\.filter\(Boolean\)\.join\(" · "\)/);
    }
  });

  it("both portal logins drive the inline OTP flow from 'Forgot password?'", () => {
    for (const src of [BRO, ALUM]) {
      expect(src).toMatch(/PortalForgotOtpFlow/);
      expect(src).toMatch(/Forgot password\?/);
    }
  });
});
