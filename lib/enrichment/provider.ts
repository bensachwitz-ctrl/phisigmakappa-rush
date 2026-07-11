// lib/enrichment/provider.ts — PROVIDER-AGNOSTIC rushee (PNM) enrichment registry.
//
// Mirrors the Swamp Fox telematics provider pattern (lib/telematics/provider.ts):
// a shared RusheeEnrichmentProvider interface + a small registry so consumers
// iterate registered providers instead of hard-coding one vendor. Each provider
// is env-gated and INERT when unconfigured (isConfigured() → false, enrich() →
// null), never throws, and stamps its result with EnrichmentProvenance so the
// Recruitment Chair (and the audit trail) always know the source + fetchedAt.
//
// All providers use FREE / PUBLIC sources (#44). Today:
//   • public-links (always on, no network) — generates public research links.
//   • web-search  (env-gated on ENRICHMENT_SEARCH_API_KEY / TAVILY_API_KEY) —
//     a public web search restricted to public directory / social / athletics
//     domains.
//
// runEnrichment() is the orchestrator every entrypoint should call: it picks the
// highest-priority configured provider that answers, then applies the
// protected-class redaction firewall BEFORE returning, so no protected-class
// signal ever escapes a provider into storage or the UI.
//
// SERVER-ONLY — the web-search adapter reaches the network. Never import from a
// client component.

import { quickLinks } from "@/lib/enrich";
import {
  EnrichmentProvenance,
  EnrichmentSource,
  makeEnrichmentProvenance,
  enrichmentSourceRank,
} from "@/lib/enrichment/provenance";
import { redactEnrichment, ProtectedHit } from "@/lib/enrichment/protected-class";

export interface EnrichInput {
  name: string;
  hometown?: string | null;
  major?: string | null;
  year?: string | null;
  /** Chapter school scoping — pass cfg-derived values so a lookup is scoped to
   *  the right campus (never a hardcoded reference school). */
  schoolName?: string;
  schoolShort?: string;
  schoolUrl?: string;
  /** Actor recorded in provenance.fetchedBy. */
  fetchedBy?: string;
}

export interface EnrichmentResult {
  summary?: string;
  bullets?: string[];
  links?: { label: string; url: string }[];
  raw?: unknown;
  provenance: EnrichmentProvenance;
}

/** A pluggable, public-source rushee enrichment provider. */
export interface RusheeEnrichmentProvider {
  /** Stable machine id, e.g. "public-links" | "web-search". */
  id: string;
  /** Human label for status surfaces. */
  label: string;
  /** The provenance source this provider stamps. */
  source: EnrichmentSource;
  /** Higher runs first. Defaults to enrichmentSourceRank(source). */
  priority?: number;
  /** True only when this provider can run on this host (env-gated). */
  isConfigured(): boolean;
  /**
   * Produce an enrichment result, or null when unconfigured / the upstream call
   * failed (the "try the next provider" signal). Never throws.
   */
  enrich(input: EnrichInput): Promise<EnrichmentResult | null>;
}

// ── Registry ────────────────────────────────────────────────────────────────

const registry = new Map<string, RusheeEnrichmentProvider>();

export function registerEnrichmentProvider(p: RusheeEnrichmentProvider): void {
  registry.set(p.id, p);
}

export function listEnrichmentProviders(): RusheeEnrichmentProvider[] {
  return [...registry.values()];
}

function priorityOf(p: RusheeEnrichmentProvider): number {
  return p.priority ?? enrichmentSourceRank(p.source);
}

/** Configured providers, highest priority first. */
export function configuredEnrichmentProviders(): RusheeEnrichmentProvider[] {
  return listEnrichmentProviders()
    .filter((p) => {
      try {
        return p.isConfigured();
      } catch {
        return false;
      }
    })
    .sort((a, b) => priorityOf(b) - priorityOf(a));
}

export interface EnrichmentProviderStatus {
  id: string;
  label: string;
  source: EnrichmentSource;
  configured: boolean;
}

export function enrichmentProviderStatuses(): EnrichmentProviderStatus[] {
  return listEnrichmentProviders().map((p) => ({
    id: p.id,
    label: p.label,
    source: p.source,
    configured: (() => {
      try {
        return p.isConfigured();
      } catch {
        return false;
      }
    })(),
  }));
}

/**
 * Orchestrate a lookup: the first configured provider (by priority) that returns
 * a non-null result wins; its output is then run through the protected-class
 * redaction firewall before it leaves this function. Returns the (redacted)
 * result, the provider id, and the redaction hits (category + term, PII-free) so
 * the caller can audit "N protected-class signals removed". Returns null only if
 * no provider is configured (public-links is always configured, so in practice a
 * result is always produced).
 */
export async function runEnrichment(
  input: EnrichInput,
): Promise<{ result: EnrichmentResult; providerId: string; redactions: ProtectedHit[] } | null> {
  for (const p of configuredEnrichmentProviders()) {
    let raw: EnrichmentResult | null = null;
    try {
      raw = await p.enrich(input);
    } catch {
      raw = null;
    }
    if (raw !== null) {
      const { clean, hits } = redactEnrichment(raw);
      return { result: clean, providerId: p.id, redactions: hits };
    }
  }
  return null;
}

// ── Built-in providers (free / public) ──────────────────────────────────────

/** Always-on, no-network provider: surfaces public research links. This is the
 *  guaranteed fallback, so runEnrichment always yields something. */
export const publicLinksProvider: RusheeEnrichmentProvider = {
  id: "public-links",
  label: "Public research links",
  source: "public-links",
  isConfigured: () => true,
  async enrich(input) {
    const links = quickLinks(
      input.name,
      input.schoolName ?? "",
      input.schoolShort ?? "",
      input.schoolUrl ?? "",
    );
    return {
      summary:
        `Public research links for ${input.name}. GreekStack does not scrape or store ` +
        `profiles here — open a link to review public information yourself.`,
      links,
      provenance: makeEnrichmentProvenance("public-links", {
        providerLabel: "Public research links",
        method: "links",
        confidence: 0.2,
        fetchedBy: input.fetchedBy,
      }),
    };
  },
};

const SEARCH_DOMAINS = [
  "linkedin.com",
  "instagram.com",
  "facebook.com",
  "maxpreps.com",
  "athletic.net",
];

/** Env-gated public web search. Reads ENRICHMENT_SEARCH_API_KEY (falls back to
 *  the legacy TAVILY_API_KEY). Restricted to public directory/social/athletics
 *  domains + the chapter's own school host. Returns null when unconfigured or the
 *  upstream call fails, so runEnrichment falls through to public-links. */
export const webSearchProvider: RusheeEnrichmentProvider = {
  id: "web-search",
  label: "Public web search",
  source: "web-search",
  isConfigured: () =>
    Boolean(process.env.ENRICHMENT_SEARCH_API_KEY || process.env.TAVILY_API_KEY),
  async enrich(input) {
    const apiKey = process.env.ENRICHMENT_SEARCH_API_KEY || process.env.TAVILY_API_KEY;
    if (!apiKey) return null;
    const hints = [input.hometown, input.major, input.year].filter(Boolean).join(" ");
    const query = [input.name, input.schoolName, hints].filter(Boolean).join(" ").trim();
    const schoolHost = (input.schoolUrl ?? "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split("/")[0];
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          include_answer: true,
          max_results: 8,
          include_domains: [...SEARCH_DOMAINS, ...(schoolHost ? [schoolHost] : [])],
        }),
      });
      if (!res.ok) return null;
      const tav = await res.json();
      const bullets: string[] = (tav.results || []).slice(0, 6).map((r: any) => {
        const host = (() => {
          try {
            return new URL(r.url).hostname.replace("www.", "");
          } catch {
            return r.url;
          }
        })();
        return `[${host}] ${r.title}${r.content ? ` - ${String(r.content).slice(0, 220)}` : ""}`;
      });
      return {
        summary: tav.answer || undefined,
        bullets,
        links: (tav.results || [])
          .slice(0, 8)
          .map((r: any) => ({ label: (r.title || r.url || "").slice(0, 80), url: r.url })),
        raw: { query: tav.query, count: (tav.results || []).length },
        provenance: makeEnrichmentProvenance("web-search", {
          providerLabel: "Public web search",
          method: "web-search",
          sourceRef: query.slice(0, 120),
          confidence: 0.5,
          fetchedBy: input.fetchedBy,
        }),
      };
    } catch {
      return null;
    }
  },
};

// Register built-ins once on import. web-search has higher priority (rank 60) so
// it runs before public-links (rank 30) when configured.
registerEnrichmentProvider(webSearchProvider);
registerEnrichmentProvider(publicLinksProvider);
