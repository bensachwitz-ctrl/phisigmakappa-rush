import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// lib/chapter-live-guard — the SHARED go-live decision for public chapter routes.
//
// The shipped bug: only app/page.tsx ("/") enforced the isActive / pending-billing
// gate, so /schedule, /alumni, /alumni/[id], /parents, /bid/[token], and
// /check-in/[code] kept serving a chapter that was operator-suspended OR still
// pending-billing (not yet published). These pin the pure gate DECISION
// (chapterLiveState — the JSX rendering that maps a state to a page lives in
// components/site/chapter-status.tsx) AND that every listed public page wires the
// gate in.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getSubdomain: vi.fn(),
  getRegistrySubdomain: vi.fn(),
  isTenantActive: vi.fn(),
  siteConfigFindUnique: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: () => "phi-sig.greekstack.vercel.app" }),
}));

vi.mock("@/lib/prisma", () => ({
  getSubdomain: mocks.getSubdomain,
  getRegistrySubdomain: mocks.getRegistrySubdomain,
  isTenantActive: mocks.isTenantActive,
  getTenantClient: () => ({ siteConfig: { findUnique: mocks.siteConfigFindUnique } }),
}));

import { chapterLiveState } from "@/lib/chapter-live-guard";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSubdomain.mockReturnValue("phi_sig");
  mocks.getRegistrySubdomain.mockReturnValue("phi-sig");
});

describe("chapterLiveState", () => {
  it("is 'live' for an active chapter, without reading the pending flag", async () => {
    mocks.isTenantActive.mockResolvedValue(true);
    expect(await chapterLiveState()).toBe("live");
    expect(mocks.siteConfigFindUnique).not.toHaveBeenCalled();
  });

  it("is 'pending-billing' for an inactive chapter whose pending flag is 'true'", async () => {
    mocks.isTenantActive.mockResolvedValue(false);
    mocks.siteConfigFindUnique.mockResolvedValue({ value: "true" });
    expect(await chapterLiveState()).toBe("pending-billing");
  });

  it("is 'suspended' for an inactive chapter with no pending flag (operator hard-suspend)", async () => {
    mocks.isTenantActive.mockResolvedValue(false);
    mocks.siteConfigFindUnique.mockResolvedValue({ value: "false" });
    expect(await chapterLiveState()).toBe("suspended");
  });

  it("uses the hyphen-preserving registry key for the isActive lookup", async () => {
    mocks.isTenantActive.mockResolvedValue(true);
    await chapterLiveState();
    expect(mocks.isTenantActive).toHaveBeenCalledWith("phi-sig");
  });

  it("is 'apex' when there is no chapter subdomain (page handles its own apex case)", async () => {
    mocks.getSubdomain.mockReturnValue(null);
    expect(await chapterLiveState()).toBe("apex");
    expect(mocks.isTenantActive).not.toHaveBeenCalled();
  });

  it("falls back to 'suspended' (neutral) when the pending lookup throws", async () => {
    mocks.isTenantActive.mockResolvedValue(false);
    mocks.siteConfigFindUnique.mockRejectedValue(new Error("db down"));
    expect(await chapterLiveState()).toBe("suspended");
  });
});

describe("every public chapter page wires the shared gate", () => {
  // Source-level pin: a public chapter surface that forgets the gate (or a new one
  // added later without it) is the exact regression that shipped. Assert each
  // listed page calls chapterLiveGate() at render time.
  const PAGES = [
    "app/schedule/page.tsx",
    "app/alumni/page.tsx",
    "app/alumni/[id]/page.tsx",
    "app/parents/page.tsx",
    "app/bid/[token]/page.tsx",
    "app/check-in/[code]/page.tsx",
    // Newly closed gaps: the public alumni-signup landing and the alum invite
    // redemption shell (a server wrapper around the "use client" onboarding form)
    // must also gate, so a suspended / pending-billing chapter never leaks its
    // identity or alumni surface through them.
    "app/alumni/join/page.tsx",
    "app/alumni/onboard/[token]/page.tsx",
    // Iteration-2 sweep: every remaining PUBLIC, unauthenticated surface that
    // itself reads chapter config/identity (getSiteConfig / chapterIdentityFromCfg
    // / getChapterIdentity) and renders it — the public rush PNM portal, the
    // member-invite redemption page, the portal sign-in hub, both pre-auth portal
    // login pages (each renders the "{School} · {Chapter}" lockup), and the TENANT
    // branch of the dual apex/tenant privacy policy. Each must gate so a suspended
    // / pending-billing chapter never leaks its identity (tab title, meta, ΦΣ
    // branding, sign-in CTAs) through them.
    "app/portal/pnm/page.tsx",
    "app/onboard/[token]/page.tsx",
    "app/portal/page.tsx",
    "app/portal/alumni/page.tsx",
    "app/portal/brothers/page.tsx",
    "app/privacy/page.tsx",
  ];

  it.each(PAGES)("%s imports and calls chapterLiveGate", (rel) => {
    const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    expect(src.includes("chapter-status"), `${rel} must import the shared gate`).toBe(true);
    expect(/chapterLiveGate\s*\(/.test(src), `${rel} must call chapterLiveGate()`).toBe(true);
  });
});
