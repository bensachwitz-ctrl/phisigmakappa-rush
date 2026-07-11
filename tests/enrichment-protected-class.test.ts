import { describe, it, expect } from "vitest";
import {
  scanProtectedClass,
  redactProtectedClass,
  redactEnrichment,
  summarizeHits,
  describeHits,
  REDACTION_TOKEN,
} from "@/lib/enrichment/protected-class";

describe("protected-class — scan", () => {
  it("returns [] for empty / neutral text", () => {
    expect(scanProtectedClass("")).toEqual([]);
    expect(scanProtectedClass(null)).toEqual([]);
    expect(scanProtectedClass("Plays intramural soccer, majors in finance.")).toEqual([]);
  });

  it("detects religion indicators", () => {
    const hits = scanProtectedClass("President of the Muslim Student Association.");
    expect(hits.some((h) => h.category === "religion" && h.term === "muslim")).toBe(true);
  });

  it("detects disability/health indicators", () => {
    const hits = scanProtectedClass("Open about his ADHD diagnosis.");
    expect(hits.some((h) => h.category === "disability_health")).toBe(true);
  });

  it("detects sexual-orientation indicators", () => {
    const hits = scanProtectedClass("An openly gay campus activist.");
    expect(hits.some((h) => h.category === "sexual_orientation_gender_identity")).toBe(true);
  });

  it("matches across hyphen and spacing variants", () => {
    expect(scanProtectedClass("african-american studies major").length).toBeGreaterThan(0);
    expect(scanProtectedClass("African American studies major").length).toBeGreaterThan(0);
  });

  it("is word-boundary anchored (no partial-word false positives)", () => {
    // "transcript"/"transfer" must not trip the "transgender"/bare-trans logic,
    // and "scan" must not match anything.
    expect(scanProtectedClass("Requested an official transcript after transfer.")).toEqual([]);
  });
});

describe("protected-class — redact", () => {
  it("replaces indicators with the redaction token and reports hits", () => {
    const { clean, hits } = redactProtectedClass("A devout Catholic who volunteers weekly.");
    expect(clean).toContain(REDACTION_TOKEN);
    expect(clean).not.toMatch(/catholic/i);
    expect(hits.some((h) => h.category === "religion")).toBe(true);
  });

  it("is idempotent (re-running finds nothing new)", () => {
    const once = redactProtectedClass("Lesbian student leader and Baptist youth mentor.");
    const twice = redactProtectedClass(once.clean);
    expect(twice.hits).toEqual([]);
    expect(twice.clean).toBe(once.clean);
  });

  it("leaves neutral text untouched", () => {
    const t = "Dean's list, plays club lacrosse, from Charlotte NC.";
    expect(redactProtectedClass(t)).toEqual({ clean: t, hits: [] });
  });
});

describe("protected-class — redactEnrichment", () => {
  it("scrubs summary, bullets, and link labels but keeps URLs", () => {
    const { clean, hits } = redactEnrichment({
      summary: "Devout Mormon; strong GPA.",
      bullets: ["[dailygamecock.com] Openly gay activist speaks at rally"],
      links: [
        { label: "Muslim Student Assoc profile", url: "https://example.com/msa" },
        { label: "LinkedIn", url: "https://linkedin.com/in/x" },
      ],
    });
    expect(clean.summary).not.toMatch(/mormon/i);
    expect(clean.bullets?.[0]).not.toMatch(/gay/i);
    expect(clean.links?.[0].label).toContain(REDACTION_TOKEN);
    // URL preserved (public address is not inferred content).
    expect(clean.links?.[0].url).toBe("https://example.com/msa");
    expect(clean.links?.[1].label).toBe("LinkedIn");
    expect(hits.length).toBeGreaterThanOrEqual(3);
  });

  it("does not mutate the input object", () => {
    const input = { summary: "Catholic student." };
    redactEnrichment(input);
    expect(input.summary).toBe("Catholic student.");
  });
});

describe("protected-class — summarize / describe", () => {
  it("aggregates hits by category and renders a PII-free one-liner", () => {
    const hits = scanProtectedClass("Catholic and Baptist; open about depression.");
    const summary = summarizeHits(hits);
    expect(summary.religion).toBeGreaterThanOrEqual(2);
    expect(summary.disability_health).toBeGreaterThanOrEqual(1);
    const line = describeHits(hits);
    expect(line).toMatch(/Religion x\d/);
    // the description must not leak the matched raw terms beyond category labels
    expect(line).not.toMatch(/catholic|baptist|depression/i);
  });

  it("describeHits is empty when nothing redacted", () => {
    expect(describeHits([])).toBe("");
  });
});
