import { describe, it, expect } from "vitest";
import { getClientIp } from "@/lib/client-ip";

// ---------------------------------------------------------------------------
// getClientIp precedence — the throttle/audit key MUST prefer the non-forgeable
// platform header so a client can't rotate x-forwarded-for to dodge the per-IP
// brute-force cap.
// ---------------------------------------------------------------------------

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://x.test/api", { headers });
}

describe("getClientIp", () => {
  it("prefers x-vercel-forwarded-for over a forged x-forwarded-for", () => {
    const req = reqWith({
      "x-forwarded-for": "1.2.3.4", // attacker-controlled
      "x-vercel-forwarded-for": "9.9.9.9", // platform truth
      "x-real-ip": "5.5.5.5",
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip when no vercel header", () => {
    const req = reqWith({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.5.5.5" });
    expect(getClientIp(req)).toBe("5.5.5.5");
  });

  it("falls back to x-forwarded-for[0] when neither platform header present", () => {
    const req = reqWith({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("takes only the first hop of x-vercel-forwarded-for and trims it", () => {
    const req = reqWith({ "x-vercel-forwarded-for": " 9.9.9.9 , 8.8.8.8 " });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns null when no IP headers exist", () => {
    expect(getClientIp(reqWith({}))).toBeNull();
  });

  it("handles empty values gracefully when they exist", () => {
    const req = reqWith({ "x-forwarded-for": " , " });
    expect(getClientIp(req)).toBeNull();
  });
});
