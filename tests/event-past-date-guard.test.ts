import { describe, it, expect, vi, beforeEach } from "vitest";

// Backlog #6 — NEW-event past-date guard (app/api/admin/events POST).
// Creating an event whose start time is already in the past must be rejected with
// a clear server-side 400 (a fat-fingered year / AM-PM shouldn't silently publish
// a "past" event onto the brother calendar). EDITING an existing event is NOT
// gated — an admin must stay free to fix details on an event that already
// happened. This suite pins both halves.

const mocks = vi.hoisted(() => ({
  isAdminAuthed: vi.fn(() => true),
  isAdminRole: vi.fn(() => true),
  guardBillingWrite: vi.fn(async () => null),
  guardOfficerOrAdmin: vi.fn(async () => null),
  guardOfficer: vi.fn(async () => null),
  audit: vi.fn(async () => {}),
  pushEventToCalDiy: vi.fn(async () => null),
  eventCreate: vi.fn(async (args: any) => ({
    id: "ev_new",
    name: args?.data?.name ?? "Event",
    category: args?.data?.category ?? "OTHER",
    isPrivate: !!args?.data?.isPrivate,
    startsAt: args?.data?.startsAt ?? new Date(),
  })),
  eventUpdate: vi.fn(async (args: any) => ({
    id: args?.where?.id ?? "ev_edit",
    name: args?.data?.name ?? "Event",
    category: args?.data?.category ?? "OTHER",
    isPrivate: !!args?.data?.isPrivate,
    startsAt: args?.data?.startsAt ?? new Date(),
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      create: mocks.eventCreate,
      update: mocks.eventUpdate,
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      delete: vi.fn(async () => ({})),
    },
  },
}));
vi.mock("@/lib/auth", () => ({
  isAdminAuthed: mocks.isAdminAuthed,
  isAdminRole: mocks.isAdminRole,
}));
vi.mock("@/lib/permissions", () => ({
  guardOfficerOrAdmin: mocks.guardOfficerOrAdmin,
  guardOfficer: mocks.guardOfficer,
}));
vi.mock("@/lib/billing-guard", () => ({ guardBillingWrite: mocks.guardBillingWrite }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/events", () => ({ pushEventToCalDiy: mocks.pushEventToCalDiy }));

import { POST } from "@/app/api/admin/events/route";

function req(body: unknown) {
  return new Request("https://alpha.greekstack.vercel.app/api/admin/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const HOUR = 60 * 60 * 1000;
const base = { name: "Founders Banquet", category: "SOCIAL", isPrivate: false };

describe("event creation past-date guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("REJECTS a NEW event whose start time is in the past (400) and never writes", async () => {
    const startsAt = new Date(Date.now() - 48 * HOUR).toISOString();
    const res = await POST(req({ ...base, startsAt }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/in the past/i);
    // Critically: no event row is created.
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("ALLOWS a NEW event whose start time is in the future (201/200 + create)", async () => {
    const startsAt = new Date(Date.now() + 48 * HOUR).toISOString();
    const res = await POST(req({ ...base, startsAt }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
  });

  it("does NOT block EDITING an existing (past) event — only NEW creation is gated", async () => {
    // An id in the payload = edit mode. Even a past startsAt must be accepted so
    // an admin can correct details on an event that already happened.
    const startsAt = new Date(Date.now() - 72 * HOUR).toISOString();
    const res = await POST(req({ ...base, startsAt, id: "ev_existing" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mocks.eventUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("rejects a NEW event with an unparseable start time (400)", async () => {
    const res = await POST(req({ ...base, startsAt: "not-a-date" }));
    expect(res.status).toBe(400);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });
});
