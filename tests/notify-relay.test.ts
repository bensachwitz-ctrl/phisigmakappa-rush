import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Coverage for the multi-channel notify relay (lib/notify/*):
//   1. Every adapter is INERT (skipped, no fetch) without its config.
//   2. resolveNotifyConfig applies cfg-first, env-fallback, and the chapter
//      enabled-channels toggle.
//   3. sendNotification fans out ONLY to enabled + configured channels, never
//      throws, and isolates a single channel's failure.

const mocks = vi.hoisted(() => ({
  getSiteConfig: vi.fn(),
  getChapterIdentity: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/site-config", () => ({ getSiteConfig: mocks.getSiteConfig }));
vi.mock("@/lib/chapter-identity", () => ({ getChapterIdentity: mocks.getChapterIdentity }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));

import { resolveNotifyConfig } from "@/lib/notify/config";
import {
  sendTeams,
  sendTelegram,
  sendSlack,
  sendDiscord,
  sendWebhook,
  sendEmailChannel,
} from "@/lib/notify/channels";
import { sendNotification } from "@/lib/notify/relay";
import type { NotifyMessage } from "@/lib/notify/types";

const EMPTY = resolveNotifyConfig({});

const baseMsg: NotifyMessage = {
  event: "event.posted",
  title: "New event",
  body: "Chapter BBQ this Friday",
  url: "https://phisig.example/app/events/1",
};

describe("notify adapters — inert without config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Any fetch call in an inert test is a failure of the contract.
    vi.stubGlobal("fetch", vi.fn());
    mocks.sendEmail.mockResolvedValue({ ok: true, provider: "mock", mock: true, notConfigured: true });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("teams skips without a webhook", async () => {
    const r = await sendTeams(baseMsg, EMPTY);
    expect(r).toMatchObject({ channel: "teams", skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("telegram skips without token+chatId", async () => {
    const r = await sendTelegram(baseMsg, EMPTY);
    expect(r).toMatchObject({ channel: "telegram", skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("slack skips without a webhook", async () => {
    const r = await sendSlack(baseMsg, EMPTY);
    expect(r).toMatchObject({ channel: "slack", skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("discord skips without a webhook", async () => {
    const r = await sendDiscord(baseMsg, EMPTY);
    expect(r).toMatchObject({ channel: "discord", skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("generic webhook skips without a url", async () => {
    const r = await sendWebhook(baseMsg, EMPTY);
    expect(r).toMatchObject({ channel: "webhook", skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("email skips when there is no recipient", async () => {
    const r = await sendEmailChannel(baseMsg, EMPTY);
    expect(r).toMatchObject({ channel: "email", skipped: true });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
  it("email reports not-configured (skipped) when provider returns mock", async () => {
    const cfg = resolveNotifyConfig({ "notify.email.to": "chapter@phisig.example" });
    const r = await sendEmailChannel(baseMsg, cfg);
    expect(r).toMatchObject({ channel: "email", skipped: true, reason: "not-configured" });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe("notify adapters — active when configured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "" }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("teams posts a MessageCard with an OpenUri action", async () => {
    const cfg = resolveNotifyConfig({ "notify.teams.webhook": "https://outlook.example/hook" });
    const r = await sendTeams(baseMsg, cfg);
    expect(r).toMatchObject({ channel: "teams", ok: true });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe("https://outlook.example/hook");
    const payload = JSON.parse(init.body);
    expect(payload["@type"]).toBe("MessageCard");
    expect(payload.potentialAction[0].targets[0].uri).toBe(baseMsg.url);
  });

  it("telegram calls the Bot API with chat_id + text", async () => {
    const cfg = resolveNotifyConfig({
      "notify.telegram.botToken": "123:ABC",
      "notify.telegram.chatId": "-100987",
    });
    const r = await sendTelegram(baseMsg, cfg);
    expect(r).toMatchObject({ channel: "telegram", ok: true });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bot123:ABC/sendMessage");
    const payload = JSON.parse(init.body);
    expect(payload.chat_id).toBe("-100987");
    expect(payload.text).toContain("New event");
  });

  it("generic webhook forwards the event type + secret header", async () => {
    const cfg = resolveNotifyConfig({
      "notify.webhook.url": "https://hooks.example/gs",
      "notify.webhook.secret": "s3cr3t",
    });
    const r = await sendWebhook({ ...baseMsg, chapter: "Phi Sig USC" }, cfg);
    expect(r).toMatchObject({ channel: "webhook", ok: true });
    const [, init] = (fetch as any).mock.calls[0];
    expect(init.headers["X-Notify-Secret"]).toBe("s3cr3t");
    const payload = JSON.parse(init.body);
    expect(payload.event).toBe("event.posted");
    expect(payload.chapter).toBe("Phi Sig USC");
  });

  it("returns ok:false (not throw) on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" }),
    );
    const cfg = resolveNotifyConfig({ "notify.slack.webhook": "https://slack.example/hook" });
    const r = await sendSlack(baseMsg, cfg);
    expect(r).toMatchObject({ channel: "slack", ok: false });
    expect((r as { error: string }).error).toContain("500");
  });
});

describe("resolveNotifyConfig", () => {
  it("prefers cfg over env", () => {
    const prev = process.env.NOTIFY_SLACK_WEBHOOK;
    process.env.NOTIFY_SLACK_WEBHOOK = "https://env.example/hook";
    try {
      const cfg = resolveNotifyConfig({ "notify.slack.webhook": "https://cfg.example/hook" });
      expect(cfg.slack.webhook).toBe("https://cfg.example/hook");
    } finally {
      if (prev === undefined) delete process.env.NOTIFY_SLACK_WEBHOOK;
      else process.env.NOTIFY_SLACK_WEBHOOK = prev;
    }
  });

  it("defaults enabledChannels to ALL when unset, honors a valid subset", () => {
    expect(resolveNotifyConfig({}).enabledChannels).toContain("slack");
    const restricted = resolveNotifyConfig({ "notify.channels": JSON.stringify(["email", "slack"]) });
    expect(restricted.enabledChannels).toEqual(["email", "slack"]);
  });

  it("falls back to ALL on malformed notify.channels", () => {
    expect(resolveNotifyConfig({ "notify.channels": "{not json" }).enabledChannels.length).toBeGreaterThan(1);
    expect(resolveNotifyConfig({ "notify.channels": "[]" }).enabledChannels.length).toBeGreaterThan(1);
  });
});

describe("sendNotification fan-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "" }));
    mocks.getChapterIdentity.mockResolvedValue({ chapterAttribution: "Phi Sig USC", fraternityShort: "Phi Sig" });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fans out only to configured channels; others skip without a fetch", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      "notify.slack.webhook": "https://slack.example/hook",
      "notify.discord.webhook": "https://discord.example/hook",
    });
    const { results } = await sendNotification(baseMsg);
    const ok = results.filter((r) => "ok" in r && r.ok).map((r) => r.channel);
    expect(ok.sort()).toEqual(["discord", "slack"]);
    // Exactly two real POSTs — no wasted calls for unconfigured channels.
    expect((fetch as any).mock.calls.length).toBe(2);
  });

  it("respects the chapter enabled-channels toggle", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      "notify.slack.webhook": "https://slack.example/hook",
      "notify.discord.webhook": "https://discord.example/hook",
      "notify.channels": JSON.stringify(["slack"]), // discord disabled by admin
    });
    const { results } = await sendNotification(baseMsg);
    expect(results.map((r) => r.channel)).toEqual(["slack"]);
    expect((fetch as any).mock.calls.length).toBe(1);
  });

  it("honors an explicit channels request intersected with enabled", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      "notify.slack.webhook": "https://slack.example/hook",
      "notify.teams.webhook": "https://teams.example/hook",
    });
    const { results } = await sendNotification({ ...baseMsg, channels: ["teams"] });
    expect(results.map((r) => r.channel)).toEqual(["teams"]);
  });

  it("isolates a single channel failure and never throws", async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (String(url).includes("discord")) throw new Error("network down");
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    mocks.getSiteConfig.mockResolvedValue({
      "notify.slack.webhook": "https://slack.example/hook",
      "notify.discord.webhook": "https://discord.example/hook",
    });
    const { results } = await sendNotification(baseMsg);
    const slack = results.find((r) => r.channel === "slack");
    const discord = results.find((r) => r.channel === "discord");
    expect(slack).toMatchObject({ ok: true });
    expect(discord).toMatchObject({ ok: false });
  });
});
