import { describe, it, expect } from "vitest";
import {
  parseEnvelope,
  serializeEnvelope,
  readConsentState,
  applyConsent,
  applyOptOut,
  applyResult,
} from "@/lib/enrichment/store";
import { makeEnrichmentConsent, makeEnrichmentOptOut } from "@/lib/enrichment/consent";
import { makeEnrichmentProvenance } from "@/lib/enrichment/provenance";
import type { EnrichmentResult } from "@/lib/enrichment/provider";

describe("enrichment store — parse", () => {
  it("returns {} for null / invalid / array json", () => {
    expect(parseEnvelope(null)).toEqual({});
    expect(parseEnvelope("")).toEqual({});
    expect(parseEnvelope("not json")).toEqual({});
    expect(parseEnvelope("[1,2,3]")).toEqual({});
  });

  it("round-trips an object, preserving unknown legacy keys", () => {
    const env = parseEnvelope('{"summary":"hi","bidWaiverUrl":"https://x/y.pdf","legacy":1}');
    expect(env.summary).toBe("hi");
    expect(env.bidWaiverUrl).toBe("https://x/y.pdf");
    expect(env.legacy).toBe(1);
    expect(parseEnvelope(serializeEnvelope(env))).toEqual(env);
  });
});

describe("enrichment store — consent", () => {
  it("readConsentState pulls consent + opt-out for the gate", () => {
    const consent = makeEnrichmentConsent({ method: "admin-attested" });
    expect(readConsentState({ _enrichConsent: consent })).toEqual({ consent, optOut: null });
    expect(readConsentState({})).toEqual({ consent: null, optOut: null });
  });

  it("applyConsent sets consent and clears any prior opt-out", () => {
    const before = applyOptOut({ summary: "x" }, makeEnrichmentOptOut({ by: "candidate" }));
    expect(before._enrichOptOut).toBeTruthy();
    const consent = makeEnrichmentConsent({ method: "rush-form" });
    const after = applyConsent(before, consent);
    expect(after._enrichConsent).toBe(consent);
    expect(after._enrichOptOut).toBeNull();
  });
});

describe("enrichment store — opt-out purges gathered data", () => {
  it("strips result + provenance but keeps consent + bid waiver", () => {
    const env = {
      summary: "Some public info",
      bullets: ["a", "b"],
      links: [{ label: "L", url: "https://x" }],
      source: "web-search",
      searchedAt: "2026-07-11T00:00:00.000Z",
      _enrichProvenance: makeEnrichmentProvenance("web-search"),
      _enrichProviderId: "web-search",
      _enrichRedactions: { religion: 1 },
      _enrichConsent: makeEnrichmentConsent({ method: "rush-form" }),
      bidWaiverUrl: "https://x/waiver.pdf",
    };
    const out = applyOptOut(env, makeEnrichmentOptOut({ by: "candidate" }));
    expect(out.summary).toBeUndefined();
    expect(out.bullets).toBeUndefined();
    expect(out.links).toBeUndefined();
    expect(out._enrichProvenance).toBeUndefined();
    expect(out._enrichRedactions).toBeUndefined();
    // preserved:
    expect(out._enrichConsent).toBeTruthy();
    expect(out._enrichOptOut).toBeTruthy();
    expect(out.bidWaiverUrl).toBe("https://x/waiver.pdf");
  });
});

describe("enrichment store — applyResult", () => {
  it("writes flat result + provenance, preserving consent + bid waiver", () => {
    const result: EnrichmentResult = {
      summary: "public links",
      links: [{ label: "Google", url: "https://g" }],
      provenance: makeEnrichmentProvenance("public-links", { confidence: 0.2 }),
    };
    const env = {
      _enrichConsent: makeEnrichmentConsent({ method: "admin-attested" }),
      bidWaiverUrl: "https://x/waiver.pdf",
    };
    const out = applyResult(env, result, "public-links", {});
    expect(out.summary).toBe("public links");
    expect(out.source).toBe("public-links");
    expect(out.searchedAt).toBe(result.provenance.fetchedAt);
    expect(out._enrichProviderId).toBe("public-links");
    expect(out._enrichConsent).toBeTruthy();
    expect(out.bidWaiverUrl).toBe("https://x/waiver.pdf");
  });
});
