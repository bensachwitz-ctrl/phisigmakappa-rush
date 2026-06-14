import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mocks so they run before the module imports
const mocks = vi.hoisted(() => {
  return {
    mockEventCreate: vi.fn(),
    mockSiteConfigFindMany: vi.fn(),
    mockSendEmail: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      event: {
        create: mocks.mockEventCreate,
      },
      siteConfig: {
        findMany: mocks.mockSiteConfigFindMany,
      },
    },
    getSubdomain: (host: string | null) => host?.split(".")[0] || null,
  };
});

vi.mock("@/lib/email", () => {
  return {
    sendEmail: mocks.mockSendEmail,
  };
});

// Import route handler after mocking
import { POST } from "@/app/api/schedule/route";

describe("POST /api/schedule — Booking Scheduler API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when booking details are invalid or missing", async () => {
    const req = new Request("https://greekstack.vercel.app/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        email: "not-an-email",
        eventType: "Rush Coffee Chat",
        date: "2026-06-15T10:00:00Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid booking details");
  });

  it("returns 400 when date is invalid", async () => {
    const req = new Request("https://greekstack.vercel.app/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex Mercer",
        email: "alex@sc.edu",
        eventType: "Rush Coffee Chat",
        date: "invalid-date-string",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid date format");
  });

  it("creates a database event and triggers confirmation emails on success", async () => {
    mocks.mockSiteConfigFindMany.mockResolvedValue([
      { key: "chapter.fraternityShort", value: "Phi Sig" },
      { key: "chapter.schoolShort", value: "USC" },
      { key: "chapter.fraternityName", value: "Phi Sigma Kappa" },
      { key: "contact.rushEmail", value: "rush@phisigusc.com" },
    ]);

    const mockEvent = {
      id: "event-123",
      name: "Rush Coffee Chat: Alex Mercer",
      startsAt: new Date("2026-06-15T13:00:00.000Z"),
      endsAt: new Date("2026-06-15T13:30:00.000Z"),
      location: "Chapter House",
    };
    mocks.mockEventCreate.mockResolvedValue(mockEvent);

    const req = new Request("https://greekstack.vercel.app/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex Mercer",
        email: "alex@sc.edu",
        eventType: "Rush Coffee Chat",
        date: "2026-06-15T13:00:00.000Z",
        notes: "Keen to learn about recruitment",
        location: "Chapter House",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.event.id).toBe("event-123");

    // DB verification
    expect(mocks.mockEventCreate).toHaveBeenCalledTimes(1);
    const createArgs = mocks.mockEventCreate.mock.calls[0][0];
    expect(createArgs.data.name).toBe("Rush Coffee Chat: Alex Mercer");
    expect(createArgs.data.category).toBe("RUSH");
    expect(createArgs.data.audience).toBe("ALL");
    expect(createArgs.data.isPrivate).toBe(false);

    // Email verification: one to PNM, one to Chapter Rush Chair
    expect(mocks.mockSendEmail).toHaveBeenCalledTimes(2);
    
    const firstMail = mocks.mockSendEmail.mock.calls[0][0];
    expect(firstMail.to).toBe("alex@sc.edu");
    expect(firstMail.subject).toContain("Confirmed: Rush Coffee Chat");

    const secondMail = mocks.mockSendEmail.mock.calls[1][0];
    expect(secondMail.to).toBe("rush@phisigusc.com");
    expect(secondMail.subject).toContain("[Booking Alert] Rush Coffee Chat");
  });

  it("handles database / server failures gracefully and returns 500", async () => {
    mocks.mockSiteConfigFindMany.mockResolvedValue([]);
    mocks.mockEventCreate.mockRejectedValue(new Error("Database offline"));

    const req = new Request("https://greekstack.vercel.app/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex Mercer",
        email: "alex@sc.edu",
        eventType: "Rush Coffee Chat",
        date: "2026-06-15T13:00:00.000Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("complete your booking");
  });
});
