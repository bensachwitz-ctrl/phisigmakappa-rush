import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import {
  getApnsConfig,
  apnsProviderToken,
  sendApnsPush,
  _resetApnsTokenCache,
  type ApnsDeliver,
} from "@/lib/notify/apns";
import { sendPushChannel } from "@/lib/notify/channels";
import { ALL_CHANNELS } from "@/lib/notify/types";
import { parsePushTokens } from "@/lib/notify/prefs";

/**
 * P1 #7 — APNs push channel wiring (mock APNs).
 *
 * Pins: (a) "push" is a real notify channel, (b) config is read from env and the
 * send path is INERT when unconfigured / tokenless, (c) when configured it signs
 * a valid ES256 provider JWT and issues the correct APNs request (topic header,
 * bearer auth, /3/device/<token>), and (d) it never throws on a bad response.
 * The network primitive is injected so no real socket is opened.
 */

// A throwaway EC P-256 key so we can sign AND verify a real ES256 JWT.
const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const P8_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function setApnsEnv(overrides: Record<string, string | undefined> = {}) {
  vi.stubEnv("APNS_KEY_ID", overrides.APNS_KEY_ID ?? "ABC1234567");
  vi.stubEnv("APNS_TEAM_ID", overrides.APNS_TEAM_ID ?? "QFC852BYB6");
  vi.stubEnv("APNS_TOPIC", overrides.APNS_TOPIC ?? "com.greekstack.app");
  vi.stubEnv("APNS_PRIVATE_KEY", overrides.APNS_PRIVATE_KEY ?? P8_PEM);
  if ("APNS_ENV" in overrides) vi.stubEnv("APNS_ENV", overrides.APNS_ENV as string);
}

beforeEach(() => {
  _resetApnsTokenCache();
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetApnsTokenCache();
});

const TOKEN = "a".repeat(64);

describe("push is a first-class notify channel", () => {
  it("is present in ALL_CHANNELS", () => {
    expect(ALL_CHANNELS).toContain("push");
  });
});

describe("getApnsConfig reads env and is inert when incomplete", () => {
  it("returns null when a required var is missing", () => {
    vi.stubEnv("APNS_KEY_ID", "");
    expect(getApnsConfig()).toBeNull();
  });

  it("returns a config when all four vars are set (production by default)", () => {
    setApnsEnv();
    const cfg = getApnsConfig();
    expect(cfg).toMatchObject({
      keyId: "ABC1234567",
      teamId: "QFC852BYB6",
      topic: "com.greekstack.app",
      production: true,
    });
  });

  it("selects the sandbox host when APNS_ENV=sandbox", () => {
    setApnsEnv({ APNS_ENV: "sandbox" });
    expect(getApnsConfig()?.production).toBe(false);
  });

  it("normalizes env-encoded \\n newlines in the private key", () => {
    const encoded = P8_PEM.replace(/\n/g, "\\n");
    setApnsEnv({ APNS_PRIVATE_KEY: encoded });
    // If the key were not normalized, apnsProviderToken would throw; it must not.
    expect(() => apnsProviderToken(getApnsConfig()!)).not.toThrow();
  });
});

describe("apnsProviderToken signs a verifiable ES256 JWT", () => {
  it("produces a 3-part JWT whose signature verifies with the public key", () => {
    setApnsEnv();
    const cfg = getApnsConfig()!;
    const jwt = apnsProviderToken(cfg);
    const [h, p, s] = jwt.split(".");
    expect(h && p && s).toBeTruthy();
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(header).toMatchObject({ alg: "ES256", kid: "ABC1234567" });
    expect(payload.iss).toBe("QFC852BYB6");
    const sig = Buffer.from(s, "base64url");
    const ok = crypto.verify(
      "SHA256",
      Buffer.from(`${h}.${p}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      sig,
    );
    expect(ok).toBe(true);
  });
});

describe("sendApnsPush — inert paths", () => {
  it("is skipped (not-configured) when APNs env is absent", async () => {
    const res = await sendApnsPush([TOKEN], { title: "t", body: "b" });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe("not-configured");
    expect(res.sent).toBe(0);
  });

  it("is skipped (no-tokens) when configured but no tokens", async () => {
    setApnsEnv();
    const deliver = vi.fn();
    const res = await sendApnsPush([], { title: "t", body: "b" }, { deliver });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe("no-tokens");
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe("sendApnsPush — configured send (mock APNs)", () => {
  it("issues the correct APNs request and reports success", async () => {
    setApnsEnv();
    const calls: any[] = [];
    const deliver: ApnsDeliver = async (args) => {
      calls.push(args);
      return { status: 200, body: "" };
    };
    const res = await sendApnsPush(
      [TOKEN, "  "], // blank token is dropped
      { title: "Chapter meeting", body: "7pm tonight", url: "/app" },
      { deliver },
    );
    expect(res.skipped).toBeFalsy();
    expect(res.sent).toBe(1);
    expect(res.failed).toBe(0);
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.host).toBe("api.push.apple.com");
    expect(call.path).toBe(`/3/device/${TOKEN}`);
    expect(call.headers["apns-topic"]).toBe("com.greekstack.app");
    expect(call.headers.authorization).toMatch(/^bearer /);
    expect(call.headers["apns-push-type"]).toBe("alert");
    const payload = JSON.parse(call.body);
    expect(payload.aps.alert).toEqual({ title: "Chapter meeting", body: "7pm tonight" });
    expect(payload.url).toBe("/app");
  });

  it("counts a non-200 as failed and never throws", async () => {
    setApnsEnv();
    const deliver: ApnsDeliver = async () => ({ status: 410, body: '{"reason":"Unregistered"}' });
    const res = await sendApnsPush([TOKEN], { title: "t", body: "b" }, { deliver });
    expect(res.sent).toBe(0);
    expect(res.failed).toBe(1);
    expect(res.results[0]).toMatchObject({ ok: false, status: 410 });
  });

  it("uses the sandbox host when APNS_ENV=sandbox", async () => {
    setApnsEnv({ APNS_ENV: "sandbox" });
    let host = "";
    const deliver: ApnsDeliver = async (a) => {
      host = a.host;
      return { status: 200, body: "" };
    };
    await sendApnsPush([TOKEN], { title: "t", body: "b" }, { deliver });
    expect(host).toBe("api.sandbox.push.apple.com");
  });
});

describe("push channel adapter + token store", () => {
  it("the push adapter is skipped when the message carries no device tokens", async () => {
    const res = await sendPushChannel(
      { event: "announcement.posted", title: "t", body: "b" },
      {} as any,
    );
    expect(res).toMatchObject({ channel: "push", skipped: true, reason: "no-tokens" });
  });

  it("parsePushTokens de-dupes, trims, and caps the stored token list", () => {
    expect(parsePushTokens(JSON.stringify([" abc ", "abc", "def"]))).toEqual(["abc", "def"]);
    expect(parsePushTokens("")).toEqual([]);
    expect(parsePushTokens("not json")).toEqual([]);
  });
});
