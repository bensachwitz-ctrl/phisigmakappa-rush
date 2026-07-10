import { describe, it, expect } from "vitest";
import { calcomEmbedUrl } from "@/lib/calcom";

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

  it("passes a full self-hosted URL through, appending embed params", () => {
    expect(calcomEmbedUrl("https://cal.phisigusc.com/meeting")).toBe(
      "https://cal.phisigusc.com/meeting?embed=true&theme=light",
    );
  });

  it("uses & when the URL already has a query string", () => {
    expect(calcomEmbedUrl("https://cal.phisigusc.com/meeting?duration=30")).toBe(
      "https://cal.phisigusc.com/meeting?duration=30&embed=true&theme=light",
    );
  });
});
