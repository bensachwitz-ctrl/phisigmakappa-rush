import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Coverage for per-user notification preferences + event routing (notify #2):
//   1. parsePrefs / normalizePrefs are forgiving (bad input => safe defaults).
//   2. resolveUserChannels only returns the types+channels a user opted into,
//      intersected with what the chapter offers.
//   3. routeEventToRecipients fans each recipient out through the relay to ONLY
//      their selected channels, and isolates per-recipient failure.

const mocks = vi.hoisted(() => ({
  getSiteConfig: vi.fn(),
  getChapterIdentity: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/site-config", () => ({ getSiteConfig: mocks.getSiteConfig }));
vi.mock("@/lib/chapter-identity", () => ({ getChapterIdentity: mocks.getChapterIdentity }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/prisma", () => ({ prisma: {}, getSubdomain: () => null }));

import {
  parsePrefs,
  normalizePrefs,
  resolveUserChannels,
  routeEventToRecipients,
  DEFAULT_PREFS,
  type UserNotifyPrefs,
} from "@/lib/notify/prefs";
import { ALL_CHANNELS } from "@/lib/notify/types";

describe("parsePrefs / normalizePrefs", () => {
  it("returns in-app-only defaults for empty / malformed input", () => {
    expect(parsePrefs("")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{not json")).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS.channels).toEqual(["inapp"]);
  });

  it("drops unknown channels and de-dupes", () => {
    const p = normalizePrefs({
      channels: ["email", "email", "nope", "slack"],
      events: ["event.posted", "event.posted"],
    });
    expect(p.channels).toEqual(["email", "slack"]);
    expect(p.events).toEqual(["event.posted"]);
  });

  it("keeps a trimmed per-user email, ignores blank", () => {
    expect(normalizePrefs({ email: "  me@x.io " }).email).toBe("me@x.io");
    expect(normalizePrefs({ email: "   " }).email).toBeUndefined();
  });
});

describe("resolveUserChannels", () => {
  const prefs: UserNotifyPrefs = {
    channels: ["email", "slack", "telegram"],
    events: ["event.posted", "dues.reminder"],
  };

  it("delivers nothing for a muted event type", () => {
    expect(resolveUserChannels(prefs, "announcement.posted", [...ALL_CHANNELS])).toEqual([]);
  });

  it("returns only the user's channels for an opted-in type", () => {
    expect(resolveUserChannels(prefs, "event.posted", [...ALL_CHANNELS])).toEqual([
      "email",
      "slack",
      "telegram",
    ]);
  });

  it("intersects with the channels the chapter offers", () => {
    // Chapter only offers email + inapp -> slack/telegram are dropped.
    expect(resolveUserChannels(prefs, "event.posted", ["email", "inapp"])).toEqual(["email"]);
  });
});

describe("routeEventToRecipients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "" }));
    mocks.sendEmail.mockResolvedValue({ ok: true, provider: "resend", id: "e1" });
    mocks.getChapterIdentity.mockResolvedValue({ chapterAttribution: "Phi Sig USC" });
  });
  afterEach(() => vi.unstubAllGlobals());

  const base = {
    event: "event.posted" as const,
    title: "New event",
    body: "Chapter BBQ Friday",
    url: "https://phisig.example/app/events/1",
  };

  it("routes each recipient to ONLY the channels+types they selected", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      "notify.slack.webhook": "https://slack.example/hook",
      "notify.discord.webhook": "https://discord.example/hook",
      // alice: slack for events. bob: discord but only for dues (muted this event).
      "notify.prefs.alice": JSON.stringify({ channels: ["slack"], events: ["event.posted"] }),
      "notify.prefs.bob": JSON.stringify({ channels: ["discord"], events: ["dues.reminder"] }),
    });

    await routeEventToRecipients(base, [{ userId: "alice" }, { userId: "bob" }]);

    // Exactly ONE real POST: alice's slack. Bob muted event.posted -> no discord.
    const urls = (fetch as any).mock.calls.map((c: any[]) => String(c[0]));
    expect(urls).toEqual(["https://slack.example/hook"]);
  });

  it("uses the per-user email override, else the on-file address", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      "notify.prefs.carol": JSON.stringify({
        channels: ["email"],
        events: ["event.posted"],
        email: "carol.override@x.io",
      }),
      "notify.prefs.dave": JSON.stringify({ channels: ["email"], events: ["event.posted"] }),
    });

    await routeEventToRecipients(base, [
      { userId: "carol", email: "carol.onfile@x.io" },
      { userId: "dave", email: "dave.onfile@x.io" },
    ]);

    const tos = mocks.sendEmail.mock.calls.map((c: any[]) => c[0].to).sort();
    expect(tos).toEqual(["carol.override@x.io", "dave.onfile@x.io"]);
  });

  it("respects the chapter enabled-channels toggle", async () => {
    mocks.getSiteConfig.mockResolvedValue({
      "notify.slack.webhook": "https://slack.example/hook",
      "notify.channels": JSON.stringify(["email"]), // chapter does NOT offer slack
      "notify.prefs.erin": JSON.stringify({ channels: ["slack"], events: ["event.posted"] }),
    });

    await routeEventToRecipients(base, [{ userId: "erin" }]);
    expect((fetch as any).mock.calls.length).toBe(0);
  });

  it("never throws on config failure", async () => {
    mocks.getSiteConfig.mockRejectedValue(new Error("db down"));
    await expect(routeEventToRecipients(base, [{ userId: "x" }])).resolves.toBeUndefined();
  });
});
