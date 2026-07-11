import { describe, it, expect } from "vitest";
import {
  ENRICHMENT_DISCLOSURE_VERSION,
  ENRICHMENT_DISCLOSURE_TEXT,
  makeEnrichmentConsent,
  makeEnrichmentOptOut,
  canEnrich,
  explainGate,
} from "@/lib/enrichment/consent";
import {
  makeEnrichmentProvenance,
  enrichmentSourceRank,
} from "@/lib/enrichment/provenance";

describe("enrichment consent gate", () => {
  it("blocks when no consent is on file", () => {
    expect(canEnrich(null)).toEqual({ ok: false, reason: "no-consent" });
    expect(canEnrich({})).toEqual({ ok: false, reason: "no-consent" });
  });

  it("allows when consent is present and current", () => {
    const consent = makeEnrichmentConsent({ method: "admin-attested", capturedBy: "admin" });
    const gate = canEnrich({ consent });
    expect(gate.ok).toBe(true);
    expect(gate.stale).toBe(false);
  });

  it("flags stale consent when disclosure version has moved on", () => {
    const consent = makeEnrichmentConsent({ method: "rush-form" });
    consent.version = "1999-01-01"; // simulate an old consent
    const gate = canEnrich({ consent });
    expect(gate.ok).toBe(true);
    expect(gate.stale).toBe(true);
  });

  it("opt-out overrides an existing consent (blocked)", () => {
    const consent = makeEnrichmentConsent({ method: "rush-form" });
    const optOut = makeEnrichmentOptOut({ by: "candidate" });
    expect(canEnrich({ consent, optOut })).toEqual({ ok: false, reason: "opted-out" });
  });

  it("snapshots the disclosure text + current version on the consent", () => {
    const consent = makeEnrichmentConsent({ method: "admin-attested" });
    expect(consent.version).toBe(ENRICHMENT_DISCLOSURE_VERSION);
    expect(consent.disclosureText).toBe(ENRICHMENT_DISCLOSURE_TEXT);
    expect(typeof consent.agreedAt).toBe("string");
  });

  it("disclosure states it is not a background/credit check", () => {
    expect(ENRICHMENT_DISCLOSURE_TEXT.toLowerCase()).toContain("not a background");
    expect(ENRICHMENT_DISCLOSURE_TEXT.toLowerCase()).toContain("opt out");
  });

  it("explainGate returns friendly, PII-free copy for each state", () => {
    expect(explainGate({ ok: false, reason: "opted-out" })).toMatch(/opted out/i);
    expect(explainGate({ ok: false, reason: "no-consent" })).toMatch(/consent/i);
    expect(explainGate({ ok: true, stale: true })).toMatch(/re-confirm/i);
    expect(explainGate({ ok: true, stale: false })).toMatch(/on file/i);
  });
});

describe("enrichment provenance", () => {
  it("stamps source + fetchedAt by default", () => {
    const p = makeEnrichmentProvenance("public-links");
    expect(p.source).toBe("public-links");
    expect(typeof p.fetchedAt).toBe("string");
    expect(Number.isNaN(Date.parse(p.fetchedAt))).toBe(false);
  });

  it("carries optional provider metadata and clamps confidence to 0..1", () => {
    const p = makeEnrichmentProvenance("web-search", {
      providerLabel: "Public web search",
      method: "web-search",
      fetchedBy: "admin",
      confidence: 5,
    });
    expect(p.confidence).toBe(1);
    expect(p.fetchedBy).toBe("admin");
    const low = makeEnrichmentProvenance("web-search", { confidence: -3 });
    expect(low.confidence).toBe(0);
  });

  it("ranks a manual note above search above bare links", () => {
    expect(enrichmentSourceRank("manual")).toBeGreaterThan(enrichmentSourceRank("web-search"));
    expect(enrichmentSourceRank("web-search")).toBeGreaterThan(enrichmentSourceRank("public-links"));
    expect(enrichmentSourceRank("unknown")).toBe(0);
  });
});
