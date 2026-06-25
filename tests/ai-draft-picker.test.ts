import { describe, it, expect } from "vitest";
import {
  pickDraftModel,
  draftRouteOrder,
  normalizeDraftTask,
  isFailoverStatus,
  DRAFT_TASKS,
  FREE_PROVIDERS,
  FREE_MODELS,
} from "@/lib/ai/draft";

// ── lib/ai/draft.ts — PURE free-first model picker ────────────────────────────
// The picker is the gate-safe core of the AI drafter: it reads NO env, performs
// NO I/O, and the CALLER passes which provider keys are configured. These tests
// pin the three contract guarantees: honest not-configured, free-first ordering,
// and correct task bucketing — so a future edit can't silently regress them.

describe("pickDraftModel — honest not-configured", () => {
  it("returns configured:false with null provider when NO key is configured", () => {
    const r = pickDraftModel(DRAFT_TASKS.ANNOUNCEMENT, {});
    expect(r.configured).toBe(false);
    expect(r.provider).toBeNull();
    expect(r.model).toBeNull();
    expect(r.apiUrl).toBeNull();
    expect(r.fallbacks).toEqual([]);
  });

  it("defaults (no opts) are treated as no-key -> not configured", () => {
    expect(pickDraftModel(DRAFT_TASKS.EMAIL).configured).toBe(false);
  });

  it("draftRouteOrder is empty when not configured", () => {
    expect(draftRouteOrder(DRAFT_TASKS.RUSH_MESSAGE, {})).toEqual([]);
  });
});

describe("pickDraftModel — free-first ordering", () => {
  it("prefers NVIDIA NIM (free) as primary when both keys are configured", () => {
    const r = pickDraftModel(DRAFT_TASKS.ANNOUNCEMENT, { nvidia: true, openrouter: true });
    expect(r.configured).toBe(true);
    expect(r.provider).toBe("nvidia");
    expect(r.apiUrl).toBe(FREE_PROVIDERS.nvidia.apiUrl);
    // The chain ends on the OpenRouter :free tier when OpenRouter is configured.
    const order = draftRouteOrder(DRAFT_TASKS.ANNOUNCEMENT, { nvidia: true, openrouter: true });
    expect(order[0].provider).toBe("nvidia");
    expect(order[order.length - 1].provider).toBe("openrouter");
    // every fallback model is a known free slug
    const freeModels = new Set(Object.values(FREE_MODELS));
    for (const c of order) expect(freeModels.has(c.model as any)).toBe(true);
  });

  it("falls back to OpenRouter-only when only OpenRouter is configured", () => {
    const r = pickDraftModel(DRAFT_TASKS.ANNOUNCEMENT, { openrouter: true });
    expect(r.configured).toBe(true);
    expect(r.provider).toBe("openrouter");
    const order = draftRouteOrder(DRAFT_TASKS.ANNOUNCEMENT, { openrouter: true });
    expect(order.every((c) => c.provider === "openrouter")).toBe(true);
  });

  it("uses ONLY NVIDIA when only NVIDIA is configured", () => {
    const order = draftRouteOrder(DRAFT_TASKS.EMAIL, { nvidia: true });
    expect(order.length).toBeGreaterThan(0);
    expect(order.every((c) => c.provider === "nvidia")).toBe(true);
  });
});

describe("pickDraftModel — task bucketing", () => {
  const opts = { nvidia: true, openrouter: true };
  it("each task type resolves to a configured pick with a non-empty chain", () => {
    for (const task of Object.values(DRAFT_TASKS)) {
      const r = pickDraftModel(task, opts);
      expect(r.configured).toBe(true);
      expect(r.task).toBe(task);
      expect(typeof r.model).toBe("string");
      expect(draftRouteOrder(task, opts).length).toBeGreaterThan(0);
    }
  });

  it("rush-message and email buckets differ from the announcement bucket", () => {
    const ann = pickDraftModel(DRAFT_TASKS.ANNOUNCEMENT, opts).model;
    const rush = pickDraftModel(DRAFT_TASKS.RUSH_MESSAGE, opts).model;
    const email = pickDraftModel(DRAFT_TASKS.EMAIL, opts).model;
    // Different tasks intentionally lead with different free models.
    expect(rush).not.toBe(ann);
    expect(email).not.toBe(ann);
  });

  it("normalizeDraftTask maps unknown/empty to the announcement default", () => {
    expect(normalizeDraftTask("nonsense")).toBe(DRAFT_TASKS.ANNOUNCEMENT);
    expect(normalizeDraftTask(undefined)).toBe(DRAFT_TASKS.ANNOUNCEMENT);
    expect(normalizeDraftTask("")).toBe(DRAFT_TASKS.ANNOUNCEMENT);
    expect(normalizeDraftTask(DRAFT_TASKS.EVENT_BLURB)).toBe(DRAFT_TASKS.EVENT_BLURB);
  });
});

describe("isFailoverStatus — failover policy", () => {
  it("advances on 402/403/429/5xx, not on 2xx/4xx-other", () => {
    expect(isFailoverStatus(402)).toBe(true);
    expect(isFailoverStatus(403)).toBe(true);
    expect(isFailoverStatus(429)).toBe(true);
    expect(isFailoverStatus(500)).toBe(true);
    expect(isFailoverStatus(503)).toBe(true);
    expect(isFailoverStatus(200)).toBe(false);
    expect(isFailoverStatus(400)).toBe(false);
    expect(isFailoverStatus(404)).toBe(false);
  });
});
