import { describe, it, expect } from "vitest";
import { resolveTestFlightUrl } from "@/lib/ios-app";

/**
 * Guards the /ios marketing page against re-shipping a dead TestFlight link.
 * The page's install CTAs only render when resolveTestFlightUrl returns a real,
 * well-formed invite; otherwise it shows an honest "coming soon" state.
 */
describe("resolveTestFlightUrl", () => {
  it("returns null for empty / nullish input", () => {
    expect(resolveTestFlightUrl("")).toBeNull();
    expect(resolveTestFlightUrl("   ")).toBeNull();
    expect(resolveTestFlightUrl(null)).toBeNull();
    expect(resolveTestFlightUrl(undefined)).toBeNull();
  });

  it("rejects the literal placeholder default (the bug this guards)", () => {
    expect(
      resolveTestFlightUrl("https://testflight.apple.com/join/placeholder"),
    ).toBeNull();
    // case-insensitive — a stale Placeholder/PLACEHOLDER never ships either
    expect(
      resolveTestFlightUrl("https://testflight.apple.com/join/PLACEHOLDER"),
    ).toBeNull();
  });

  it("rejects non-TestFlight hosts and malformed URLs", () => {
    expect(resolveTestFlightUrl("https://evil.example.com/join/abcd1234")).toBeNull();
    expect(resolveTestFlightUrl("http://testflight.apple.com/join/abcd1234")).toBeNull(); // must be https
    expect(resolveTestFlightUrl("https://testflight.apple.com/abcd1234")).toBeNull(); // missing /join/
    expect(resolveTestFlightUrl("not a url")).toBeNull();
    expect(resolveTestFlightUrl("https://testflight.apple.com/join/")).toBeNull(); // no code
  });

  it("accepts a real, well-formed TestFlight invite (and trims whitespace)", () => {
    expect(resolveTestFlightUrl("https://testflight.apple.com/join/aB3xY9Zq")).toBe(
      "https://testflight.apple.com/join/aB3xY9Zq",
    );
    expect(
      resolveTestFlightUrl("  https://testflight.apple.com/join/aB3xY9Zq  "),
    ).toBe("https://testflight.apple.com/join/aB3xY9Zq");
  });
});
