// lib/enrichment/consent.ts — disclosure + consent + opt-out for #44 enrichment.
//
// GUARDRAIL: enrichment may run ONLY after a disclosure is shown and consent is
// captured, and must stop (and support deletion) the moment a candidate opts out.
// This PURE module owns the verbatim disclosure text, its version, the consent /
// opt-out record shapes, and canEnrich() — the single gate every enrichment
// entrypoint calls before touching the network. Storing the disclosure text +
// version on the consent record (snapshot, not a pointer) means the chapter can
// always prove exactly what a candidate agreed to, even after the copy changes.
//
// This is NOT a background/credit check. The disclosure says so explicitly so the
// chapter never treats enrichment as an FCRA "consumer report" for an adverse
// recruitment decision.
//
// PURE module — no I/O.

/** Bump when the disclosure copy materially changes → existing consents become
 *  `stale` and the UI re-prompts before the next lookup. ISO date. */
export const ENRICHMENT_DISCLOSURE_VERSION = "2026-07-11";

/** The verbatim disclosure shown at consent time and snapshotted onto the record. */
export const ENRICHMENT_DISCLOSURE_TEXT =
  "To help us get to know you, our recruitment team may review publicly available " +
  "information about you (for example, public social media, a school directory, or " +
  "public athletics results). We only look at public or consented sources. We do NOT " +
  "collect or store information about your race, ethnicity, national origin, religion, " +
  "health or disability, or sexual orientation or gender identity, and any such details " +
  "we happen to encounter are automatically removed. This is NOT a background check or " +
  "credit check and is never used as the basis for an adverse decision. Every lookup is " +
  "logged. You can decline, opt out at any time, and ask us to delete everything we have " +
  "gathered about you.";

export type ConsentMethod = "rush-form" | "admin-attested";

/** A captured consent — the candidate agreed (via the rush form) OR the chapter
 *  attested a lawful basis / on-file consent (admin-attested). */
export interface EnrichmentConsent {
  version: string; // disclosure version agreed to
  disclosureText: string; // verbatim snapshot at consent time
  agreedAt: string; // ISO
  method: ConsentMethod;
  capturedBy?: string; // officer name/"admin" for admin-attested
}

/** A withdrawal of consent. Once present, enrichment is blocked and the stored
 *  result should be deleted. */
export interface EnrichmentOptOut {
  at: string; // ISO
  by?: string; // who recorded it (officer/"candidate")
}

export interface EnrichmentConsentState {
  consent?: EnrichmentConsent | null;
  optOut?: EnrichmentOptOut | null;
}

/** Build a consent record, snapshotting the current disclosure text + version. */
export function makeEnrichmentConsent(opts: {
  method: ConsentMethod;
  capturedBy?: string;
  agreedAt?: string;
}): EnrichmentConsent {
  return {
    version: ENRICHMENT_DISCLOSURE_VERSION,
    disclosureText: ENRICHMENT_DISCLOSURE_TEXT,
    agreedAt: opts.agreedAt ?? new Date().toISOString(),
    method: opts.method,
    ...(opts.capturedBy !== undefined ? { capturedBy: opts.capturedBy } : {}),
  };
}

/** Build an opt-out record. */
export function makeEnrichmentOptOut(opts?: { by?: string; at?: string }): EnrichmentOptOut {
  return {
    at: opts?.at ?? new Date().toISOString(),
    ...(opts?.by !== undefined ? { by: opts.by } : {}),
  };
}

export type EnrichGateReason = "opted-out" | "no-consent";

export interface EnrichGate {
  ok: boolean;
  /** Why enrichment is blocked (only when ok=false). */
  reason?: EnrichGateReason;
  /** True when consent exists but predates the current disclosure version — the
   *  UI should re-prompt, but historical results stay valid. Only meaningful when
   *  ok=true. */
  stale?: boolean;
}

/**
 * The single enrichment gate. Blocks when the candidate has opted out, or when no
 * consent is on file. Allows when consent is present and not withdrawn, flagging
 * `stale` if the consent predates the current disclosure version.
 */
export function canEnrich(state: EnrichmentConsentState | null | undefined): EnrichGate {
  if (state?.optOut) return { ok: false, reason: "opted-out" };
  if (!state?.consent) return { ok: false, reason: "no-consent" };
  return { ok: true, stale: state.consent.version !== ENRICHMENT_DISCLOSURE_VERSION };
}

/** Friendly, PII-free explanation of a blocked gate for UI + audit. */
export function explainGate(gate: EnrichGate): string {
  if (gate.ok) return gate.stale ? "Consent on file (disclosure updated — re-confirm recommended)." : "Consent on file.";
  switch (gate.reason) {
    case "opted-out":
      return "This candidate has opted out of enrichment. Delete any gathered data.";
    case "no-consent":
      return "No enrichment consent on file. Capture the disclosure + consent first.";
    default:
      return "Enrichment is not permitted for this candidate.";
  }
}
