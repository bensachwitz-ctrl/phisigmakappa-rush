import { describe, it, expect, afterEach } from "vitest";
import {
  isAllowedNativeOrigin,
  mobileCorsHeaders,
  mobilePreflightResponse,
} from "@/lib/mobile-cors";

const ORIG = process.env.NEXT_PUBLIC_GS_NATIVE_ORIGIN;
afterEach(() => {
  if (ORIG === undefined) delete process.env.NEXT_PUBLIC_GS_NATIVE_ORIGIN;
  else process.env.NEXT_PUBLIC_GS_NATIVE_ORIGIN = ORIG;
  delete process.env.GS_NATIVE_ORIGIN;
});

describe("isAllowedNativeOrigin", () => {
  it("allows the standard Capacitor iOS origin", () => {
    expect(isAllowedNativeOrigin("capacitor://localhost")).toBe(true);
  });
  it("allows the Android Capacitor origin", () => {
    expect(isAllowedNativeOrigin("http://localhost")).toBe(true);
  });
  it("rejects the production web origin (web stays same-origin path)", () => {
    expect(isAllowedNativeOrigin("https://greekstack.vercel.app")).toBe(false);
  });
  it("rejects an arbitrary attacker origin", () => {
    expect(isAllowedNativeOrigin("https://evil.example.com")).toBe(false);
  });
  it("rejects null / empty", () => {
    expect(isAllowedNativeOrigin(null)).toBe(false);
    expect(isAllowedNativeOrigin(undefined)).toBe(false);
    expect(isAllowedNativeOrigin("")).toBe(false);
  });
  it("honors an operator-configured extra origin", () => {
    process.env.NEXT_PUBLIC_GS_NATIVE_ORIGIN = "greekstack://app";
    expect(isAllowedNativeOrigin("greekstack://app")).toBe(true);
  });
});

describe("mobileCorsHeaders", () => {
  it("echoes the allowed native origin and sets no credentials header", () => {
    const h = mobileCorsHeaders("capacitor://localhost");
    expect(h["Access-Control-Allow-Origin"]).toBe("capacitor://localhost");
    expect(h["Access-Control-Allow-Methods"]).toContain("POST");
    expect(h["Access-Control-Allow-Headers"]).toContain("Authorization");
    // Bearer-auth (not cookies) → must NOT set Allow-Credentials.
    expect(h["Access-Control-Allow-Credentials"]).toBeUndefined();
    expect(h["Vary"]).toBe("Origin");
  });

  it("advertises DELETE so the native account-deletion preflight passes (Apple 5.1.1(v))", () => {
    // DELETE /api/mobile/account is the in-app account deletion flow. Its WebView
    // preflight sends Access-Control-Request-Method: DELETE; if Allow-Methods
    // omits DELETE the browser blocks the request and deletion network-errors.
    const methods = mobileCorsHeaders("capacitor://localhost")["Access-Control-Allow-Methods"];
    expect(methods).toContain("DELETE");
    // PATCH/PUT are included too so a future mobile mutation doesn't re-trip this.
    expect(methods).toContain("PATCH");
    expect(methods).toContain("PUT");
  });
  it("returns no headers for a non-native origin (web unchanged)", () => {
    expect(mobileCorsHeaders("https://greekstack.vercel.app")).toEqual({});
    expect(mobileCorsHeaders(null)).toEqual({});
  });
});

describe("mobilePreflightResponse", () => {
  it("is a 204 with CORS headers for an allowed origin", () => {
    const res = mobilePreflightResponse("capacitor://localhost");
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
  });
  it("is a bare 204 for a disallowed origin", () => {
    const res = mobilePreflightResponse("https://evil.example.com");
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
