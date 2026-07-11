// lib/enrichment/provenance.ts — where every enrichment fact came from.
//
// Mirrors the Swamp Fox provenance pattern (lib/dataModel/provenance.ts): every
// enrichment result carries a stamp saying which provider produced it, an opaque
// reference into that provider, how it was captured, WHEN (`fetchedAt`), by whom,
// and a confidence. This is what lets a Recruitment Chair — or a later audit —
// answer "where did this note about the PNM come from, and how fresh is it?".
//
// COMPLIANCE NOTE: provenance is a transparency control. Because #44 enrichment
// only ever pulls PUBLIC / consented sources, the stamp names the public source
// explicitly so a PNM exercising their right to see/delete what we hold can be
// shown exactly what was looked up and where.
//
// PURE module — types + a stamping helper. No I/O.

/** The public/consented sources an enrichment fact may originate from.
 *  Extensible — add a source here as providers land. All are FREE/PUBLIC. */
export type EnrichmentSource =
  | "public-links" // generated research links (no network call, no scraping)
  | "web-search" // env-gated public web search (e.g. Tavily free tier)
  | "manual" // a note keyed by an officer in the dashboard
  | "system" // computed/derived by GreekStack itself
  | "unknown";

/** A provenance stamp attached to an enrichment result (and, optionally, to an
 *  individual fact). */
export interface EnrichmentProvenance {
  /** Originating public source. */
  source: EnrichmentSource;
  /** Human label for the provider, e.g. "Public research links". */
  providerLabel?: string;
  /** Opaque reference into the source (search query, result count, …). Never
   *  store anything sensitive here — it is surfaced in the transparency view. */
  sourceRef?: string;
  /** How the value was obtained (e.g. "links", "web-search", "manual-edit"). */
  method?: string;
  /** ISO timestamp the fact was fetched/last refreshed from the source. */
  fetchedAt: string;
  /** Actor (officer name/email/"admin") responsible, when known. */
  fetchedBy?: string;
  /** 0..1 confidence the source ascribes. Public links are low-confidence
   *  (0.2 — "here's where to look"); a direct answer is higher. Absent = n/a. */
  confidence?: number;
  /** Free-text note for anything the structured fields don't capture. */
  note?: string;
}

/** Stamp a provenance record, defaulting fetchedAt to now. */
export function makeEnrichmentProvenance(
  source: EnrichmentSource,
  opts?: Omit<Partial<EnrichmentProvenance>, "source">,
): EnrichmentProvenance {
  return {
    source,
    fetchedAt: opts?.fetchedAt ?? new Date().toISOString(),
    ...(opts?.providerLabel !== undefined ? { providerLabel: opts.providerLabel } : {}),
    ...(opts?.sourceRef !== undefined ? { sourceRef: opts.sourceRef } : {}),
    ...(opts?.method !== undefined ? { method: opts.method } : {}),
    ...(opts?.fetchedBy !== undefined ? { fetchedBy: opts.fetchedBy } : {}),
    ...(opts?.confidence !== undefined ? { confidence: clampConfidence(opts.confidence) } : {}),
    ...(opts?.note !== undefined ? { note: opts.note } : {}),
  };
}

function clampConfidence(c: number): number {
  if (!Number.isFinite(c)) return 0;
  return Math.min(1, Math.max(0, c));
}

/** Precedence rank — higher wins when two sources describe the same PNM. A human
 *  officer note outranks an automated search hit, which outranks bare links. */
export function enrichmentSourceRank(source: EnrichmentSource): number {
  switch (source) {
    case "manual":
      return 100;
    case "web-search":
      return 60;
    case "public-links":
      return 30;
    case "system":
      return 20;
    default:
      return 0;
  }
}
