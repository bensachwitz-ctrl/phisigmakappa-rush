// lib/enrichment/store.ts — the Rush.enrichmentData JSON envelope.
//
// Rush.enrichmentData is an overloaded String? column: historically it held the
// flat enrichment result (summary/bullets/links/source/searchedAt) AND the bid
// e-sign waiver fields (bidWaiverUrl/signatureName/signedAt), written by
// different routes. #44 adds enrichment CONSENT + OPT-OUT + PROVENANCE +
// REDACTION metadata to the SAME column with NO schema change, so this module
// centralizes safe parse / merge / serialize:
//   • the flat result fields stay top-level (existing readers keep working),
//   • the bid-waiver fields are preserved untouched,
//   • the new metadata is namespaced under `_enrich*` keys so it can never
//     collide with a result field or the waiver, and the redaction firewall
//     (which only rewrites summary/bullets/links) never touches it.
//
// PURE module — no I/O.

import type { EnrichmentConsent, EnrichmentOptOut, EnrichmentConsentState } from "@/lib/enrichment/consent";
import type { EnrichmentProvenance } from "@/lib/enrichment/provenance";
import type { EnrichmentResult } from "@/lib/enrichment/provider";
import type { ProtectedCategory } from "@/lib/enrichment/protected-class";

export interface EnrichmentEnvelope {
  // ── flat result (back-compat with existing readers) ───────────────────────
  summary?: string;
  bullets?: string[];
  links?: { label: string; url: string }[];
  raw?: unknown;
  source?: string;
  searchedAt?: string;
  // ── bid e-sign waiver passthrough (written by /api/bid) ────────────────────
  bidWaiverUrl?: string;
  signatureName?: string;
  signedAt?: string;
  // ── #44 enrichment metadata (namespaced) ──────────────────────────────────
  _enrichConsent?: EnrichmentConsent | null;
  _enrichOptOut?: EnrichmentOptOut | null;
  _enrichProvenance?: EnrichmentProvenance | null;
  _enrichProviderId?: string;
  _enrichRedactions?: Partial<Record<ProtectedCategory, number>>;
  // tolerate unknown legacy keys on round-trip
  [k: string]: unknown;
}

/** Safe parse — returns {} for null / invalid / non-object JSON. */
export function parseEnvelope(json: string | null | undefined): EnrichmentEnvelope {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as EnrichmentEnvelope) : {};
  } catch {
    return {};
  }
}

export function serializeEnvelope(env: EnrichmentEnvelope): string {
  return JSON.stringify(env);
}

/** Extract just the consent/opt-out state for the canEnrich() gate. */
export function readConsentState(env: EnrichmentEnvelope): EnrichmentConsentState {
  return { consent: env._enrichConsent ?? null, optOut: env._enrichOptOut ?? null };
}

/** Record consent. Recording consent CLEARS any prior opt-out (an explicit
 *  re-consent). Preserves everything else. */
export function applyConsent(env: EnrichmentEnvelope, consent: EnrichmentConsent): EnrichmentEnvelope {
  return { ...env, _enrichConsent: consent, _enrichOptOut: null };
}

/**
 * Record an opt-out AND purge the gathered result (right-to-delete): strips the
 * flat result fields + provenance + redaction summary, keeps consent history +
 * the bid-waiver fields. `enrichedAt` on the row should be cleared by the caller.
 */
export function applyOptOut(env: EnrichmentEnvelope, optOut: EnrichmentOptOut): EnrichmentEnvelope {
  const next: EnrichmentEnvelope = { ...env };
  delete next.summary;
  delete next.bullets;
  delete next.links;
  delete next.raw;
  delete next.source;
  delete next.searchedAt;
  delete next._enrichProvenance;
  delete next._enrichProviderId;
  delete next._enrichRedactions;
  next._enrichOptOut = optOut;
  return next;
}

/**
 * Store a (already-redacted) enrichment result + its provenance / provider /
 * redaction summary, preserving consent + bid-waiver. Sets the flat back-compat
 * fields (source ← provenance.source, searchedAt ← provenance.fetchedAt).
 */
export function applyResult(
  env: EnrichmentEnvelope,
  result: EnrichmentResult,
  providerId: string,
  redactions: Partial<Record<ProtectedCategory, number>>,
): EnrichmentEnvelope {
  return {
    ...env,
    summary: result.summary,
    bullets: result.bullets,
    links: result.links,
    raw: result.raw,
    source: result.provenance.source,
    searchedAt: result.provenance.fetchedAt,
    _enrichProvenance: result.provenance,
    _enrichProviderId: providerId,
    _enrichRedactions: redactions,
  };
}
