import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  KNOWN_SECTION_KEYS,
  isKnownSectionKey,
  TEMPLATE_ORDER,
} from "@/components/site/templates/template-orders";

const ROOT = resolve(__dirname, "..");

// ── Section-key allow-list (pure) ─────────────────────────────────────────────
// KNOWN_SECTION_KEYS is the union of every TEMPLATE_ORDER and is the single
// validator the section-builder API uses to reject typo/unknown keys before they
// land in the structured Section store.
describe("section-builder known-key allow-list", () => {
  it("is exactly the union of all template orders (no drift)", () => {
    const union = new Set(Object.values(TEMPLATE_ORDER).flat());
    expect(new Set(KNOWN_SECTION_KEYS)).toEqual(union);
    // Classic is the complete 15-section set, so the union is at least that.
    expect(KNOWN_SECTION_KEYS.length).toBe(15);
  });

  it("isKnownSectionKey accepts every real key and rejects unknowns", () => {
    for (const key of TEMPLATE_ORDER.classic) {
      expect(isKnownSectionKey(key)).toBe(true);
    }
    expect(isKnownSectionKey("hero")).toBe(true);
    expect(isKnownSectionKey("register")).toBe(true);
    // Unknown / typo / empty → rejected, so the API 404s instead of persisting it.
    expect(isKnownSectionKey("heroo")).toBe(false);
    expect(isKnownSectionKey("")).toBe(false);
    expect(isKnownSectionKey("DROP TABLE")).toBe(false);
  });
});

// ── Byte-identical fallback wiring (source-pin) ───────────────────────────────
// The single load-bearing invariant of the whole feature: when a tenant has NOT
// adopted the structured Section store, the public landing page must render
// EXACTLY as before. getStructuredOrder() returns null in that case and the
// renderer falls back to the legacy parseJsonArray(cfg["website.sections"]) line.
// We pin that the fallback line is present and that the structured order is only
// consulted via `??` (so null can only ever defer to the legacy path).
describe("chapter-landing structured-order fallback is byte-identical when null", () => {
  const landing = readFileSync(
    resolve(ROOT, "components/site/chapter-landing.tsx"),
    "utf8",
  );

  it("consults getStructuredOrder() but defers to the legacy SiteConfig order via ??", () => {
    expect(landing).toContain("const structuredOrder = await getStructuredOrder();");
    // The `??` guarantees: structuredOrder === null → exact legacy expression.
    expect(landing).toContain(
      'const order = structuredOrder ?? parseJsonArray<string>(cfg["website.sections"], defaultOrder);',
    );
  });

  it("only re-appends missing default sections in LEGACY mode (structured omissions stay hidden)", () => {
    // In structured mode an omitted section is intentionally hidden, so the
    // default-reappend loop must be gated behind the legacy branch. Pin that the
    // re-append happens inside the `else` (legacy) branch, not unconditionally.
    expect(landing).toContain("if (structuredOrder) {");
    expect(landing).toMatch(/}\s*else\s*{[\s\S]*defaultOrder\.forEach/);
  });
});

// ── API route gate + validation (source-pin) ──────────────────────────────────
// The structured store is admin-only and self-healing. Pin the security gates
// (cookie auth + admin role + same-origin CSRF), the known-key validation, and
// the self-heal call so a regression that drops any of them fails loudly.
describe("/api/admin/website/[section] route guards", () => {
  const route = readFileSync(
    resolve(ROOT, "app/api/admin/website/[section]/route.ts"),
    "utf8",
  );

  it("gates PATCH on admin auth + admin role + same-origin", () => {
    expect(route).toContain("isAdminAuthed()");
    expect(route).toContain("isAdminRole()");
    expect(route).toContain("isSameOrigin(req)");
  });

  it("rejects unknown section keys before writing", () => {
    expect(route).toContain("isKnownSectionKey(sectionKey)");
    expect(route).toMatch(/status:\s*404/);
  });

  it("self-heals the tables before the first write and audits the change", () => {
    expect(route).toContain("ensureSectionTables()");
    expect(route).toContain('action: "WEBSITE_SECTION_UPDATED"');
  });
});
