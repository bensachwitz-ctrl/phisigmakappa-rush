import { describe, it, expect } from "vitest";
import {
  compareVersions,
  sortEntries,
  unseenEntries,
  unseenCount,
  latestVersion,
  type ChangelogEntry,
} from "@/lib/whats-new";
import changelog from "@/content/changelog.json";

const entries: ChangelogEntry[] = [
  { id: "a", version: "1.2.0", label: "A", description: "", type: "feature", releasedAt: "2026-06-18" },
  { id: "b", version: "1.3.0", label: "B", description: "", type: "feature", releasedAt: "2026-06-30" },
  { id: "c", version: "1.4.0", label: "C", description: "", type: "improvement", releasedAt: "2026-07-08" },
];

describe("compareVersions", () => {
  it("orders by numeric segments, not lexically", () => {
    expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
    expect(compareVersions("1.4.0", "1.4.0")).toBe(0);
  });

  it("treats missing segments as zero", () => {
    expect(compareVersions("1.4", "1.4.0")).toBe(0);
    expect(compareVersions("1.4.1", "1.4")).toBe(1);
  });
});

describe("sortEntries", () => {
  it("returns newest version first without mutating the input", () => {
    const input = [...entries];
    const sorted = sortEntries(input);
    expect(sorted.map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(input.map((e) => e.id)).toEqual(["a", "b", "c"]); // untouched
  });
});

describe("unseenEntries", () => {
  it("returns everything (newest-first) on first visit (no watermark)", () => {
    expect(unseenEntries(entries, null).map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(unseenEntries(entries, "").map((e) => e.id)).toEqual(["c", "b", "a"]);
  });

  it("returns only versions strictly greater than the watermark", () => {
    expect(unseenEntries(entries, "1.3.0").map((e) => e.id)).toEqual(["c"]);
  });

  it("returns nothing once the watermark is at or above the latest", () => {
    expect(unseenEntries(entries, "1.4.0")).toHaveLength(0);
    expect(unseenEntries(entries, "2.0.0")).toHaveLength(0);
  });
});

describe("unseenCount", () => {
  it("counts unseen entries", () => {
    expect(unseenCount(entries, null)).toBe(3);
    expect(unseenCount(entries, "1.3.0")).toBe(1);
    expect(unseenCount(entries, "1.4.0")).toBe(0);
  });
});

describe("latestVersion", () => {
  it("returns the highest version present", () => {
    expect(latestVersion(entries)).toBe("1.4.0");
  });

  it("returns null for an empty changelog", () => {
    expect(latestVersion([])).toBeNull();
  });
});

describe("bundled content/changelog.json", () => {
  it("parses into well-formed entries", () => {
    const data = changelog as ChangelogEntry[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
    for (const e of data) {
      expect(typeof e.id).toBe("string");
      expect(e.id.length).toBeGreaterThan(0);
      expect(e.version).toMatch(/^\d+\.\d+/);
      expect(["feature", "improvement", "fix"]).toContain(e.type);
      expect(e.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("has a resolvable latest version and shows all as unseen for a new user", () => {
    const data = changelog as ChangelogEntry[];
    expect(latestVersion(data)).not.toBeNull();
    expect(unseenCount(data, null)).toBe(data.length);
  });
});
