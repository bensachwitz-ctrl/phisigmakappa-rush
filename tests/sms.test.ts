import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/sms";

describe("normalizePhone", () => {
  it("prepends +1 to a 10-digit number", () => {
    expect(normalizePhone("8035551234")).toBe("+18035551234");
  });

  it("handles 10-digit numbers with formatting characters", () => {
    expect(normalizePhone("(803) 555-1234")).toBe("+18035551234");
    expect(normalizePhone("803.555.1234")).toBe("+18035551234");
    expect(normalizePhone("803-555-1234")).toBe("+18035551234");
    expect(normalizePhone(" 803 555 1234 ")).toBe("+18035551234");
  });

  it("prepends + to an 11-digit number starting with 1", () => {
    expect(normalizePhone("18035551234")).toBe("+18035551234");
  });

  it("handles 11-digit numbers starting with 1 with formatting", () => {
    expect(normalizePhone("1 (803) 555-1234")).toBe("+18035551234");
    expect(normalizePhone("1-803-555-1234")).toBe("+18035551234");
  });

  it("returns the original string if it starts with + and isn't 10 or 11 digits of US format", () => {
    expect(normalizePhone("+44 20 7123 1234")).toBe("+44 20 7123 1234");
    expect(normalizePhone("+12345")).toBe("+12345");
  });

  it("prepends + and removes non-digits for numbers that do not start with + and aren't 10/11 US format", () => {
    expect(normalizePhone("44 20 7123 1234")).toBe("+442071231234");
    expect(normalizePhone("12345")).toBe("+12345");
    expect(normalizePhone("28035551234")).toBe("+28035551234"); // 11 digits but doesn't start with 1
  });

  it("handles strings with no digits", () => {
    expect(normalizePhone("invalid")).toBe("+");
  });
});
