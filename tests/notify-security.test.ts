import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Security regressions for the multi-channel notify relay (council findings):
//   1. TENANT ISOLATION (P1): the per-destination channels resolve ONLY from the
//      tenant cfg — a global NOTIFY_* env var is NEVER a silent default, so a
//      chapter with no per-tenant secret is inert (can't post into an operator's
//      shared channel).
//   2. WEBHOOK SSRF (P2): the generic webhook refuses private/loopback/link-local
//      hosts (incl. cloud metadata 169.254.169.254) — no fetch is made.
//   3. EMAIL UNSUBSCRIBE (P2): notify email is routed through lib/email-template
//      so it carries the CAN-SPAM opt-out footer.

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  // DNS lookup seam for the SSRF hostname path. Default: a public address.
  dnsLookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.dnsLookup }));

import { resolveNotifyConfig } from "@/lib/notify/config";
import { sendWebhook, sendEmailChannel } from "@/lib/notify/channels";
import type { NotifyMessage } from "@/lib/notify/types";

const baseMsg: NotifyMessage = {
  event: "event.posted",
  title: "New event",
  body: "Chapter BBQ this Friday",
  url: "https://phisig.example/app/events/1",
};

describe("notify tenant isolation — no env fallback for per-destination channels", () => {
  const ENV_KEYS = [
    "NOTIFY_SLACK_WEBHOOK",
    "NOTIFY_TEAMS_WEBHOOK",
    "NOTIFY_DISCORD_WEBHOOK",
    "NOTIFY_WEBHOOK_URL",
    "NOTIFY_WEBHOOK_SECRET",
    "NOTIFY_TELEGRAM_BOT_TOKEN",
    "NOTIFY_TELEGRAM_CHAT_ID",
  ];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      process.env[k] = `env-${k}`;
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("a tenant with NO notify cfg resolves every push channel INERT despite NOTIFY_* env vars", () => {
    const cfg = resolveNotifyConfig({});
    expect(cfg.slack.webhook).toBeNull();
    expect(cfg.teams.webhook).toBeNull();
    expect(cfg.discord.webhook).toBeNull();
    expect(cfg.webhook.url).toBeNull();
    expect(cfg.webhook.secret).toBeNull();
    expect(cfg.telegram.botToken).toBeNull();
    expect(cfg.telegram.chatId).toBeNull();
  });

  it("still resolves a per-tenant cfg secret (only the env FALLBACK is removed)", () => {
    const cfg = resolveNotifyConfig({ "notify.slack.webhook": "https://cfg.example/hook" });
    expect(cfg.slack.webhook).toBe("https://cfg.example/hook");
  });
});

describe("notify webhook SSRF guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "" }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const blocked = [
    // Plain literals.
    "http://127.0.0.1/hook",
    "http://localhost/hook",
    "http://10.0.0.5/hook",
    "http://172.16.9.9/hook",
    "http://192.168.1.10/hook",
    "http://169.254.169.254/latest/meta-data", // cloud metadata
    "http://[::1]/hook",
    "http://0.0.0.0/hook",
    // Alternate IP encodings that a naive prefix check misses.
    "http://2130706433/hook", // decimal 127.0.0.1
    "http://0177.0.0.1/hook", // octal
    "http://0x7f.0.0.1/hook", // hex octet
    "http://0x7f000001/hook", // single hex
    "http://127.1/hook", // shorthand 127.0.0.1
    "http://[::ffff:127.0.0.1]/hook", // IPv4-mapped IPv6
    "http://[::ffff:a9fe:a9fe]/hook", // IPv4-mapped metadata (169.254.169.254)
    // Scheme / parse failures.
    "ftp://example.com/hook",
    "not a url",
  ];

  for (const url of blocked) {
    it(`blocks ${url} without a fetch`, async () => {
      const cfg = resolveNotifyConfig({ "notify.webhook.url": url });
      const r = await sendWebhook(baseMsg, cfg);
      expect(r).toMatchObject({ channel: "webhook", ok: false });
      expect(fetch).not.toHaveBeenCalled();
    });
  }

  it("blocks a hostname that DNS-resolves to a private address (rebinding)", async () => {
    mocks.dnsLookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);
    const cfg = resolveNotifyConfig({ "notify.webhook.url": "https://rebind.attacker.example/gs" });
    const r = await sendWebhook(baseMsg, cfg);
    expect(r).toMatchObject({ channel: "webhook", ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows a public host (DNS resolves to a public address)", async () => {
    const cfg = resolveNotifyConfig({ "notify.webhook.url": "https://hooks.example.com/gs" });
    const r = await sendWebhook(baseMsg, cfg);
    expect(r).toMatchObject({ channel: "webhook", ok: true });
    expect((fetch as any).mock.calls.length).toBe(1);
  });
});

describe("notify email unsubscribe (CAN-SPAM)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue({ ok: true, provider: "resend", id: "e1" });
  });

  it("routes the notify email through the branded template with an opt-out footer", async () => {
    const cfg = resolveNotifyConfig({
      "notify.email.to": "chapter@phisig.example",
      "chapter.fraternityShort": "Phi Sig USC",
      "brand.primaryHex": "#2563EB",
    });
    const r = await sendEmailChannel(baseMsg, cfg);
    expect(r).toMatchObject({ channel: "email", ok: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const arg = mocks.sendEmail.mock.calls[0][0];
    // Branded wrapper (full HTML doc) + unsubscribe copy + chapter name present.
    expect(arg.html).toContain("<!doctype html>");
    expect(arg.html).toContain("turn them off");
    expect(arg.html).toContain("Phi Sig USC");
    expect(arg.to).toBe("chapter@phisig.example");
  });
});
