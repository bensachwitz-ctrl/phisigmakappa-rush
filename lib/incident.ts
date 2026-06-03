// Incident report helpers — pure functions, no DB / framework dependencies.
//
// ── ANONYMITY CONTRACT ─────────────────────────────────────────────────────
// `sanitizeIncidentBody` MUST be applied to the subject and body of every
// incident report before persistence. The sanitizer:
//
//   1. Strips HTML tags so a hostile submitter cannot inject script tags.
//   2. Normalises whitespace.
//   3. Clamps length so we never spend unbounded DB or audit storage on a
//      single submission.
//
// The route handler is responsible for the second half of the contract:
// `/api/incident-report` MUST NOT call `getCurrentBrotherId()`, `cookies()`,
// or any session helper. Authenticated users who want their identity attached
// must pass `identifyAs: brotherId` in the body, which is verified separately
// by the admin review surface (not at intake time, so a leaked cookie cannot
// silently identify a previously-anonymous submitter).
// ───────────────────────────────────────────────────────────────────────────

const INCIDENT_CATEGORIES = ["hazing", "safety", "financial", "conduct", "other"] as const;
const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
const INCIDENT_STATUSES = ["submitted", "reviewing", "resolved", "escalated"] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_CATEGORY_OPTIONS = INCIDENT_CATEGORIES;
export const INCIDENT_SEVERITY_OPTIONS = INCIDENT_SEVERITIES;
export const INCIDENT_STATUS_OPTIONS = INCIDENT_STATUSES;

/** Strip HTML and normalise whitespace. */
export function sanitizeIncidentBody(raw: unknown, maxLen = 5000): string {
  if (typeof raw !== "string") return "";
  // Remove tags entirely; an incident report has no need for rich text.
  let s = raw.replace(/<[^>]*>/g, " ");
  // Collapse runs of whitespace.
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

/**
 * Public-facing receipt code — 10 chars of [A-Z0-9]. We surface this to the
 * submitter (anonymous or identified) so they can reference the case without
 * relying on the internal CUID, which is leakier (sortable, predictable). The
 * receipt code is stored alongside the CUID and used by the risk officer when
 * they need to confirm a referenced report.
 */
export function generateReceiptCode(): string {
  // Crypto-safe pick from 32 chars. Avoid 0/O/1/I/L for human-readability.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
    const buf = new Uint32Array(10);
    (crypto as any).getRandomValues(buf);
    for (let i = 0; i < 10; i++) out += alphabet[buf[i] % alphabet.length];
  } else {
    for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function isIncidentCategory(s: unknown): s is IncidentCategory {
  return typeof s === "string" && (INCIDENT_CATEGORIES as readonly string[]).includes(s);
}
export function isIncidentSeverity(s: unknown): s is IncidentSeverity {
  return typeof s === "string" && (INCIDENT_SEVERITIES as readonly string[]).includes(s);
}
export function isIncidentStatus(s: unknown): s is IncidentStatus {
  return typeof s === "string" && (INCIDENT_STATUSES as readonly string[]).includes(s);
}

// ── Public rate-limit helper ─────────────────────────────────────────────────
// The /api/incident-report route counts submissions per IP via a simple
// in-memory bucket. This is intentionally NOT a DB table because writing a
// log row keyed by IP would itself leak a partial identifier. The cost of
// being wrong (a process restart resets the bucket) is acceptable for a
// chapter-scale deployment.

const RATE_LIMIT_BUCKETS = new Map<string, { count: number; resetAt: number }>();

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 3;

export function checkIncidentRateLimit(ipKey: string, now = Date.now()):
  | { ok: true }
  | { ok: false; retryAfterMs: number } {
  const k = ipKey || "unknown";
  const bucket = RATE_LIMIT_BUCKETS.get(k);
  if (!bucket || bucket.resetAt < now) {
    RATE_LIMIT_BUCKETS.set(k, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= RATE_MAX) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Test-only — reset the rate-limit bucket. */
export function _resetIncidentRateLimit() {
  RATE_LIMIT_BUCKETS.clear();
}
