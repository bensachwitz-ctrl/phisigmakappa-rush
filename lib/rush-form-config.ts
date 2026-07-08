// ─────────────────────────────────────────────────────────────────────────────
// Per-tenant custom rush/intake form fields (pure, dependency-free core).
//
// WHAT THIS IS
// Each chapter (tenant) can add its own extra questions to the public rush form
// ON TOP of the always-on built-in fields (name / phone / email / year / major /
// hometown / about). Those extra questions are stored per-tenant as a JSON string
// in the tenant's own SiteConfig table under the key `rush.customQuestions`
// (see lib/site-config.ts). Because SiteConfig lives inside the per-tenant
// Postgres schema, this config is STRUCTURALLY tenant-scoped — chapter A's fields
// can never be read from chapter B's schema, so there is no cross-tenant leak and
// no `tenantId` column is needed. No Prisma migration is required: `rush.*` keys
// already flow through the audited, admin-role-gated PATCH /api/admin/settings.
//
// WHY A JSON STRING (not a new table)
// This mirrors the existing repeater pattern the chapter site already uses for
// timeline.json / faq.json / values.json / feed.json — additive, zero-migration,
// forward-compatible. The shape is versioned only by tolerant parsing here.
//
// BACKWARD COMPATIBILITY
// The legacy shape stored `{ key, label, placeholder?, required? }` (text inputs
// only). `parseRushFormConfig` upgrades those rows in place — `type` defaults to
// "text", `order` defaults to array position — so a tenant that configured custom
// questions before this typed model shipped keeps working with zero edits, and a
// tenant with NO config renders exactly the built-in fields as before.
//
// PURITY: no React / Prisma / next imports here on purpose, so this module is
// importable from BOTH the client rush form and the server /api/rush route, and
// is unit-testable in the pure-node vitest env (see tests/rush-form-config.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

/** The input kinds a chapter can pick for a custom rush-form question. */
export const RUSH_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "select",
  "textarea",
  "checkbox",
] as const;

export type RushFieldType = (typeof RUSH_FIELD_TYPES)[number];

/** A single custom question on a chapter's rush/intake form. */
export interface FormFieldConfig {
  /** Stable slug, unique within one chapter's config. Used as the answer key. */
  key: string;
  /** Human-facing question label shown on the form. */
  label: string;
  /** Which input control renders for this field. */
  type: RushFieldType;
  /** When true, the field must be answered before the form can be submitted. */
  required: boolean;
  /** Choices for `type: "select"` (ignored for every other type). */
  options?: string[];
  /** Optional placeholder / helper text for text-like inputs. */
  placeholder?: string;
  /** Ascending render order. Lower renders first. */
  order: number;
}

/**
 * The always-on BUILT-IN rush fields, expressed as config for reference.
 *
 * These are hard-rendered by components/site/rush-form.tsx and validated by the
 * zod schema in app/api/rush/route.ts — a chapter cannot remove them. They are
 * exposed here as the "default config (the current rush-form fields)" so an admin
 * UI can show what already ships out of the box, and so a tenant with ZERO custom
 * questions still presents the current field set unchanged. Custom questions
 * (below) are strictly ADDITIVE on top of these.
 */
export const CORE_RUSH_FIELDS: readonly FormFieldConfig[] = [
  { key: "name", label: "Full name", type: "text", required: true, order: 0 },
  { key: "phone", label: "Phone", type: "phone", required: true, order: 1 },
  { key: "email", label: "Email", type: "email", required: false, order: 2 },
  { key: "year", label: "Year", type: "select", required: true, order: 3, options: ["Freshman", "Sophomore", "Junior", "Senior", "Transfer"] },
  { key: "major", label: "Major", type: "text", required: false, order: 4 },
  { key: "hometown", label: "Hometown", type: "text", required: false, order: 5 },
  { key: "about", label: "Anything else", type: "textarea", required: false, order: 6 },
];

/** Reserved keys — a custom question may not shadow a built-in field. */
const RESERVED_KEYS = new Set<string>([
  ...CORE_RUSH_FIELDS.map((f) => f.key),
  "headshotUrl",
  "backgroundInfo",
  "highSchoolInfo",
  "ageAttestation",
  "consent",
  "website",
  "customAnswers",
]);

/**
 * Slugify an arbitrary label/key into a stable, url-safe answer key. Falls back
 * to `field-<index>` when the input has no alphanumeric content (e.g. a label of
 * only punctuation), so every accepted field always has a usable key.
 */
export function slugifyFieldKey(raw: unknown, index: number): string {
  const s = String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || `field-${index}`;
}

/** Coerce a raw options value into a clean, de-duplicated string[] (or []). */
function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of raw) {
    const v = typeof o === "string" ? o.trim() : "";
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Normalize one raw config entry into a FormFieldConfig, or return null when the
 * entry is unusable (not an object, or has no label AND no key to slug from).
 * Tolerant by design — an admin typo in one row never breaks the whole form.
 */
function normalizeField(raw: any, index: number): FormFieldConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const labelSource =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim()
      : typeof raw.key === "string" && raw.key.trim()
        ? raw.key.trim()
        : "";
  if (!labelSource) return null;

  const key = slugifyFieldKey(
    typeof raw.key === "string" && raw.key.trim() ? raw.key : labelSource,
    index,
  );

  const type: RushFieldType = RUSH_FIELD_TYPES.includes(raw.type)
    ? (raw.type as RushFieldType)
    : "text";

  const order =
    typeof raw.order === "number" && Number.isFinite(raw.order) ? raw.order : index;

  const field: FormFieldConfig = {
    key,
    label: labelSource,
    type,
    required: raw.required === true,
    order,
  };

  if (type === "select") field.options = normalizeOptions(raw.options);
  if (typeof raw.placeholder === "string" && raw.placeholder.trim()) {
    field.placeholder = raw.placeholder.trim();
  }
  return field;
}

/**
 * Parse a chapter's `rush.customQuestions` SiteConfig value into a clean,
 * ordered list of custom fields. Fully tolerant: returns [] for empty / malformed
 * / non-array input (preserving the "no custom questions" default), drops invalid
 * rows, drops rows that collide with a built-in/reserved key, de-duplicates keys
 * (first wins), and sorts by `order` (stable on ties via original index).
 */
export function parseRushFormConfig(raw: string | null | undefined): FormFieldConfig[] {
  if (!raw || typeof raw !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const fields: Array<{ field: FormFieldConfig; index: number }> = [];
  parsed.forEach((entry, index) => {
    const field = normalizeField(entry, index);
    if (!field) return;
    if (RESERVED_KEYS.has(field.key)) return; // never shadow a built-in field
    if (seen.has(field.key)) return; // first occurrence of a key wins
    seen.add(field.key);
    fields.push({ field, index });
  });

  return fields
    .sort((a, b) => a.field.order - b.field.order || a.index - b.index)
    .map(({ field }) => field);
}

/** Serialize a field list back to the SiteConfig JSON string (admin save path). */
export function serializeRushFormConfig(fields: FormFieldConfig[]): string {
  return JSON.stringify(fields);
}

export interface ValidationResult {
  ok: boolean;
  /** field.key → human-readable message. Empty when ok. */
  errors: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a set of submitted answers against a chapter's custom field config.
 * PURE — the single source of truth shared by the client form (live validation)
 * and the server /api/rush route (authoritative gate). Only the CUSTOM fields are
 * checked here; the built-in fields are validated by the rush zod schema.
 *
 *  • required     → must be present (checkbox: must be checked/"true")
 *  • email type   → basic address shape when a value is present
 *  • phone type   → at least 7 digits when a value is present
 *  • select type  → value must be one of the configured options (when options set)
 *
 * An empty `fields` list (the zero-config default) always returns ok, so existing
 * tenants and any un-configured chapter submit exactly as before.
 */
export function validateSubmission(
  fields: FormFieldConfig[],
  values: Record<string, unknown> | null | undefined,
): ValidationResult {
  const errors: Record<string, string> = {};
  const vals = values || {};

  for (const field of fields) {
    const raw = vals[field.key];
    const val = (raw ?? "").toString().trim();
    const checked = val === "true" || val === "on" || val === "1";

    if (field.required) {
      if (field.type === "checkbox") {
        if (!checked) {
          errors[field.key] = `Please check: ${field.label}`;
          continue;
        }
      } else if (!val) {
        errors[field.key] = `Please answer: ${field.label}`;
        continue;
      }
    }

    if (!val) continue; // nothing more to check on an empty optional field

    if (field.type === "email" && !EMAIL_RE.test(val)) {
      errors[field.key] = "Enter a valid email.";
    } else if (field.type === "phone" && val.replace(/\D/g, "").length < 7) {
      errors[field.key] = "Enter a valid phone number.";
    } else if (
      field.type === "select" &&
      field.options &&
      field.options.length > 0 &&
      !field.options.includes(val)
    ) {
      errors[field.key] = `Choose one of: ${field.options.join(", ")}`;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
