import crypto from "crypto";

/**
 * Poll-options helpers, extracted out of app/api/polls/route.ts because
 * Next.js App Router treats route files as having a fixed export
 * surface (GET, POST, PATCH, DELETE, runtime, dynamic, etc.). Any
 * additional named export there now breaks the typed-routes build:
 *
 *   Property 'parsePollOptions' is incompatible with index signature.
 *   Type '(raw: string) => PollOption[]' is not assignable to type 'never'.
 *
 * Moving the helpers to a lib file removes them from the App Router's
 * "what may live next to GET/POST" constraint, and the route file +
 * vote route file both import from here.
 */

export type PollOption = { id: string; label: string };

/** Best-effort parse of the JSON-stored options column. Returns [] on any error. */
export function parsePollOptions(raw: string): PollOption[] {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (o): o is PollOption =>
          o &&
          typeof o === "object" &&
          typeof (o as { id?: unknown }).id === "string" &&
          typeof (o as { label?: unknown }).label === "string",
      )
      .map((o) => ({ id: o.id, label: o.label }));
  } catch {
    return [];
  }
}

/**
 * Opaque-id generator for poll options. 16 hex chars is collision-safe
 * within any single poll (we cap polls at 6 options).
 */
export function newOptionId(): string {
  return "o_" + crypto.randomBytes(8).toString("hex");
}
