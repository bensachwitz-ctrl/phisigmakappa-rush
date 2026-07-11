// lib/enrichment/protected-class.ts — the #44 compliance firewall.
//
// MANDATORY GUARDRAIL: rush-candidate (PNM) enrichment must NOT infer or store
// protected-class data (race / ethnicity / national origin, religion, disability
// or health, sexual orientation or gender identity). Even though #44 only pulls
// PUBLIC/consented sources, a public snippet ("president of the Muslim Student
// Association", "openly gay activist", "recovering from cancer") can carry a
// protected-class signal. This module is a PURE, testable redactor that runs on
// EVERY enrichment result before it is persisted or shown to the Recruitment
// Chair: it strips the signal and reports (by CATEGORY + COUNT only — never the
// matched PII) what was removed, so the audit trail can record "3 protected-class
// signals redacted" without itself storing the sensitive text.
//
// Design tradeoff: the term lists are intentionally conservative-but-decisive —
// unambiguous identity indicators, not every word that could hint at a category
// (bare "black"/"white"/"asian" are excluded to avoid shredding legitimate text).
// Over-redaction is preferred to under-redaction where a term IS unambiguous.
//
// PURE module — no I/O.

export type ProtectedCategory =
  | "race_ethnicity"
  | "religion"
  | "disability_health"
  | "sexual_orientation_gender_identity";

export const PROTECTED_CATEGORY_LABELS: Record<ProtectedCategory, string> = {
  race_ethnicity: "Race / ethnicity / national origin",
  religion: "Religion",
  disability_health: "Disability / health",
  sexual_orientation_gender_identity: "Sexual orientation / gender identity",
};

// Unambiguous identity indicators per category. Multi-word terms match across a
// space OR hyphen ("african american" / "african-american"). All matching is
// case-insensitive and word-boundary anchored (see compile()).
const TERMS: Record<ProtectedCategory, string[]> = {
  race_ethnicity: [
    "african american", "afro-caribbean", "hispanic", "latino", "latina", "latinx",
    "caucasian", "native american", "indigenous", "biracial", "multiracial",
    "person of color", "people of color", "ethnicity", "mixed race",
  ],
  religion: [
    "christian", "christianity", "catholic", "protestant", "baptist", "methodist",
    "lutheran", "presbyterian", "evangelical", "jewish", "judaism", "muslim",
    "islam", "islamic", "hindu", "hinduism", "buddhist", "buddhism", "sikh",
    "atheist", "agnostic", "mormon", "latter-day saints", "quran", "koran",
    "torah", "hillel", "young life", "campus crusade", "fellowship of christian",
  ],
  disability_health: [
    "disabled", "disability", "wheelchair", "adhd", "autism", "autistic",
    "depression", "bipolar", "schizophrenia", "diabetes", "diabetic", "epilepsy",
    "cancer", "leukemia", "hiv", "aids", "mental health", "mental illness",
    "diagnosis", "diagnosed with", "chronic illness", "eating disorder",
    "in recovery", "rehab", "medication for",
  ],
  sexual_orientation_gender_identity: [
    "lgbtq", "lgbt", "gay", "lesbian", "bisexual", "transgender", "queer",
    "homosexual", "non-binary", "nonbinary", "pansexual", "asexual",
    "gender identity", "sexual orientation", "coming out", "openly gay",
  ],
};

/** Escape a term for use inside a RegExp source. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Compile a term into a word-boundary, space-or-hyphen-tolerant, global,
 *  case-insensitive RegExp. */
function compile(term: string): RegExp {
  const parts = term.trim().split(/\s+/).map(escapeRe);
  const body = parts.join("[\\s-]+");
  return new RegExp(`\\b${body}\\b`, "gi");
}

// Precompile once (module load) — { category, term, re }.
const COMPILED: { category: ProtectedCategory; term: string; re: RegExp }[] = (
  Object.entries(TERMS) as [ProtectedCategory, string[]][]
).flatMap(([category, terms]) => terms.map((term) => ({ category, term, re: compile(term) })));

/** A single redaction hit — the category and the canonical term (NOT the raw
 *  surrounding text), safe to log/audit. */
export interface ProtectedHit {
  category: ProtectedCategory;
  term: string;
}

/** The replacement token left where a protected-class signal was removed. */
export const REDACTION_TOKEN = "[redacted]";

/**
 * Scan text for protected-class indicators WITHOUT modifying it. Returns one hit
 * per matched (category, term). Safe on empty/undefined.
 */
export function scanProtectedClass(text: string | null | undefined): ProtectedHit[] {
  if (!text) return [];
  const hits: ProtectedHit[] = [];
  for (const { category, term, re } of COMPILED) {
    re.lastIndex = 0;
    if (re.test(text)) hits.push({ category, term });
  }
  return hits;
}

/**
 * Redact protected-class indicators from text, replacing each with
 * REDACTION_TOKEN. Returns the cleaned text plus the hits removed. Idempotent —
 * running it again finds nothing (the token contains no indicators).
 */
export function redactProtectedClass(text: string | null | undefined): {
  clean: string;
  hits: ProtectedHit[];
} {
  if (!text) return { clean: text ?? "", hits: [] };
  let clean = text;
  const hits: ProtectedHit[] = [];
  for (const { category, term, re } of COMPILED) {
    re.lastIndex = 0;
    if (re.test(clean)) {
      hits.push({ category, term });
      re.lastIndex = 0;
      clean = clean.replace(re, REDACTION_TOKEN);
    }
  }
  return { clean, hits };
}

/** Aggregate hits into { category → count } for a compact, PII-free audit line. */
export function summarizeHits(hits: ProtectedHit[]): Partial<Record<ProtectedCategory, number>> {
  const out: Partial<Record<ProtectedCategory, number>> = {};
  for (const h of hits) out[h.category] = (out[h.category] ?? 0) + 1;
  return out;
}

/** Human one-liner for an audit detail, e.g. "Religion x2, Disability / health x1".
 *  Empty string when nothing was redacted. */
export function describeHits(hits: ProtectedHit[]): string {
  const summary = summarizeHits(hits);
  return (Object.keys(summary) as ProtectedCategory[])
    .map((c) => `${PROTECTED_CATEGORY_LABELS[c]} x${summary[c]}`)
    .join(", ");
}

// ── Shape-aware redaction for enrichment results ────────────────────────────────

/** The redactable subset of an enrichment payload. Matches lib/enrich.ts's
 *  Enrichment shape (summary / bullets / links) without importing it. */
export interface RedactableEnrichment {
  summary?: string;
  bullets?: string[];
  links?: { label: string; url: string }[];
}

/**
 * Redact an entire enrichment result: summary, every bullet, and every link
 * LABEL (URLs are left intact — they are the public address, not inferred
 * content — but a label like "Openly gay activist — Daily Gamecock" is scrubbed).
 * Returns the redacted copy plus aggregated hits.
 */
export function redactEnrichment<T extends RedactableEnrichment>(
  enrichment: T,
): { clean: T; hits: ProtectedHit[] } {
  const hits: ProtectedHit[] = [];
  const clean: T = { ...enrichment };

  if (typeof enrichment.summary === "string") {
    const r = redactProtectedClass(enrichment.summary);
    clean.summary = r.clean;
    hits.push(...r.hits);
  }
  if (Array.isArray(enrichment.bullets)) {
    clean.bullets = enrichment.bullets.map((b) => {
      const r = redactProtectedClass(b);
      hits.push(...r.hits);
      return r.clean;
    });
  }
  if (Array.isArray(enrichment.links)) {
    clean.links = enrichment.links.map((l) => {
      const r = redactProtectedClass(l.label);
      hits.push(...r.hits);
      return { ...l, label: r.clean };
    });
  }
  return { clean, hits };
}
