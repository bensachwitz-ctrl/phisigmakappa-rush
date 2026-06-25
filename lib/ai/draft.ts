// lib/ai/draft.ts — free-first AI draft model router for the chapter-officer
// "Draft with AI" composer helper.
//
// PURPOSE
//   Pick the BEST FREE model for each chapter-comms draft task (announcement /
//   rush message / email / event blurb) across a FREE-ONLY provider pool, with
//   an ordered failover chain. Greek Stack has no AI of its own; this helper is
//   strictly opt-in and inert unless a free provider key is configured.
//
// DESIGN — PURE + TESTABLE + GATE-SAFE  (ported from DailyTool api/_lib/aiRouter.js)
//   • pickDraftModel(taskType, opts) is a PURE function: same inputs -> same
//     output, no I/O, no env reads, no Date.now. The CALLER passes which provider
//     keys are configured (nvidia / openrouter) via `opts`, so this module never
//     touches process.env and can NEVER leak a key — it only emits model +
//     provider + apiUrl identifiers. Unit-testable in the node vitest env.
//   • FREE-ONLY: the pool is NVIDIA NIM's free catalog (primary) + OpenRouter
//     ":free" slugs (fallback). No paid model is ever returned, so Auto can
//     never silently bill.
//   • HONEST DEGRADATION: when NO free provider key is configured, pickDraftModel
//     returns { configured: false, provider: null, ... } so the caller (route +
//     UI) short-circuits to an honest "AI not configured" state — no dead
//     control, no fabricated success.
//   • FAILOVER: returns an ordered `fallbacks` list. The caller walks
//     primary -> fallbacks on 402 / 403 / 429 / 5xx / network error, then an
//     honest error. Never fabricate a success when the upstream failed.
//
// This module is provider-config DATA + selection LOGIC only. The actual HTTP
// request lives in app/api/ai/draft/route.ts, which speaks the OpenAI-compatible
// chat/completions format both NVIDIA NIM and OpenRouter expose.

// ─── FREE PROVIDER POOL ─────────────────────────────────────────────────────
// provider keys:
//   'nvidia'     -> integrate.api.nvidia.com/v1  (key env: NVIDIA_NIM_API_KEY)
//   'openrouter' -> openrouter.ai/api/v1         (key env: OPENROUTER_API_KEY)
export type ProviderId = "nvidia" | "openrouter";

export interface ProviderConfig {
  id: ProviderId;
  /** OpenAI-compatible chat/completions endpoint. */
  apiUrl: string;
  /** Env var the CALLER reads for this provider's key — documented here so the
   *  route and tests agree on one source. Never read inside this module. */
  keyEnv: string;
  label: string;
}

export const FREE_PROVIDERS: Record<ProviderId, ProviderConfig> = {
  nvidia: {
    id: "nvidia",
    apiUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    keyEnv: "NVIDIA_NIM_API_KEY",
    label: "NVIDIA NIM (free)",
  },
  openrouter: {
    id: "openrouter",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    label: "OpenRouter (free)",
  },
};

// Canonical free model slugs. NVIDIA NIM models are NIM free-catalog slugs;
// OpenRouter models carry the ":free" suffix. Named constants so the task map
// and tests reference one source of truth.
export const FREE_MODELS = {
  // NVIDIA NIM free catalog
  nvLlama33: "meta/llama-3.3-70b-instruct", // fast general / writing
  nvQwenNext80b: "qwen/qwen3-next-80b-a3b-instruct", // fast general
  nvMistralMedium: "mistralai/mistral-medium-3.5-128b", // general / prose
  nvNemotronSuper: "nvidia/nemotron-3-super-120b-a12b", // reasoning / longer copy
  // OpenRouter :free chain (last-resort free tier)
  orLlama33: "meta-llama/llama-3.3-70b-instruct:free",
  orQwen72: "qwen/qwen-2.5-72b-instruct:free",
  orHermes405: "nousresearch/hermes-3-llama-3.1-405b:free",
} as const;

// ─── TASK TYPES ─────────────────────────────────────────────────────────────
// The chapter-comms draft families a chapter officer can request.
export const DRAFT_TASKS = {
  ANNOUNCEMENT: "announcement", // chapter-wide announcement post
  RUSH_MESSAGE: "rush-message", // outreach / message to a potential new member
  EMAIL: "email", // longer-form email to members / alumni / parents
  EVENT_BLURB: "event-blurb", // short promo blurb for an event
} as const;

export type DraftTask = (typeof DRAFT_TASKS)[keyof typeof DRAFT_TASKS];

const VALID_TASKS = new Set<string>(Object.values(DRAFT_TASKS));

/** Normalize any task string to a canonical DraftTask. Unknown/empty -> announcement
 *  (the safe general default). */
export function normalizeDraftTask(task: unknown): DraftTask {
  if (typeof task === "string" && VALID_TASKS.has(task)) return task as DraftTask;
  return DRAFT_TASKS.ANNOUNCEMENT;
}

// ─── TASK -> ORDERED FREE-MODEL PREFERENCE ──────────────────────────────────
// For each task, the best free models in preference order. Each entry is a
// [providerId, model] pair. NVIDIA NIM is preferred first (free + fast); the
// chain always ends on the OpenRouter :free tier when OpenRouter is configured.
const TASK_PREFERENCE: Record<DraftTask, ReadonlyArray<readonly [ProviderId, string]>> = {
  [DRAFT_TASKS.ANNOUNCEMENT]: [
    ["nvidia", FREE_MODELS.nvLlama33],
    ["nvidia", FREE_MODELS.nvQwenNext80b],
    ["openrouter", FREE_MODELS.orLlama33],
    ["openrouter", FREE_MODELS.orQwen72],
  ],
  [DRAFT_TASKS.RUSH_MESSAGE]: [
    ["nvidia", FREE_MODELS.nvMistralMedium],
    ["nvidia", FREE_MODELS.nvLlama33],
    ["openrouter", FREE_MODELS.orLlama33],
    ["openrouter", FREE_MODELS.orHermes405],
  ],
  [DRAFT_TASKS.EMAIL]: [
    ["nvidia", FREE_MODELS.nvNemotronSuper],
    ["nvidia", FREE_MODELS.nvMistralMedium],
    ["openrouter", FREE_MODELS.orHermes405],
    ["openrouter", FREE_MODELS.orQwen72],
  ],
  [DRAFT_TASKS.EVENT_BLURB]: [
    ["nvidia", FREE_MODELS.nvLlama33],
    ["nvidia", FREE_MODELS.nvQwenNext80b],
    ["openrouter", FREE_MODELS.orLlama33],
    ["openrouter", FREE_MODELS.orQwen72],
  ],
};

export interface DraftCandidate {
  provider: ProviderId;
  model: string;
  apiUrl: string;
}

export interface DraftPick {
  provider: ProviderId | null;
  model: string | null;
  apiUrl: string | null;
  /** Ordered fallbacks (the rest of the configured chain, after the primary). */
  fallbacks: DraftCandidate[];
  /** false when NO free provider key is configured. Callers MUST short-circuit. */
  configured: boolean;
  task: DraftTask;
}

export interface DraftPickOpts {
  /** NVIDIA_NIM_API_KEY is configured (caller-supplied — never read here). */
  nvidia?: boolean;
  /** OPENROUTER_API_KEY is configured. */
  openrouter?: boolean;
}

/**
 * pickDraftModel — PURE selection of the best free model + ordered failover chain.
 *
 * configured=false → no free provider key present. The caller (route + UI) MUST
 * short-circuit to the honest "ai-not-configured" path. When configured=true,
 * walk `model`/`apiUrl` first, then `fallbacks` in order, on any
 * 402/403/429/5xx/network error.
 */
export function pickDraftModel(taskType: unknown, opts: DraftPickOpts = {}): DraftPick {
  const task = normalizeDraftTask(taskType);
  const haveNvidia = !!opts.nvidia;
  const haveOpenrouter = !!opts.openrouter;

  const providerConfigured = (id: ProviderId): boolean =>
    (id === "nvidia" && haveNvidia) || (id === "openrouter" && haveOpenrouter);

  const candidates: DraftCandidate[] = TASK_PREFERENCE[task]
    .filter(([providerId]) => providerConfigured(providerId))
    .map(([providerId, model]) => ({
      provider: providerId,
      model,
      apiUrl: FREE_PROVIDERS[providerId].apiUrl,
    }));

  if (candidates.length === 0) {
    // No free provider configured. Honest not-configured result.
    return { provider: null, model: null, apiUrl: null, fallbacks: [], configured: false, task };
  }

  const [primary, ...fallbacks] = candidates;
  return {
    provider: primary.provider,
    model: primary.model,
    apiUrl: primary.apiUrl,
    fallbacks,
    configured: true,
    task,
  };
}

/**
 * draftRouteOrder — convenience: the full ordered list (primary first, then
 * fallbacks) as flat candidates. Empty when not configured. Callers walk this
 * top-to-bottom, advancing on a failover-worthy upstream status.
 */
export function draftRouteOrder(taskType: unknown, opts: DraftPickOpts = {}): DraftCandidate[] {
  const r = pickDraftModel(taskType, opts);
  if (!r.configured || !r.provider || !r.model || !r.apiUrl) return [];
  return [{ provider: r.provider, model: r.model, apiUrl: r.apiUrl }, ...r.fallbacks];
}

/** HTTP statuses that should advance to the next fallback in the chain
 *  (rate-limit / auth-to-this-model / upstream 5xx). Exposed for the route +
 *  tests so the failover policy has a single definition. */
export function isFailoverStatus(status: number): boolean {
  return status === 402 || status === 403 || status === 429 || status >= 500;
}
