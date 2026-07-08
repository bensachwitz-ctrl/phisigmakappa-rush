import { describe, it, expect } from "vitest";
import {
  RUSH_FIELD_TYPES,
  CORE_RUSH_FIELDS,
  slugifyFieldKey,
  parseRushFormConfig,
  serializeRushFormConfig,
  validateSubmission,
  type FormFieldConfig,
} from "@/lib/rush-form-config";

// ─────────────────────────────────────────────────────────────────────────────
// Per-tenant custom rush-form config — pure core.
// Covers: the zero-config default (built-in fields), tolerant parsing of both the
// legacy and typed shapes, required/type/select validation, and tenant isolation
// (the pure functions hold no shared state, so one chapter's config can never
// bleed into another's).
// ─────────────────────────────────────────────────────────────────────────────

describe("CORE_RUSH_FIELDS (default = the current rush-form fields)", () => {
  it("documents the built-in fields so a zero-config tenant is unchanged", () => {
    const keys = CORE_RUSH_FIELDS.map((f) => f.key);
    expect(keys).toEqual(["name", "phone", "email", "year", "major", "hometown", "about"]);
    // name/phone/year are the required built-ins the form already enforces.
    expect(CORE_RUSH_FIELDS.find((f) => f.key === "name")!.required).toBe(true);
    expect(CORE_RUSH_FIELDS.find((f) => f.key === "phone")!.required).toBe(true);
    expect(CORE_RUSH_FIELDS.find((f) => f.key === "email")!.required).toBe(false);
  });
});

describe("parseRushFormConfig — zero-config default", () => {
  it("returns [] for empty / null / malformed / non-array input", () => {
    expect(parseRushFormConfig(undefined)).toEqual([]);
    expect(parseRushFormConfig(null)).toEqual([]);
    expect(parseRushFormConfig("")).toEqual([]);
    expect(parseRushFormConfig("not json{")).toEqual([]);
    expect(parseRushFormConfig("{}")).toEqual([]);
    expect(parseRushFormConfig('"a string"')).toEqual([]);
    expect(parseRushFormConfig("[]")).toEqual([]);
  });
});

describe("parseRushFormConfig — legacy shape backward compatibility", () => {
  it("upgrades the legacy {key,label,placeholder,required} text shape", () => {
    const legacy = JSON.stringify([
      { key: "gpa", label: "Your GPA", placeholder: "3.5", required: true },
      { key: "why", label: "Why rush?" },
    ]);
    const fields = parseRushFormConfig(legacy);
    expect(fields).toHaveLength(2);
    // type defaults to "text", order defaults to array position.
    expect(fields[0]).toMatchObject({ key: "gpa", label: "Your GPA", type: "text", required: true, order: 0, placeholder: "3.5" });
    expect(fields[1]).toMatchObject({ key: "why", label: "Why rush?", type: "text", required: false, order: 1 });
  });
});

describe("parseRushFormConfig — typed shape", () => {
  it("parses each supported type incl. select options + checkbox", () => {
    const raw = JSON.stringify([
      { label: "Major GPA", type: "text", required: true },
      { label: "Best email", type: "email" },
      { label: "Cell", type: "phone", required: true },
      { label: "Housing", type: "select", options: ["On-campus", "Off-campus", " ", "On-campus"] },
      { label: "Tell us more", type: "textarea", placeholder: "Anything" },
      { label: "Agree to code of conduct", type: "checkbox", required: true },
    ]);
    const fields = parseRushFormConfig(raw);
    expect(fields.map((f) => f.type)).toEqual(["text", "email", "phone", "select", "textarea", "checkbox"]);
    // select options are cleaned (blank + duplicate dropped).
    expect(fields[3].options).toEqual(["On-campus", "Off-campus"]);
    // every declared type is a member of the public union.
    for (const f of fields) expect(RUSH_FIELD_TYPES).toContain(f.type);
  });

  it("coerces an unknown type to 'text' rather than dropping the row", () => {
    const fields = parseRushFormConfig(JSON.stringify([{ label: "Weird", type: "date" }]));
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe("text");
  });

  it("drops invalid rows, de-dupes keys, and blocks reserved built-in keys", () => {
    const raw = JSON.stringify([
      null,
      42,
      { type: "text" }, // no label AND no key → dropped
      { label: "Dupe", key: "dupe" },
      { label: "Dupe again", key: "dupe" }, // same key → dropped (first wins)
      { label: "Phone", key: "phone" }, // reserved built-in → dropped
      { label: "Email", key: "email" }, // reserved built-in → dropped
    ]);
    const fields = parseRushFormConfig(raw);
    expect(fields.map((f) => f.key)).toEqual(["dupe"]);
  });

  it("respects an explicit `order` field (ascending)", () => {
    const raw = JSON.stringify([
      { label: "Third", order: 30 },
      { label: "First", order: 10 },
      { label: "Second", order: 20 },
    ]);
    expect(parseRushFormConfig(raw).map((f) => f.label)).toEqual(["First", "Second", "Third"]);
  });

  it("round-trips through serialize → parse", () => {
    const fields: FormFieldConfig[] = [
      { key: "gpa", label: "GPA", type: "text", required: true, order: 0 },
      { key: "house", label: "House", type: "select", required: false, order: 1, options: ["A", "B"] },
    ];
    expect(parseRushFormConfig(serializeRushFormConfig(fields))).toEqual(fields);
  });
});

describe("slugifyFieldKey", () => {
  it("produces stable url-safe keys and falls back on empty", () => {
    expect(slugifyFieldKey("What's your GPA?", 0)).toBe("what-s-your-gpa");
    expect(slugifyFieldKey("   ", 3)).toBe("field-3");
    expect(slugifyFieldKey("!!!", 7)).toBe("field-7");
  });
});

describe("validateSubmission — required enforcement", () => {
  const fields: FormFieldConfig[] = [
    { key: "gpa", label: "Your GPA", type: "text", required: true, order: 0 },
    { key: "note", label: "A note", type: "textarea", required: false, order: 1 },
  ];

  it("flags a missing required field, passes when provided", () => {
    const missing = validateSubmission(fields, { note: "hi" });
    expect(missing.ok).toBe(false);
    expect(missing.errors.gpa).toMatch(/Please answer/);

    const ok = validateSubmission(fields, { gpa: "3.9" });
    expect(ok.ok).toBe(true);
    expect(ok.errors).toEqual({});
  });

  it("treats whitespace-only as empty for a required field", () => {
    expect(validateSubmission(fields, { gpa: "   " }).ok).toBe(false);
  });
});

describe("validateSubmission — type checks (only when a value is present)", () => {
  it("validates email + phone shape", () => {
    const fields: FormFieldConfig[] = [
      { key: "e", label: "Email", type: "email", required: false, order: 0 },
      { key: "p", label: "Phone", type: "phone", required: false, order: 1 },
    ];
    expect(validateSubmission(fields, { e: "not-an-email" }).errors.e).toMatch(/valid email/);
    expect(validateSubmission(fields, { p: "123" }).errors.p).toMatch(/valid phone/);
    expect(validateSubmission(fields, { e: "a@b.co", p: "(803) 555-0142" }).ok).toBe(true);
    // Empty optional values are never type-checked.
    expect(validateSubmission(fields, {}).ok).toBe(true);
  });

  it("enforces select-option membership", () => {
    const fields: FormFieldConfig[] = [
      { key: "h", label: "Housing", type: "select", required: true, order: 0, options: ["On-campus", "Off-campus"] },
    ];
    expect(validateSubmission(fields, { h: "Mars" }).errors.h).toMatch(/Choose one of/);
    expect(validateSubmission(fields, { h: "On-campus" }).ok).toBe(true);
    expect(validateSubmission(fields, {}).errors.h).toMatch(/Please answer/);
  });

  it("enforces a required checkbox is checked", () => {
    const fields: FormFieldConfig[] = [
      { key: "agree", label: "I agree", type: "checkbox", required: true, order: 0 },
    ];
    expect(validateSubmission(fields, { agree: "false" }).errors.agree).toMatch(/Please check/);
    expect(validateSubmission(fields, {}).errors.agree).toMatch(/Please check/);
    expect(validateSubmission(fields, { agree: "true" }).ok).toBe(true);
  });
});

describe("validateSubmission — zero-config default passes", () => {
  it("an empty field list always validates ok (un-configured tenant)", () => {
    expect(validateSubmission([], {}).ok).toBe(true);
    expect(validateSubmission([], { anything: "ignored" }).ok).toBe(true);
  });
});

describe("tenant isolation (pure functions hold no shared state)", () => {
  it("two chapters' configs parse + validate independently", () => {
    const chapterA = parseRushFormConfig(
      JSON.stringify([{ label: "Fraternity legacy?", type: "checkbox", required: true }]),
    );
    const chapterB = parseRushFormConfig(
      JSON.stringify([{ label: "Intended major", type: "text", required: true }]),
    );

    // Distinct field sets — neither leaks into the other.
    expect(chapterA.map((f) => f.key)).toEqual(["fraternity-legacy"]);
    expect(chapterB.map((f) => f.key)).toEqual(["intended-major"]);

    // A submission that satisfies A's required checkbox does NOT satisfy B's
    // required text field, and vice versa — configs are evaluated in isolation.
    const answersForA = { "fraternity-legacy": "true" };
    expect(validateSubmission(chapterA, answersForA).ok).toBe(true);
    expect(validateSubmission(chapterB, answersForA).ok).toBe(false);

    const answersForB = { "intended-major": "Finance" };
    expect(validateSubmission(chapterB, answersForB).ok).toBe(true);
    expect(validateSubmission(chapterA, answersForB).ok).toBe(false);
  });
});
