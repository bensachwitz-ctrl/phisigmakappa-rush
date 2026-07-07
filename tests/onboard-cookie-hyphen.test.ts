import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Onboard post-signup cookie ↔ verifier canonical-form match (hyphenated subs).
//
// REGRESSION: onboard signed the admin cookie with the HYPHEN-preserving
// subdomain (normalizeSubdomain → "sig-ep"), but every verifier derives the
// tenant tag via getSubdomain(host), which collapses the hyphen to "_"
// ("sig_ep"). HMAC keyed on "gs-tenant:sig-ep" ≠ "gs-tenant:sig_ep", so the
// just-minted cookie was REJECTED on the chapter host and the new admin bounced
// to /admin/login. The fix binds the onboard tenant tag to the SAME underscore
// form the verifiers use: subdomain.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase().
// ---------------------------------------------------------------------------

let currentHost: string | null = null;
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name.toLowerCase() === "host" ? currentHost : null),
  }),
  cookies: () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));

// lib/auth imports { prisma, getSubdomain } from "@/lib/prisma", whose module
// eval constructs a real PrismaClient (fails to load the query engine on this
// Windows box). This test only exercises the pure HMAC mint/verify path, so mock
// the module: forward the REAL getSubdomain (from the dependency-free tenant-host
// source the verifiers already use) and stub prisma. Keeps the test off the
// Prisma engine entirely.
vi.mock("@/lib/prisma", async () => {
  const host = await import("@/lib/tenant-host");
  return { prisma: {}, getSubdomain: host.getSubdomain };
});

const TEST_SECRET = "test-secret-32-chars-................";

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  vi.stubEnv("NODE_ENV", "test");
  currentHost = null;
});

// Mirrors the onboard route: the tag the cookie is bound to.
const canonicalTag = (sub: string) => sub.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

describe("onboard cookie for a hyphenated chapter verifies on its own host", () => {
  it("GREEN: cookie signed with the canonical (underscore) tag verifies via verifyEdgeSession", async () => {
    const { createSessionToken } = await import("@/lib/auth");
    const { verifyEdgeSession } = await import("@/lib/auth-edge");

    const rawSubdomain = "sig-ep"; // normalizeSubdomain preserves the hyphen
    const tenantTag = canonicalTag(rawSubdomain); // "sig_ep" — the fixed form
    const token = createSessionToken("brother_1", true, tenantTag);

    const ok = await verifyEdgeSession(token, "sig-ep.greekstack.vercel.app");
    expect(ok).toBe(true);
  });

  it("RED: cookie signed with the OLD hyphen form is rejected on the chapter host", async () => {
    const { createSessionToken } = await import("@/lib/auth");
    const { verifyEdgeSession } = await import("@/lib/auth-edge");

    // The pre-fix behaviour: sign with the hyphen-preserving subdomain directly.
    const token = createSessionToken("brother_1", true, "sig-ep");

    const ok = await verifyEdgeSession(token, "sig-ep.greekstack.vercel.app");
    expect(ok).toBe(false);
  });

  it("non-hyphenated subdomains were unaffected (both forms coincide)", async () => {
    const { createSessionToken } = await import("@/lib/auth");
    const { verifyEdgeSession } = await import("@/lib/auth-edge");

    const token = createSessionToken("brother_1", true, canonicalTag("phisig"));
    expect(await verifyEdgeSession(token, "phisig.greekstack.vercel.app")).toBe(true);
  });
});
