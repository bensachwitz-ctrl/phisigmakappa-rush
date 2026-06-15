import { describe, it, expect } from "vitest";
import {
  resolveChatwootConfig,
  safeChatwootBaseUrl,
  safeChatwootToken,
  buildChatwootBootstrap,
  type ChatwootConfig,
} from "@/lib/chatwoot";

// Coverage for the Chatwoot live-chat support adapter (lib/chatwoot.ts). The
// load-bearing guarantee is INERT-BY-DEFAULT: with no/malformed env, the
// resolver returns null so <ChatwootWidget> renders nothing. We also assert the
// validators reject hostile input (so a bad cfg can't inject into the script
// src / SDK args) and that the emitted bootstrap carries the validated values.

const TOKEN = "aBcD1234_efGH-5678"; // matches the URL-safe token shape

describe("safeChatwootBaseUrl", () => {
  it("accepts an http(s) origin and normalizes to bare origin", () => {
    expect(safeChatwootBaseUrl("https://support.greekstack.app")).toBe(
      "https://support.greekstack.app",
    );
    // strips a pasted trailing path/slash
    expect(safeChatwootBaseUrl("https://chat.example.com/app/")).toBe(
      "https://chat.example.com",
    );
    expect(safeChatwootBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("rejects non-http(s) schemes and junk (no script-src injection)", () => {
    expect(safeChatwootBaseUrl("javascript:alert(1)")).toBe("");
    expect(safeChatwootBaseUrl("data:text/html,<script>")).toBe("");
    expect(safeChatwootBaseUrl("file:///etc/passwd")).toBe("");
    expect(safeChatwootBaseUrl("not a url")).toBe("");
    expect(safeChatwootBaseUrl("")).toBe("");
    expect(safeChatwootBaseUrl(undefined)).toBe("");
  });
});

describe("safeChatwootToken", () => {
  it("accepts a URL-safe token of a sane length", () => {
    expect(safeChatwootToken(TOKEN)).toBe(TOKEN);
    expect(safeChatwootToken("  " + TOKEN + "  ")).toBe(TOKEN);
  });

  it("rejects too-short, too-long, or illegal-char tokens", () => {
    expect(safeChatwootToken("short")).toBe("");
    expect(safeChatwootToken("has spaces here xx")).toBe("");
    expect(safeChatwootToken("with<angle>brackets!!")).toBe("");
    expect(safeChatwootToken("x".repeat(200))).toBe("");
    expect(safeChatwootToken(undefined)).toBe("");
  });
});

describe("resolveChatwootConfig — inert by default", () => {
  it("returns null when env is empty (widget renders nothing)", () => {
    expect(resolveChatwootConfig({})).toBeNull();
  });

  it("returns null when only one of the two vars is set", () => {
    expect(
      resolveChatwootConfig({ CHATWOOT_BASE_URL: "https://support.greekstack.app" }),
    ).toBeNull();
    expect(resolveChatwootConfig({ CHATWOOT_WEBSITE_TOKEN: TOKEN })).toBeNull();
  });

  it("returns null when a value is present but malformed", () => {
    expect(
      resolveChatwootConfig({
        CHATWOOT_BASE_URL: "javascript:alert(1)",
        CHATWOOT_WEBSITE_TOKEN: TOKEN,
      }),
    ).toBeNull();
    expect(
      resolveChatwootConfig({
        CHATWOOT_BASE_URL: "https://support.greekstack.app",
        CHATWOOT_WEBSITE_TOKEN: "bad token!",
      }),
    ).toBeNull();
  });

  it("resolves a validated config when BOTH vars are well-formed", () => {
    const cfg = resolveChatwootConfig({
      CHATWOOT_BASE_URL: "https://support.greekstack.app/",
      CHATWOOT_WEBSITE_TOKEN: TOKEN,
    });
    expect(cfg).toEqual({
      baseUrl: "https://support.greekstack.app",
      websiteToken: TOKEN,
    });
  });

  it("honors the NEXT_PUBLIC_ fallback names", () => {
    const cfg = resolveChatwootConfig({
      NEXT_PUBLIC_CHATWOOT_BASE_URL: "https://chat.example.com",
      NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN: TOKEN,
    });
    expect(cfg).toEqual({ baseUrl: "https://chat.example.com", websiteToken: TOKEN });
  });
});

describe("buildChatwootBootstrap", () => {
  const cfg: ChatwootConfig = {
    baseUrl: "https://support.greekstack.app",
    websiteToken: TOKEN,
  };

  it("emits a snippet that loads the SDK from the configured origin and runs it with the token", () => {
    const js = buildChatwootBootstrap(cfg);
    expect(js).toContain('"https://support.greekstack.app"');
    expect(js).toContain("/packs/js/sdk.js");
    expect(js).toContain("window.chatwootSDK.run");
    expect(js).toContain(JSON.stringify(TOKEN));
  });

  it("uses a safe brand hex and defaults to royal-blue on a bad color", () => {
    expect(buildChatwootBootstrap(cfg, { launcherColor: "#16a34a" })).toContain(
      '"#16a34a"',
    );
    // invalid hex → falls back to the platform royal-blue, never injects
    const fallback = buildChatwootBootstrap(cfg, { launcherColor: "red; }</script>" });
    expect(fallback).toContain('"#2563eb"');
    expect(fallback).not.toContain("</script>");
  });

  it("only allows left/right position and a sane locale", () => {
    expect(buildChatwootBootstrap(cfg, { position: "left" })).toContain('"left"');
    // bogus position coerces to the default 'right'
    expect(
      buildChatwootBootstrap(cfg, { position: "top" as unknown as "left" }),
    ).toContain('"right"');
    expect(buildChatwootBootstrap(cfg, { locale: "es" })).toContain('"es"');
    expect(buildChatwootBootstrap(cfg, { locale: "../../evil" })).toContain('"en"');
  });
});
