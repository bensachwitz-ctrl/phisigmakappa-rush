import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  addField,
  removeField,
  reorderFields,
  moveField,
  updateField,
  toggleRequired,
  uniqueKey,
  reindex,
  newField,
} from "@/lib/rush-form-builder";
import { parseRushFormConfig, serializeRushFormConfig } from "@/lib/rush-form-config";
import type { FormFieldConfig } from "@/lib/rush-form-config";

// ── Item-7: rushee/PNM intake FORM BUILDER — pure mutation helpers ────────────

const seed = (): FormFieldConfig[] => [
  { key: "instagram", label: "Instagram", type: "text", required: false, order: 0 },
  { key: "gpa", label: "GPA", type: "text", required: true, order: 1 },
  { key: "why", label: "Why us", type: "textarea", required: false, order: 2 },
];

describe("add / remove keep order contiguous", () => {
  it("adds a new field at the end with the next order + a unique key", () => {
    const out = addField(seed(), { label: "Referral" });
    expect(out).toHaveLength(4);
    expect(out[3].order).toBe(3);
    expect(out[3].key).toBe("referral");
  });
  it("dedupes a colliding key", () => {
    const out = addField(seed(), { label: "Instagram" });
    expect(out[3].key).toBe("instagram-2");
  });
  it("removes a field and re-indexes order 0..n", () => {
    const out = removeField(seed(), "gpa");
    expect(out.map((f) => f.key)).toEqual(["instagram", "why"]);
    expect(out.map((f) => f.order)).toEqual([0, 1]);
  });
});

describe("reorder (drag-drop) + move (keyboard)", () => {
  it("moves a field from one index to another and re-indexes", () => {
    const out = reorderFields(seed(), 0, 2); // Instagram to the end
    expect(out.map((f) => f.key)).toEqual(["gpa", "why", "instagram"]);
    expect(out.map((f) => f.order)).toEqual([0, 1, 2]);
  });
  it("clamps out-of-range indices instead of losing a field", () => {
    const out = reorderFields(seed(), 1, 99);
    expect(out).toHaveLength(3);
    expect(out[2].key).toBe("gpa");
  });
  it("moveField up/down one slot", () => {
    expect(moveField(seed(), "why", "up").map((f) => f.key)).toEqual(["instagram", "why", "gpa"]);
    expect(moveField(seed(), "instagram", "up").map((f) => f.key)).toEqual(["instagram", "gpa", "why"]); // already top → no-op
  });
});

describe("update field props + type/options consistency", () => {
  it("edits label without rekeying (so collected answers aren't orphaned)", () => {
    const out = updateField(seed(), "instagram", { label: "IG handle" });
    expect(out[0].label).toBe("IG handle");
    expect(out[0].key).toBe("instagram"); // key stable
  });
  it("switching to select seeds options; switching away drops them", () => {
    const toSelect = updateField(seed(), "gpa", { type: "select" });
    expect(toSelect[1].type).toBe("select");
    expect(toSelect[1].options?.length).toBeGreaterThan(0);
    const back = updateField(toSelect, "gpa", { type: "text" });
    expect(back[1].options).toBeUndefined();
  });
  it("toggleRequired flips the flag", () => {
    const out = toggleRequired(seed(), "instagram");
    expect(out[0].required).toBe(true);
  });
});

describe("uniqueKey + reindex", () => {
  it("uniqueKey appends -n on collision", () => {
    const fields = seed();
    expect(uniqueKey(fields, "Instagram")).toBe("instagram-2");
    expect(uniqueKey(fields, "Brand new")).toBe("brand-new");
  });
  it("newField always produces a valid, ordered field", () => {
    const f = newField(seed(), { label: "Ref", type: "select" });
    expect(f.order).toBe(3);
    expect(f.type).toBe("select");
    expect(f.options?.length).toBeGreaterThan(0);
  });
});

describe("the form-builder UI is a thin shell over the tested helpers (item 5)", () => {
  const src = readFileSync(
    resolve(__dirname, "..", "app/admin/forms/forms-client.tsx"),
    "utf8",
  );
  it("imports its mutations from lib/rush-form-builder, not a private reimplementation", () => {
    expect(src).toMatch(/from "@\/lib\/rush-form-builder"/);
    for (const fn of ["addField", "removeField", "reorderFields", "moveField", "updateField", "toggleRequired"]) {
      expect(src, `UI should call ${fn}`).toContain(fn);
    }
  });
  it("wires drag-and-drop reorder through reorderFields and keyboard move through moveField", () => {
    expect(src).toMatch(/reorderFields\(f, dragIndex, target\)/);
    expect(src).toMatch(/moveField\(f, key, dir\)/);
    // draggable cards make it Form.io-style, not just up/down buttons.
    expect(src).toMatch(/onDragStart|draggable/);
  });
  it("renders a live preview of the built form", () => {
    expect(src).toMatch(/FormPreview/);
  });
});

describe("round-trips through the existing persistence layer", () => {
  it("a built form serializes + parses back to the same custom fields", () => {
    let fields: FormFieldConfig[] = [];
    fields = addField(fields, { label: "Instagram" });
    fields = addField(fields, { label: "Dietary", type: "select", options: ["None", "Veg"] });
    fields = reorderFields(fields, 1, 0);
    fields = toggleRequired(fields, fields[0].key);
    const round = parseRushFormConfig(serializeRushFormConfig(fields));
    expect(round.map((f) => f.label)).toEqual(fields.map((f) => f.label));
    expect(round.map((f) => f.order)).toEqual([0, 1]);
  });
});
