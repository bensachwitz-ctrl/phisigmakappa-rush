import { describe, it, expect } from "vitest";
import { csvEscape } from "@/lib/csv";

// ---------------------------------------------------------------------------
// CSV formula-injection neutralization for the admin PII export.
//
// Rushee-supplied free text flows into this CSV. A cell beginning with
// = + - @ TAB CR can be interpreted as a formula by Excel/Sheets and execute
// when an admin opens the file. csvEscape must prefix such cells with a single
// quote (then quote/escape as normal). Benign values must pass through clean.
// ---------------------------------------------------------------------------

describe("csvEscape — formula injection", () => {
  it.each(["=", "+", "-", "@", "\t", "\r"])(
    "neutralizes a cell beginning with %j by prefixing a quote",
    (lead) => {
      const out = csvEscape(`${lead}cmd|'/c calc'!A1`);
      expect(out.replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("neutralizes the classic =cmd payload", () => {
    const out = csvEscape("=cmd|'/c calc'!A1");
    // Has a leading quote (inside the surrounding CSV quotes from the comma).
    expect(out).toContain("'=cmd");
  });

  it("leaves a normal name untouched", () => {
    expect(csvEscape("John Smith")).toBe("John Smith");
  });

  it("leaves a normal hometown with no leading special char untouched", () => {
    expect(csvEscape("Columbia, SC")).toBe('"Columbia, SC"'); // comma → quoted, no leading '
    expect(csvEscape("Columbia, SC").startsWith('"\'')).toBe(false);
  });

  it("still escapes embedded double-quotes", () => {
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("empty / null / undefined → empty string", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
    expect(csvEscape("")).toBe("");
  });

  it("a number is rendered without a spurious quote (negative numbers handled)", () => {
    // A leading '-' (negative number) IS treated as potential formula and
    // prefixed — acceptable: it stays a text label, no data loss, no execution.
    expect(csvEscape(-5)).toContain("'-5");
    expect(csvEscape(42)).toBe("42");
  });

  it("wraps strings containing newlines in quotes", () => {
    expect(csvEscape("Hello\nWorld")).toBe('"Hello\nWorld"');
    expect(csvEscape("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    expect(csvEscape("Just\ra\rcarriage\rreturn")).toBe('"Just\ra\rcarriage\rreturn"');
  });

  it("handles complex strings with multiple special characters", () => {
    expect(csvEscape('Hello, "World"\nNew Line')).toBe('"Hello, ""World""\nNew Line"');
  });
});
