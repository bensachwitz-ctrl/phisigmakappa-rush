import { describe, it, expect, vi, beforeEach } from "vitest";

// Rich-text events (Task-2 wiring) — the admin events route stores the (Tiptap)
// description through sanitizeRichText() and downgrades it to plain text when it
// fans the new event out to SMS/email/push, exactly like announcements. This
// pins BOTH halves against a direct POST (the sanitizer + the downgrade run for
// every client, not just the web editor). Uses the REAL lib/rich-text (only the
// I/O deps are mocked).

const mocks = vi.hoisted(() => ({
  isAdminAuthed: vi.fn(() => true),
  guardOfficer: vi.fn(async () => null),
  guardOfficerOrAdmin: vi.fn(async () => null),
  audit: vi.fn(async () => {}),
  pushEventToCalDiy: vi.fn(async () => null),
  listPortalRecipients: vi.fn(async () => [{ id: "r1", role: "brother" }]),
  routeEventToRecipients: vi.fn(async (_payload: { body: string }, _recipients: unknown) => {}),
  eventCreate: vi.fn(async (args: any) => ({
    id: "ev_new",
    name: args?.data?.name ?? "Event",
    category: args?.data?.category ?? "OTHER",
    isPrivate: !!args?.data?.isPrivate,
    startsAt: args?.data?.startsAt ?? new Date(),
    // echo the stored (already sanitized) description so the notify path sees it
    description: args?.data?.description ?? null,
    location: args?.data?.location ?? null,
  })),
  eventUpdate: vi.fn(async (args: any) => ({
    id: args?.where?.id ?? "ev_edit",
    name: args?.data?.name ?? "Event",
    category: args?.data?.category ?? "OTHER",
    isPrivate: !!args?.data?.isPrivate,
    startsAt: args?.data?.startsAt ?? new Date(),
    description: args?.data?.description ?? null,
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
vi.mock("@/lib/auth", () => ({ isAdminAuthed: mocks.isAdminAuthed }));
vi.mock("@/lib/permissions", () => ({
  guardOfficer: mocks.guardOfficer,
  guardOfficerOrAdmin: mocks.guardOfficerOrAdmin,
}));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/events", () => ({ pushEventToCalDiy: mocks.pushEventToCalDiy }));
vi.mock("@/lib/notify/prefs", () => ({
  listPortalRecipients: mocks.listPortalRecipients,
  routeEventToRecipients: mocks.routeEventToRecipients,
}));

import { POST } from "@/app/api/admin/events/route";

function req(body: unknown) {
  return new Request("https://alpha.greekstack.vercel.app/api/admin/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + 48 * HOUR).toISOString();
const RICH = '<p>Wear <strong>letters</strong>.</p><script>alert(document.cookie)</script>';

describe("admin events route — rich-text description", () => {
  beforeEach(() => vi.clearAllMocks());

  it("SANITIZES the description on CREATE (strips <script>, keeps safe formatting)", async () => {
    const res = await POST(req({ name: "Founders", category: "SOCIAL", startsAt: future(), description: RICH }));
    expect(res.status).toBe(200);
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    const stored = mocks.eventCreate.mock.calls[0][0].data.description as string;
    expect(stored).toContain("<strong>letters</strong>");
    expect(stored).not.toMatch(/script|alert/i);
  });

  it("DOWNGRADES the description to plain text for the notification fan-out", async () => {
    await POST(req({ name: "Founders", category: "SOCIAL", startsAt: future(), description: RICH }));
    expect(mocks.routeEventToRecipients).toHaveBeenCalledTimes(1);
    const payload = mocks.routeEventToRecipients.mock.calls[0][0] as { body: string };
    // Plain text only — no markup leaks into an SMS/email/push body.
    expect(payload.body).toContain("Wear letters");
    expect(payload.body).not.toMatch(/[<>]/);
    expect(payload.body).not.toMatch(/script|alert/i);
  });

  it("SANITIZES the description on EDIT (id present -> update branch)", async () => {
    const res = await POST(req({ id: "ev_existing", name: "Founders", category: "SOCIAL", startsAt: future(), description: RICH }));
    expect(res.status).toBe(200);
    expect(mocks.eventUpdate).toHaveBeenCalledTimes(1);
    const stored = mocks.eventUpdate.mock.calls[0][0].data.description as string;
    expect(stored).toContain("<strong>letters</strong>");
    expect(stored).not.toMatch(/script|alert/i);
  });

  it("stores null for an empty description (no stray markup)", async () => {
    await POST(req({ name: "Founders", category: "SOCIAL", startsAt: future(), description: "" }));
    expect(mocks.eventCreate.mock.calls[0][0].data.description).toBeNull();
  });
});
