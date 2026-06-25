import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── POST /api/ai/draft — authed, env-gated, never-leaks, honest-degradation ───
// Drives the REAL exported route with the auth + permission seam mocked per
// persona (mirroring tests/announcements-officer-floor.test.ts) and the upstream
// LLM call mocked via global.fetch. Pins:
//   • 401 when unauthenticated, 403 when non-officer / wrong tenant
//   • honest 503 { error: 'ai-not-configured' } when NO provider key is set
//   • the API key is sent to the upstream but NEVER appears in the route response
//   • success path returns { ok:true, draft } from the mocked upstream
//   • failover: a 429 on the primary advances to the next free candidate

let adminAuthed = false;
let guardDenied: Response | null = null;

vi.mock("@/lib/auth", () => ({
  isAdminAuthed: () => adminAuthed,
}));

vi.mock("@/lib/permissions", () => ({
  // Return a 403 NextResponse-like when denied, else null (allowed) — matching
  // the real guardOfficer contract used by the announcements route.
  guardOfficer: async () =>
    guardDenied ? guardDenied : null,
}));

const FAKE_KEY = "nvapi-SECRET-do-not-leak-123456";

async function loadRoute() {
  return await import("@/app/api/ai/draft/route");
}

function postRequest(body: unknown) {
  return new Request("https://alpha.greekstack.vercel.app/api/ai/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { type: "announcement", topic: "Chapter meeting moved to Tuesday" };

beforeEach(() => {
  adminAuthed = false;
  guardDenied = null;
  delete process.env.NVIDIA_NIM_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  vi.restoreAllMocks();
  vi.resetModules();
});

afterEach(() => {
  delete process.env.NVIDIA_NIM_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
});

describe("POST /api/ai/draft — auth floor", () => {
  it("401 when not authenticated", async () => {
    adminAuthed = false;
    const { POST } = await loadRoute();
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("403 when authenticated but not an announcements-writer (wrong tenant/role)", async () => {
    adminAuthed = true;
    guardDenied = new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    const { POST } = await loadRoute();
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/ai/draft — honest not-configured", () => {
  it("503 ai-not-configured when NO provider key is set", async () => {
    adminAuthed = true; // passes auth + officer floor
    const { POST } = await loadRoute();
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("ai-not-configured");
  });

  it("400 on invalid input (missing topic)", async () => {
    adminAuthed = true;
    process.env.NVIDIA_NIM_API_KEY = FAKE_KEY;
    const { POST } = await loadRoute();
    const res = await POST(postRequest({ type: "announcement" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/ai/draft — success path (mocked upstream)", () => {
  it("returns { ok:true, draft } and NEVER leaks the API key", async () => {
    adminAuthed = true;
    process.env.NVIDIA_NIM_API_KEY = FAKE_KEY;

    const fetchMock = vi.fn(async (_url: string, _init?: any) =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "  Brothers, chapter is Tuesday 7pm.  " } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.draft).toBe("Brothers, chapter is Tuesday 7pm."); // trimmed

    // The key WAS sent to the upstream (Authorization header) ...
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as any;
    expect(init.headers.Authorization).toContain(FAKE_KEY);

    // ... but the key NEVER appears anywhere in the route's response body.
    const rawResponse = JSON.stringify(json);
    expect(rawResponse).not.toContain(FAKE_KEY);
  });

  it("never fabricates a draft: 502 when every upstream attempt fails", async () => {
    adminAuthed = true;
    process.env.NVIDIA_NIM_API_KEY = FAKE_KEY;
    process.env.OPENROUTER_API_KEY = FAKE_KEY;

    // Always a failover-worthy 429 -> walks the whole chain, then honest 502.
    const fetchMock = vi.fn(async () => new Response("rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
    // It actually walked more than one candidate before giving up.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("fails over from a 429 primary to a 200 fallback and returns that draft", async () => {
    adminAuthed = true;
    process.env.NVIDIA_NIM_API_KEY = FAKE_KEY;
    process.env.OPENROUTER_API_KEY = FAKE_KEY;

    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      if (call === 1) return new Response("rate limited", { status: 429 });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "Fallback draft body." } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft).toBe("Fallback draft body.");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GET /api/ai/draft — probe", () => {
  it("401 when unauthenticated", async () => {
    adminAuthed = false;
    const { GET } = await loadRoute();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("reports configured:false when no key, true when a key is set", async () => {
    adminAuthed = true;

    let mod = await loadRoute();
    let res = await mod.GET();
    expect(res.status).toBe(200);
    expect((await res.json()).configured).toBe(false);

    process.env.OPENROUTER_API_KEY = FAKE_KEY;
    vi.resetModules();
    mod = await loadRoute();
    res = await mod.GET();
    const json = await res.json();
    expect(json.configured).toBe(true);
    // probe never leaks the key
    expect(JSON.stringify(json)).not.toContain(FAKE_KEY);
  });
});
