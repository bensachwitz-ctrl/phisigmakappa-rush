import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";

// Re-implements lib/auth.ts's signing (HMAC-SHA256) so a test can mint a token
// with a VALID signature over an arbitrary (e.g. ancient) timestamp. This lets
// the expiry test isolate the age check from the signature check.
function signTokenForTenant(
  brotherId: string,
  isAdmin: boolean,
  ts: number,
  tenant: string,
  rootSecret: string,
): string {
  const tenantKey = crypto
    .createHmac("sha256", rootSecret)
    .update(`gs-tenant:${tenant}`)
    .digest("hex");
  const payload = `${brotherId}.${isAdmin ? "1" : "0"}.${ts}`;
  const sig = crypto.createHmac("sha256", tenantKey).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

// ---------------------------------------------------------------------------
// lib/auth.ts session token — the cross-tenant binding invariant.
//
// A session token is minted with a PER-TENANT signing key
// (HMAC(rootSecret, "gs-tenant:<tenant>")). The verifier (parseSessionToken)
// re-derives the key from the CURRENT request's tenant (via next/headers host
// → getSubdomain). So a token minted for chapter "alpha" must verify ONLY when
// the request resolves to "alpha", and must be REJECTED on "beta". This is the
// P0 cross-tenant session-takeover guard, tested end-to-end below.
//
// Mechanism: we mock next/headers so the "current host" is a mutable knob each
// test sets, which lets us flip currentTenant() between alpha and beta.
// ---------------------------------------------------------------------------

// Mutable host the mocked headers() reports. Set per-test via setHost().
let currentHost: string | null = "alpha.greekstack.vercel.app";
function setHost(h: string | null) {
  currentHost = h;
}

vi.mock("next/headers", () => {
  return {
    headers: () => ({
      get: (name: string) => (name.toLowerCase() === "host" ? currentHost : null),
    }),
    // auth.ts imports cookies too (used by setBrotherCookie / isAdminAuthed),
    // which we don't exercise here — provide a minimal inert stub so the import
    // resolves under the node test environment.
    cookies: () => ({
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
    }),
  };
});

// A real 32-char secret so production-style HMAC derivation runs identically.
const TEST_SECRET = "test-secret-32-chars-................";

// Import AFTER vi.mock + after stubbing the env so module-load sees them.
beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  vi.stubEnv("NODE_ENV", "test");
  setHost("alpha.greekstack.vercel.app");
});

async function loadAuth() {
  // Fresh import each time isn't required (functions read env/host at call time),
  // but keep a single dynamic import so the mock is active before evaluation.
  return await import("@/lib/auth");
}

describe("createSessionToken / parseSessionToken round-trip", () => {
  it("round-trips a valid token on the same tenant", async () => {
    const { createSessionToken, parseSessionToken } = await loadAuth();
    const token = createSessionToken("brother_1", false, "alpha");
    setHost("alpha.greekstack.vercel.app");
    const parsed = parseSessionToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed!.brotherId).toBe("brother_1");
    expect(parsed!.isAdmin).toBe(false);
    expect(parsed!.valid).toBe(true);
  });

  it("preserves the admin flag through the round-trip", async () => {
    const { createSessionToken, parseSessionToken } = await loadAuth();
    const token = createSessionToken("boss_1", true, "alpha");
    setHost("alpha.greekstack.vercel.app");
    const parsed = parseSessionToken(token);
    expect(parsed!.valid).toBe(true);
    expect(parsed!.isAdmin).toBe(true);
  });

  it("mints a 4-part token (brotherId.adminFlag.ts.sig)", async () => {
    const { createSessionToken } = await loadAuth();
    const token = createSessionToken("brother_1", false, "alpha");
    expect(token.split(".")).toHaveLength(4);
  });
});

describe("cross-tenant binding (the P0 guard)", () => {
  it("a token minted for 'alpha' is REJECTED when the request resolves to 'beta'", async () => {
    const { createSessionToken, parseSessionToken } = await loadAuth();
    const token = createSessionToken("brother_1", true, "alpha");

    // Same request, now arriving on chapter beta's host.
    setHost("beta.greekstack.vercel.app");
    const parsed = parseSessionToken(token);
    // Token still parses structurally, but the signature is bound to alpha's key.
    expect(parsed).not.toBeNull();
    expect(parsed!.valid).toBe(false);
  });

  it("the SAME token is valid on alpha and invalid on beta (symmetry)", async () => {
    const { createSessionToken, parseSessionToken } = await loadAuth();
    const token = createSessionToken("brother_1", false, "alpha");

    setHost("alpha.greekstack.vercel.app");
    expect(parseSessionToken(token)!.valid).toBe(true);

    setHost("beta.greekstack.vercel.app");
    expect(parseSessionToken(token)!.valid).toBe(false);
  });

  it("an apex-minted token (no override) verifies on the apex but not on a tenant", async () => {
    const { createSessionToken, parseSessionToken } = await loadAuth();
    // No tenantOverride + apex host → bound to the "_apex" key.
    setHost(null);
    const token = createSessionToken("brother_1", false);

    setHost(null);
    expect(parseSessionToken(token)!.valid).toBe(true);

    setHost("alpha.greekstack.vercel.app");
    expect(parseSessionToken(token)!.valid).toBe(false);
  });
});

describe("token rejection cases", () => {
  it("returns null for an undefined token", async () => {
    const { parseSessionToken } = await loadAuth();
    expect(parseSessionToken(undefined)).toBeNull();
  });

  it("returns null for a legacy 3-part token", async () => {
    const { parseSessionToken } = await loadAuth();
    // Legacy globally-signed 3-part tokens are intentionally invalid now.
    expect(parseSessionToken("brother_1.0.1700000000000")).toBeNull();
  });

  it("returns null for a token with empty required parts", async () => {
    const { parseSessionToken } = await loadAuth();
    // 4 parts but empty brotherId / ts / sig.
    expect(parseSessionToken("..." + "")).toBeNull();
    expect(parseSessionToken("brother_1.0..deadbeef")).toBeNull();
  });

  it("marks a token with a tampered signature invalid", async () => {
    const { createSessionToken, parseSessionToken } = await loadAuth();
    const token = createSessionToken("brother_1", false, "alpha");
    const parts = token.split(".");
    // Flip the signature to a different (still hex, same-length) value.
    const sig = parts[3];
    const tampered =
      parts.slice(0, 3).join(".") +
      "." +
      sig.replace(/./, (c) => (c === "a" ? "b" : "a"));
    setHost("alpha.greekstack.vercel.app");
    const parsed = parseSessionToken(tampered);
    expect(parsed).not.toBeNull();
    expect(parsed!.valid).toBe(false);
  });

  it("marks an expired token invalid (valid signature, ancient ts)", async () => {
    const { parseSessionToken } = await loadAuth();
    setHost("alpha.greekstack.vercel.app");
    // Properly-signed token for alpha whose ts is 13h old (> 12h MAX_AGE). The
    // signature is VALID, so only the age check can reject it — isolating expiry.
    const ancientTs = Date.now() - 13 * 60 * 60 * 1000;
    const token = signTokenForTenant("brother_1", false, ancientTs, "alpha", TEST_SECRET);
    const parsed = parseSessionToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed!.valid).toBe(false);
  });

  it("a freshly-signed token (valid sig, current ts) IS valid — sanity for the expiry test", async () => {
    const { parseSessionToken } = await loadAuth();
    setHost("alpha.greekstack.vercel.app");
    // Same hand-signing path, but a current ts → both sig and age pass. Confirms
    // the expiry test above fails for AGE, not because hand-signing is broken.
    const token = signTokenForTenant("brother_1", false, Date.now(), "alpha", TEST_SECRET);
    expect(parseSessionToken(token)!.valid).toBe(true);
  });
});
