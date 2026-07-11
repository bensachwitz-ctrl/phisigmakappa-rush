import { describe, it, expect, vi, beforeEach } from "vitest";

// Rich-text member bios (Task-2 wiring) — the brother self-edit profile route
// stores the (Tiptap) bio through sanitizeRichText() and collapses an empty rich
// doc ("<p></p>") to null, mirroring the announcements/events pattern. Uses the
// REAL lib/rich-text (only the auth + prisma I/O are mocked).

const mocks = vi.hoisted(() => ({
  getCurrentBrother: vi.fn(async () => ({ id: "b1", email: "marcus@usc.edu" })),
  brotherUpdate: vi.fn(async (args: any) => ({ id: "b1", ...args?.data })),
  brotherFindFirst: vi.fn(async () => null),
  portalFindFirst: vi.fn(async () => null),
  portalUpdateMany: vi.fn(async () => ({ count: 0 })),
}));

vi.mock("@/lib/auth", () => ({ getCurrentBrother: mocks.getCurrentBrother }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    brother: { update: mocks.brotherUpdate, findFirst: mocks.brotherFindFirst },
    portalUser: { findFirst: mocks.portalFindFirst, updateMany: mocks.portalUpdateMany },
  },
}));

import { PATCH } from "@/app/api/portal/brothers/profile/route";

function req(body: unknown) {
  return new Request("https://alpha.greekstack.vercel.app/api/portal/brothers/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("brother self-edit profile — rich-text bio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("SANITIZES the bio (strips <script>, keeps safe formatting)", async () => {
    const dirty = '<p>President. <em>Ask me anything</em>.</p><script>steal()</script>';
    const res = await PATCH(req({ bio: dirty }));
    expect(res.status).toBe(200);
    const stored = mocks.brotherUpdate.mock.calls[0][0].data.bio as string;
    expect(stored).toContain("<em>Ask me anything</em>");
    expect(stored).not.toMatch(/script|steal/i);
  });

  it("collapses an EMPTY rich doc to null (Tiptap emits <p></p>)", async () => {
    const res = await PATCH(req({ bio: "<p></p>" }));
    expect(res.status).toBe(200);
    expect(mocks.brotherUpdate.mock.calls[0][0].data.bio).toBeNull();
  });

  it("keeps a plain-text bio (sanitizer is a no-op on safe plain text)", async () => {
    const res = await PATCH(req({ bio: "Just a plain bio." }));
    expect(res.status).toBe(200);
    expect(mocks.brotherUpdate.mock.calls[0][0].data.bio).toBe("Just a plain bio.");
  });
});
