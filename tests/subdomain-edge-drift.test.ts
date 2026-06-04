import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSubdomain } from "@/lib/prisma";
import { verifyEdgeSession } from "@/lib/auth-edge";
import { SUBDOMAIN_CASES } from "./subdomain-cases";

// ---------------------------------------------------------------------------
// DRIFT INVARIANT: getSubdomainEdge (lib/auth-edge.ts) MUST return identical
// results to getSubdomain (lib/prisma.ts) for every host. They are a documented
// mirror — if they diverge, a session minted under one tenant tag would verify
// (or fail) under a different tag in middleware vs. server code, opening a
// cross-tenant hole. getSubdomainEdge is not exported, so we assert the mirror
// FUNCTIONALLY:
//
//   1. Mint a session token bound to tenant = getSubdomain(host) ?? "_apex"
//      using lib/auth's per-tenant HMAC key.
//   2. verifyEdgeSession(token, host) re-derives the tenant via
//      getSubdomainEdge(host) ?? "_apex" and checks the SAME per-tenant HMAC.
//   3. It accepts the token IFF getSubdomainEdge(host) === getSubdomain(host).
//
// Node's crypto (HMAC) and WebCrypto (crypto.subtle, used by the edge module)
// produce identical HMAC-SHA256 hex, so a match end-to-end proves equal tags.
// ---------------------------------------------------------------------------

// Reuse the same next/headers-free path: createSessionToken takes tenantOverride
// explicitly, so no header mock is needed for the minting side here.
let mintHost: string | null = null;
vi.mock("next/headers", () => ({
  headers: () => ({ get: (n: string) => (n.toLowerCase() === "host" ? mintHost : null) }),
  cookies: () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));

const TEST_SECRET = "test-secret-32-chars-................";

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL_ENV", "");
});

describe("getSubdomainEdge mirrors getSubdomain (functional drift check)", () => {
  it.each(SUBDOMAIN_CASES)(
    "host=$host ($note): edge-derived tenant tag matches",
    async ({ host }) => {
      const { createSessionToken } = await import("@/lib/auth");
      const tenant = getSubdomain(host) ?? "_apex";
      // Mint a token whose signature is bound to the prisma-side tenant tag.
      const token = createSessionToken("brother_1", false, tenant);
      // verifyEdgeSession recomputes the tag via getSubdomainEdge(host). If the
      // edge function agrees, the HMAC matches and this is true; if it drifted,
      // the derived tag differs, the HMAC mismatches, and this is false.
      const ok = await verifyEdgeSession(token, host);
      expect(ok).toBe(true);
    },
  );

  it("a token bound to the WRONG tenant tag is rejected by the edge verifier", async () => {
    // Negative control: proves the functional bridge actually depends on the tag
    // (i.e. the positive assertions above aren't vacuously passing).
    const { createSessionToken } = await import("@/lib/auth");
    const host = "phisig.greekstack.vercel.app"; // getSubdomain → "phisig"
    const wrongToken = createSessionToken("brother_1", false, "someoneelse");
    expect(await verifyEdgeSession(wrongToken, host)).toBe(false);
  });

  it("edge verifier rejects a 3-part (legacy) token regardless of host", async () => {
    expect(await verifyEdgeSession("brother_1.0.1700000000000", "phisig.greekstack.vercel.app")).toBe(false);
  });

  it("edge verifier rejects an undefined token", async () => {
    expect(await verifyEdgeSession(undefined, "phisig.greekstack.vercel.app")).toBe(false);
  });
});
