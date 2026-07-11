import { describe, it, expect } from "vitest";
import {
  UMAMI_DEFAULT_SRC,
  safeUmamiWebsiteId,
  safeUmamiSrc,
  resolveUmamiConfig,
} from "@/lib/umami";

describe("umami — safeUmamiWebsiteId", () => {
  it("returns '' for empty / nullish input", () => {
    expect(safeUmamiWebsiteId(undefined)).toBe("");
    expect(safeUmamiWebsiteId(null)).toBe("");
    expect(safeUmamiWebsiteId("")).toBe("");
    expect(safeUmamiWebsiteId("   ")).toBe("");
  });

  it("accepts a UUID website id (trimmed)", () => {
    const id = "b3f1c2d4-1234-4abc-9def-0123456789ab";
    expect(safeUmamiWebsiteId(id)).toBe(id);
    expect(safeUmamiWebsiteId(`  ${id}  `)).toBe(id);
  });

  it("accepts a conservative alnum+hyphen self-host token", () => {
    expect(safeUmamiWebsiteId("myChapter-2026-ABC123")).toBe("myChapter-2026-ABC123");
  });

  it("rejects too-short tokens", () => {
    expect(safeUmamiWebsiteId("abc")).toBe("");
  });

  it("rejects values that would break out of an HTML attribute", () => {
    expect(safeUmamiWebsiteId('" onload="alert(1)')).toBe("");
    expect(safeUmamiWebsiteId("<script>alert(1)</script>")).toBe("");
    expect(safeUmamiWebsiteId("id with spaces")).toBe("");
    expect(safeUmamiWebsiteId("id/../evil")).toBe("");
  });
});

describe("umami — safeUmamiSrc", () => {
  it("returns '' for empty / nullish input", () => {
    expect(safeUmamiSrc(undefined)).toBe("");
    expect(safeUmamiSrc("")).toBe("");
  });

  it("accepts an https .js url", () => {
    expect(safeUmamiSrc("https://cloud.umami.is/script.js")).toBe(
      "https://cloud.umami.is/script.js",
    );
    expect(safeUmamiSrc("https://analytics.mychapter.app/umami.js")).toBe(
      "https://analytics.mychapter.app/umami.js",
    );
  });

  it("rejects non-https schemes", () => {
    expect(safeUmamiSrc("http://cloud.umami.is/script.js")).toBe("");
    expect(safeUmamiSrc("javascript:alert(1)//x.js")).toBe("");
    expect(safeUmamiSrc("data:text/javascript,alert(1)//.js")).toBe("");
  });

  it("rejects https urls that don't end in .js", () => {
    expect(safeUmamiSrc("https://cloud.umami.is/script")).toBe("");
    expect(safeUmamiSrc("https://evil.example.com/steal.php")).toBe("");
  });

  it("rejects unparseable input", () => {
    expect(safeUmamiSrc("not a url")).toBe("");
  });
});

describe("umami — resolveUmamiConfig", () => {
  it("returns null when no website id anywhere (fully inert)", () => {
    expect(resolveUmamiConfig({})).toBeNull();
    expect(resolveUmamiConfig({ envSrc: "https://x.example/script.js" })).toBeNull();
    expect(resolveUmamiConfig({ cfgWebsiteId: "bad id!" })).toBeNull();
  });

  it("resolves from env id with the default src when no src configured", () => {
    const id = "b3f1c2d4-1234-4abc-9def-0123456789ab";
    expect(resolveUmamiConfig({ envWebsiteId: id })).toEqual({
      websiteId: id,
      src: UMAMI_DEFAULT_SRC,
    });
  });

  it("env website id wins over cfg website id", () => {
    const envId = "env0env0-1111-4abc-9def-0123456789ab";
    const cfgId = "cfg0cfg0-2222-4abc-9def-0123456789ab";
    expect(resolveUmamiConfig({ envWebsiteId: envId, cfgWebsiteId: cfgId })?.websiteId).toBe(
      envId,
    );
  });

  it("falls back to cfg website id when env id is absent/invalid", () => {
    const cfgId = "cfg0cfg0-2222-4abc-9def-0123456789ab";
    expect(resolveUmamiConfig({ envWebsiteId: "bad!", cfgWebsiteId: cfgId })?.websiteId).toBe(
      cfgId,
    );
  });

  it("prefers env src, then cfg src, then default", () => {
    const id = "b3f1c2d4-1234-4abc-9def-0123456789ab";
    expect(
      resolveUmamiConfig({
        envWebsiteId: id,
        envSrc: "https://env.example/script.js",
        cfgSrc: "https://cfg.example/script.js",
      })?.src,
    ).toBe("https://env.example/script.js");
    expect(
      resolveUmamiConfig({ envWebsiteId: id, cfgSrc: "https://cfg.example/script.js" })?.src,
    ).toBe("https://cfg.example/script.js");
    expect(resolveUmamiConfig({ envWebsiteId: id, envSrc: "http://insecure/x.js" })?.src).toBe(
      UMAMI_DEFAULT_SRC,
    );
  });
});
