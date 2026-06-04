import { describe, it, expect } from "vitest";
import {
  cleanUrl,
  cleanMailto,
  cleanTel,
  titleCaseAddress,
  cn,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// lib/utils.ts — href / address sanitizers applied at the point of render.
// These defend the live site against admin-pasted junk (trailing backslashes,
// Unicode ellipses, smart quotes, all-lowercase addresses). Empty in → "".
// ---------------------------------------------------------------------------

describe("cleanUrl", () => {
  it('returns "" for empty / null / undefined', () => {
    expect(cleanUrl("")).toBe("");
    expect(cleanUrl(null)).toBe("");
    expect(cleanUrl(undefined)).toBe("");
  });

  it("passes a clean URL through unchanged (preserves a legit trailing slash)", () => {
    expect(cleanUrl("https://example.com/")).toBe("https://example.com/");
    expect(cleanUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("strips a Unicode ellipsis anywhere in the string", () => {
    expect(cleanUrl("https://hazingprevention.org/help/…")).toBe("https://hazingprevention.org/help/");
  });

  it("strips a trailing backslash", () => {
    expect(cleanUrl("https://example.com\\")).toBe("https://example.com");
  });

  it("strips trailing whitespace and newlines", () => {
    expect(cleanUrl("  https://example.com  \n")).toBe("https://example.com");
  });

  it("peels a run of trailing dots but keeps the .tld for a bare domain", () => {
    // Trailing sentence-dots are junk; the final real char should remain.
    expect(cleanUrl("https://example.com....")).toBe("https://example.com");
  });

  it("normalizes smart quotes to straight quotes", () => {
    expect(cleanUrl("https://example.com/?q=“hi”")).toBe('https://example.com/?q="hi"');
  });
});

describe("cleanMailto", () => {
  it('returns "" for empty input', () => {
    expect(cleanMailto("")).toBe("");
    expect(cleanMailto(null)).toBe("");
  });

  it("prefixes a bare email with mailto:", () => {
    expect(cleanMailto("advisor@phisig-usc.com")).toBe("mailto:advisor@phisig-usc.com");
  });

  it("strips a trailing backslash from a pasted address", () => {
    expect(cleanMailto("advisor@phisig-usc.com\\")).toBe("mailto:advisor@phisig-usc.com");
  });

  it("does not double the mailto: prefix when one is already present", () => {
    expect(cleanMailto("mailto:advisor@phisig-usc.com")).toBe("mailto:advisor@phisig-usc.com");
  });
});

describe("cleanTel", () => {
  it('returns "" for empty input', () => {
    expect(cleanTel("")).toBe("");
    expect(cleanTel(undefined)).toBe("");
  });

  it("keeps digits and a leading +, dropping formatting characters", () => {
    expect(cleanTel("+1 (803) 555-1234")).toBe("tel:+18035551234");
  });

  it("strips parentheses, spaces, and dashes", () => {
    expect(cleanTel("(803) 555-1234")).toBe("tel:8035551234");
  });

  it('returns "" when there are no dialable characters', () => {
    expect(cleanTel("call us!")).toBe("");
  });
});

describe("titleCaseAddress", () => {
  it('returns "" for empty / null / undefined', () => {
    expect(titleCaseAddress("")).toBe("");
    expect(titleCaseAddress(null)).toBe("");
    expect(titleCaseAddress(undefined)).toBe("");
  });

  it("title-cases an all-lowercase address while preserving the state code", () => {
    expect(titleCaseAddress("1525 college street, columbia, sc")).toBe(
      "1525 College Street, Columbia, SC",
    );
  });

  it("preserves Roman-numeral suffixes in upper case", () => {
    expect(titleCaseAddress("john smith iii")).toBe("John Smith III");
  });

  it("leaves numeric tokens (zip codes) untouched", () => {
    expect(titleCaseAddress("columbia sc 29208")).toBe("Columbia SC 29208");
  });

  it("preserves the comma+space structure of the input", () => {
    const out = titleCaseAddress("a, b, c");
    expect(out).toBe("A, B, C");
  });
});

describe("cn (class merge helper)", () => {
  it("merges class names and dedupes conflicting tailwind utilities", () => {
    // tailwind-merge: later wins for conflicting props.
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });
});
