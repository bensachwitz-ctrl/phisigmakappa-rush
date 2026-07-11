// rush-form-builder.ts — PURE mutation helpers for the rushee/PNM intake FORM
// BUILDER (item 7). The data layer (lib/rush-form-config.ts: FormFieldConfig,
// parse/serialize/validate) already exists; this adds the add / remove / reorder
// (drag) / update / required-toggle / type-change operations a form-builder UI
// drives, as pure functions on a FormFieldConfig[] so they're trivially testable
// and framework-free. The builder is fully DATA-DRIVEN: a chapter customizes its
// own intake form (custom questions on top of the always-on built-in fields)
// with no code changes.
//
// Every operation returns a NEW array with `order` re-indexed 0..n so the
// persisted config is always contiguous and drag-drop can't leave gaps.

import {
  FormFieldConfig,
  RushFieldType,
  RUSH_FIELD_TYPES,
  slugifyFieldKey,
} from "@/lib/rush-form-config";

/** Re-index a field list so `order` is contiguous 0..n in array order. */
export function reindex(fields: FormFieldConfig[]): FormFieldConfig[] {
  return fields.map((f, i) => ({ ...f, order: i }));
}

/**
 * A key unique within this field list, derived from the label. Appends -2, -3…
 * on collision so two "Instagram handle" questions never share an answer key.
 */
export function uniqueKey(fields: FormFieldConfig[], label: string, index = fields.length): string {
  const base = slugifyFieldKey(label, index);
  const taken = new Set(fields.map((f) => f.key));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** A fresh, valid custom field appended after the current list. */
export function newField(fields: FormFieldConfig[], partial: Partial<FormFieldConfig> = {}): FormFieldConfig {
  const label = (partial.label ?? "New question").trim() || "New question";
  const type: RushFieldType = RUSH_FIELD_TYPES.includes(partial.type as RushFieldType)
    ? (partial.type as RushFieldType)
    : "text";
  const field: FormFieldConfig = {
    key: partial.key ? uniqueKey(fields, partial.key) : uniqueKey(fields, label),
    label,
    type,
    required: partial.required === true,
    order: fields.length,
  };
  if (type === "select") field.options = partial.options?.length ? [...partial.options] : ["Option 1", "Option 2"];
  if (partial.placeholder) field.placeholder = partial.placeholder;
  return field;
}

/** Append a new field (creating one if not supplied). Returns the new list. */
export function addField(fields: FormFieldConfig[], partial?: Partial<FormFieldConfig>): FormFieldConfig[] {
  return reindex([...fields, newField(fields, partial)]);
}

/** Remove the field with `key`. Returns the new (re-indexed) list. */
export function removeField(fields: FormFieldConfig[], key: string): FormFieldConfig[] {
  return reindex(fields.filter((f) => f.key !== key));
}

/**
 * Move the field at `fromIndex` to `toIndex` (drag-drop reorder). Indices out of
 * range are clamped; a no-op move returns an equivalent re-indexed list.
 */
export function reorderFields(fields: FormFieldConfig[], fromIndex: number, toIndex: number): FormFieldConfig[] {
  const n = fields.length;
  if (n === 0) return [];
  const from = Math.max(0, Math.min(n - 1, fromIndex));
  const to = Math.max(0, Math.min(n - 1, toIndex));
  const next = [...fields];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return reindex(next);
}

/** Move a field one slot up/down (keyboard reorder). */
export function moveField(fields: FormFieldConfig[], key: string, dir: "up" | "down"): FormFieldConfig[] {
  const i = fields.findIndex((f) => f.key === key);
  if (i < 0) return fields;
  return reorderFields(fields, i, dir === "up" ? i - 1 : i + 1);
}

/**
 * Patch a field's editable props (label/type/required/options/placeholder).
 * Changing the TYPE away from "select" drops its options; changing TO "select"
 * seeds defaults if none. The `key` and `order` are managed here, never patched
 * directly (a label edit does NOT rekey — that would orphan collected answers).
 */
export function updateField(
  fields: FormFieldConfig[],
  key: string,
  patch: Partial<Pick<FormFieldConfig, "label" | "type" | "required" | "options" | "placeholder">>,
): FormFieldConfig[] {
  return fields.map((f) => {
    if (f.key !== key) return f;
    const next: FormFieldConfig = { ...f };
    if (patch.label !== undefined) next.label = patch.label.trim() || f.label;
    if (patch.required !== undefined) next.required = patch.required === true;
    if (patch.type !== undefined && RUSH_FIELD_TYPES.includes(patch.type)) next.type = patch.type;
    if (patch.placeholder !== undefined) {
      const p = patch.placeholder.trim();
      if (p) next.placeholder = p;
      else delete next.placeholder;
    }
    if (patch.options !== undefined) next.options = patch.options.map((o) => o.trim()).filter(Boolean);
    // Keep options consistent with the resolved type.
    if (next.type === "select") {
      if (!next.options || next.options.length === 0) next.options = ["Option 1", "Option 2"];
    } else {
      delete next.options;
    }
    return next;
  });
}

/** Convenience: flip a field's required flag. */
export function toggleRequired(fields: FormFieldConfig[], key: string): FormFieldConfig[] {
  const f = fields.find((x) => x.key === key);
  return f ? updateField(fields, key, { required: !f.required }) : fields;
}
