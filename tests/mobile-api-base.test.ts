import { describe, it, expect } from "vitest";
import { resolveApiBase, DEFAULT_API_BASE } from "@/lib/mobile-api-base";

describe("resolveApiBase", () => {
  it("returns empty (same-origin) on the web", () => {
    expect(resolveApiBase({ native: false })).toBe("");
  });

  it("returns empty even if an env base is set, when not native", () => {
    expect(
      resolveApiBase({ native: false, envBase: "https://example.com" }),
    ).toBe("");
  });

  it("returns the default production apex when native and no env override", () => {
    expect(resolveApiBase({ native: true, envBase: undefined })).toBe(
      DEFAULT_API_BASE,
    );
  });

  it("honors an env override when native", () => {
    expect(
      resolveApiBase({ native: true, envBase: "https://preview.greekstack.app" }),
    ).toBe("https://preview.greekstack.app");
  });

  it("trims a trailing slash from the configured base", () => {
    expect(
      resolveApiBase({ native: true, envBase: "https://example.com/" }),
    ).toBe("https://example.com");
  });

  it("trims multiple trailing slashes", () => {
    expect(
      resolveApiBase({ native: true, envBase: "https://example.com///" }),
    ).toBe("https://example.com");
  });

  it("falls back to default when env override is blank", () => {
    expect(resolveApiBase({ native: true, envBase: "   " })).toBe(
      DEFAULT_API_BASE,
    );
  });
});
