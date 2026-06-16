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

  // ── SECURITY MEDIUM: forces neutral public category, ignores client intent ──
  it("FORCES a neutral PUBLIC category — a client cannot mint a private EBOARD event", async () => {
    mocks.mockSiteConfigFindMany.mockResolvedValue([]);
    mocks.mockEventCreate.mockResolvedValue({ id: "event-x", name: "x", startsAt: new Date(), endsAt: new Date() });

    const req = new Request("https://greekstack.vercel.app/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
      // A malicious eventType that the OLD code mapped to a PRIVATE, EBOARD event.
      body: JSON.stringify({
        name: "Sneaky Bot",
        email: "bot@x.com",
        eventType: "eboard secret meeting",
        date: "2026-06-15T13:00:00.000Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const createArgs = mocks.mockEventCreate.mock.calls[0][0];
    // Server forced neutral/public regardless of the client-supplied eventType.
    expect(createArgs.data.category).toBe("OTHER");
    expect(createArgs.data.audience).toBe("ALL");
    expect(createArgs.data.isPrivate).toBe(false);
  });

  // ── SECURITY MEDIUM: per-IP rate-limit ──────────────────────────────────────
  it("THROTTLES a flood of bookings from one IP (429 after the limit)", async () => {
    mocks.mockSiteConfigFindMany.mockResolvedValue([]);
    mocks.mockEventCreate.mockResolvedValue({ id: "event-rl", name: "x", startsAt: new Date(), endsAt: new Date() });

    // A dedicated IP so this test's bucket is isolated from the others.
    const ip = "203.0.113.77";
    const makeReq = () =>
      new Request("https://greekstack.vercel.app/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          name: "Repeat Caller",
          email: "rc@sc.edu",
          eventType: "Rush Coffee Chat",
          date: "2026-06-15T13:00:00.000Z",
        }),
      });

    // The route allows 10 within the window; the 11th must be throttled.
    let throttled = false;
    let lastStatus = 0;
    for (let i = 0; i < 12; i++) {
      const res = await POST(makeReq());
      lastStatus = res.status;
      if (res.status === 429) {
        throttled = true;
        expect(res.headers.get("Retry-After")).toBeTruthy();
        break;
      }
    }
    expect(throttled).toBe(true);
    expect(lastStatus).toBe(429);
  });
});
