import { describe, it, expect, beforeAll } from "vitest";
import {
  publicLinksProvider,
  webSearchProvider,
  enrichmentProviderStatuses,
  registerEnrichmentProvider,
  runEnrichment,
  type RusheeEnrichmentProvider,
} from "@/lib/enrichment/provider";

describe("enrichment provider registry", () => {
  it("registers the built-in public-links + web-search providers", () => {
    const ids = enrichmentProviderStatuses().map((s) => s.id);
    expect(ids).toContain("public-links");
    expect(ids).toContain("web-search");
  });

  it("public-links is always configured; web-search is env-gated", () => {
    const statuses = enrichmentProviderStatuses();
    const links = statuses.find((s) => s.id === "public-links");
    const search = statuses.find((s) => s.id === "web-search");
    expect(links?.configured).toBe(true);
    expect(search?.configured).toBe(
      Boolean(process.env.ENRICHMENT_SEARCH_API_KEY || process.env.TAVILY_API_KEY),
    );
  });

  it("public-links produces links + low-confidence provenance, no network", async () => {
    const r = await publicLinksProvider.enrich({
      name: "Jordan Rivers",
      schoolName: "State University",
      schoolShort: "State",
      schoolUrl: "https://state.edu",
    });
    expect(r).not.toBeNull();
    expect(r!.links && r!.links.length).toBeGreaterThan(0);
    expect(r!.provenance.source).toBe("public-links");
    expect(r!.provenance.confidence).toBeCloseTo(0.2);
    expect(typeof r!.provenance.fetchedAt).toBe("string");
  });

  it("web-search returns null when unconfigured (falls through)", async () => {
    if (webSearchProvider.isConfigured()) return; // skip if a key is present
    const r = await webSearchProvider.enrich({ name: "Jordan Rivers" });
    expect(r).toBeNull();
  });
});

describe("runEnrichment — redaction firewall", () => {
  beforeAll(() => {
    // A hostile high-priority provider that returns protected-class content, to
    // prove runEnrichment redacts BEFORE returning.
    const hostile: RusheeEnrichmentProvider = {
      id: "test-hostile",
      label: "Test hostile",
      source: "web-search",
      priority: 9999,
      isConfigured: () => true,
      async enrich() {
        return {
          summary: "Devout Catholic; openly gay activist with an ADHD diagnosis.",
          bullets: ["Muslim Student Association president"],
          links: [{ label: "Baptist youth group", url: "https://example.com/x" }],
          provenance: {
            source: "web-search",
            fetchedAt: new Date().toISOString(),
          },
        };
      },
    };
    registerEnrichmentProvider(hostile);
  });

  it("strips protected-class signals and reports redactions", async () => {
    const out = await runEnrichment({ name: "Test PNM", fetchedBy: "admin" });
    expect(out).not.toBeNull();
    expect(out!.providerId).toBe("test-hostile");
    expect(out!.result.summary).not.toMatch(/catholic|gay|adhd/i);
    expect(out!.result.bullets?.[0]).not.toMatch(/muslim/i);
    expect(out!.result.links?.[0].label).not.toMatch(/baptist/i);
    // URL preserved.
    expect(out!.result.links?.[0].url).toBe("https://example.com/x");
    expect(out!.redactions.length).toBeGreaterThanOrEqual(4);
  });
});
