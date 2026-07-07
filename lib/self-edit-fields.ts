// lib/self-edit-fields.ts — the ONE place that decides which Brother columns a
// member may edit on their OWN row (PATCH /api/admin/brothers self-edit branch).
//
// SECURITY (P0): this is an ALLOWLIST, deliberately not a denylist. The prior
// self-edit branch deleted a fixed set (role/duesPaid/serviceHours) but forgot
// `position` and `status`, so a plain member could PATCH their own id with
//   • position:"President" → trusted by lib/mobile-exec-auth (isOfficerPosition)
//     to unlock the officer-only /api/mobile/exec/* tools, and
//   • status:"INITIATE"    → unlocks initiate-only ritual documents.
// A denylist re-introduces exactly this class of bug every time the schema gains
// a new authz-sensitive column. An allowlist fails closed: any field not named
// here is dropped, so a future column can never silently become self-editable.

/**
 * Fields a member may ALWAYS edit on their own Brother row — pure profile data
 * with no authz/money/standing meaning. (`id` is handled by the caller and is
 * never part of the editable body.)
 */
export const SELF_EDITABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "year",
  "major",
  "bio",
  "headshotUrl",
  "pledgeClass",
] as const;

/**
 * Additional fields a member may edit on their own row ONLY when they hold the
 * `academic:write` officer permission (e.g. an academic chair updating their own
 * study hours). Gated because they feed academic standing reports.
 */
export const SELF_EDITABLE_ACADEMIC_FIELDS = ["studyHours", "academicStanding"] as const;

const BASE_SET: ReadonlySet<string> = new Set(SELF_EDITABLE_FIELDS);
const ACADEMIC_SET: ReadonlySet<string> = new Set(SELF_EDITABLE_ACADEMIC_FIELDS);

/**
 * Is `key` editable by a member on their OWN row, given their permissions?
 * `studyHours`/`academicStanding` require academic:write; everything else must
 * be in the always-allowed base list. Anything not named → false (dropped).
 */
export function isSelfEditableField(
  key: string,
  opts: { isAcademicWriter: boolean },
): boolean {
  if (BASE_SET.has(key)) return true;
  if (opts.isAcademicWriter && ACADEMIC_SET.has(key)) return true;
  return false;
}

/**
 * Reduce a self-edit PATCH body (already stripped of `id`) to only the fields
 * the member may set on their own row. Returns a NEW object; the input is not
 * mutated. Authz-sensitive fields (role, position, status, duesPaid,
 * serviceHours, pledge line/initiation/graduation data, …) are never copied.
 */
export function pickSelfEditableFields<T extends Record<string, unknown>>(
  rest: T,
  opts: { isAcademicWriter: boolean },
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(rest)) {
    if (isSelfEditableField(key, opts)) {
      (out as Record<string, unknown>)[key] = rest[key];
    }
  }
  return out;
}
