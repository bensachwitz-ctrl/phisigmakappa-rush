import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { calcomEmbedUrl } from "@/lib/calcom";

// Self-hosted Cal instances are admitted only via an EXACT-match env allowlist
// (never a prefix of the leftmost label). Register one for the tests below.
const prevSelfHosted = process.env.CALCOM_SELF_HOSTED_HOSTS;
beforeAll(() => {
  process.env.CALCOM_SELF_HOSTED_HOSTS = "cal.phisigusc.com, book.chapter.example";
});
afterAll(() => {
  if (prevSelfHosted === undefined) delete process.env.CALCOM_SELF_HOSTED_HOSTS;
  else process.env.CALCOM_SELF_HOSTED_HOSTS = prevSelfHosted;
});

// Pins the Cal.com / Cal.diy handle resolver used by <CalcomEmbed> on the Events
// surface. The single `calendar.calDiyUrl` settings field must accept three
// shapes (bare username, username/event-type, full self-hosted URL) and always
// self-hide (empty string) when unset so the Events page never renders a broken
// iframe.
describe("calcomEmbedUrl", () => {
  it("returns '' for blank / unset input", () => {
    expect(calcomEmbedUrl("")).toBe("");
    expect(calcomEmbedUrl("   ")).toBe("");
    expect(calcomEmbedUrl(undefined)).toBe("");
    expect(calcomEmbedUrl(null)).toBe("");
  });

  it("resolves a bare Cal.com username to a cal.com URL", () => {
    expect(calcomEmbedUrl("phisigusc")).toBe(
      "https://cal.com/phisigusc?embed=true&theme=light",
    );
  });

  it("resolves a username/event-type slug", () => {
    expect(calcomEmbedUrl("phisigusc/rush-coffee")).toBe(
      "https://cal.com/phisigusc/rush-coffee?embed=true&theme=light",
    );
  });

  it("trims whitespace and a leading slash on a slug", () => {
    expect(calcomEmbedUrl("  /phisigusc  ")).toBe(
      "https://cal.com/phisigusc?embed=true&theme=light",
    );
  });

  it("passes an env-allowlisted self-hosted URL through, appending embed params", () => {
    expect(calcomEmbedUrl("https://cal.phisigusc.com/meeting")).toBe(
      "https://cal.phisigusc.com/meeting?embed=true&theme=light",
    );
  });

  it("uses & when the URL already has a query string", () => {
    expect(calcomEmbedUrl("https://cal.phisigusc.com/meeting?duration=30")).toBe(
      "https://cal.phisigusc.com/meeting?duration=30&embed=true&theme=light",
    );
  });

  // SSRF / clickjacking guard: an admin-supplied URL is rendered in an <iframe>,
  // so a full URL is only embedded when it targets a KNOWN scheduler host.
  it("self-hides (returns '') for a full URL on an unknown host", () => {
    expect(calcomEmbedUrl("https://evil.example.com/steal")).toBe("");
    expect(calcomEmbedUrl("https://calendly-phish.com/x")).toBe("");
  });

  it("rejects a non-http(s) scheme", () => {
    expect(calcomEmbedUrl("javascript:alert(1)")).toBe("");
    expect(calcomEmbedUrl("data:text/html,<script>1</script>")).toBe("");
  });

  it("allows the cal.com / cal.diy families", () => {
    expect(calcomEmbedUrl("https://cal.com/team/phisig")).toBe(
      "https://cal.com/team/phisig?embed=true&theme=light",
    );
    expect(calcomEmbedUrl("https://app.cal.diy/phisig")).toBe(
      "https://app.cal.diy/phisig?embed=true&theme=light",
    );
  });

  // Host-allowlist must be EXACT / explicit-subdomain — never a prefix of the
  // leftmost label (an unanchored startsWith("cal.") would admit cal.attacker.com).
  it("admits exact + subdomain matches and env-listed self-hosted hosts", () => {
    expect(calcomEmbedUrl("https://cal.com/x")).not.toBe("");
    expect(calcomEmbedUrl("https://sub.cal.com/x")).not.toBe("");
    expect(calcomEmbedUrl("https://book.chapter.example/x")).toBe(
      "https://book.chapter.example/x?embed=true&theme=light",
    );
  });

  it("rejects look-alike and unlisted hosts", () => {
    expect(calcomEmbedUrl("https://cal.attacker.com/x")).toBe("");
    expect(calcomEmbedUrl("https://notcal.com/x")).toBe("");
    expect(calcomEmbedUrl("https://evilcal.com/x")).toBe("");
    expect(calcomEmbedUrl("https://unlisted-self-hosted.example/x")).toBe("");
  });
});
