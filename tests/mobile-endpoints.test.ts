import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";

// Declare mock functions using vi.hoisted so they are hoisted above vi.mock calls
const mocks = vi.hoisted(() => {
  return {
    mockTenantFindUnique: vi.fn(),
    mockPortalUserFindUnique: vi.fn(),
    mockPortalUserFindFirst: vi.fn(),
    mockPortalUserCreate: vi.fn(),
    mockPortalUserUpdate: vi.fn(),
    mockBrotherFindUnique: vi.fn(),
    mockBrotherFindFirst: vi.fn(),
    mockBrotherFindMany: vi.fn(),
    mockSiteConfigFindMany: vi.fn(),
    mockDuesPaymentFindMany: vi.fn(),
    mockAnnouncementFindMany: vi.fn(),
    mockEventFindMany: vi.fn(),
    mockAlumniProfileFindUnique: vi.fn(),
    mockAlumniProfileFindMany: vi.fn(),
    mockJobPostingFindMany: vi.fn(),
  };
});

// Mock the points-server to isolate API testing from standing logic
vi.mock("@/lib/points-server", () => {
  return {
    loadMemberStanding: async (brotherId: string) => {
      return {
        result: {
          score: 90.0,
          max: 100.0,
          pct: 90.0,
          standing: "Excellent",
          breakdown: [
            { name: "Meetings", points: 30, max: 30 },
            { name: "Service Hours", points: 30, max: 30 },
            { name: "Dues", points: 30, max: 40 },
          ],
        },
      };
    },
  };
});

// Mock the password helper for easy credential assertion
vi.mock("@/lib/password", () => {
  return {
    verifyPassword: (plain: string, hash: string | null | undefined) => {
      return plain === "correct_password" || hash === "mock_hash";
    },
  };
});

// Mock next/headers
vi.mock("next/headers", () => {
  return {
    headers: () => ({
      get: () => null,
    }),
    cookies: () => ({
      get: () => null,
    }),
  };
});

const mockTenantClient = {
  portalUser: {
    findUnique: mocks.mockPortalUserFindUnique,
    findFirst: mocks.mockPortalUserFindFirst,
    create: mocks.mockPortalUserCreate,
    update: mocks.mockPortalUserUpdate,
  },
  brother: {
    findUnique: mocks.mockBrotherFindUnique,
    findFirst: mocks.mockBrotherFindFirst,
    findMany: mocks.mockBrotherFindMany,
  },
  siteConfig: {
    findMany: mocks.mockSiteConfigFindMany,
  },
  duesPayment: {
    findMany: mocks.mockDuesPaymentFindMany,
  },
  announcement: {
    findMany: mocks.mockAnnouncementFindMany,
  },
  event: {
    findMany: mocks.mockEventFindMany,
  },
  alumniProfile: {
    findUnique: mocks.mockAlumniProfileFindUnique,
    findMany: mocks.mockAlumniProfileFindMany,
  },
  jobPosting: {
    findMany: mocks.mockJobPostingFindMany,
  },
};

vi.mock("@/lib/prisma", () => {
  return {
    centralDb: {
      tenant: {
        findUnique: mocks.mockTenantFindUnique,
      },
    },
    getTenantClient: () => mockTenantClient,
    getSubdomain: (host: string | null) => host?.split(".")[0] || null,
  };
});

// Now import the routes after the mocks have been set up
import { GET as getMobileData } from "@/app/api/mobile/data/route";
import { POST as authMobile } from "@/app/api/mobile/auth/route";

const TEST_SECRET = "test-portal-secret-32-chars-.........";

beforeEach(() => {
  vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
  vi.stubEnv("NODE_ENV", "test");
  vi.clearAllMocks();
});

describe("GET /api/mobile/data", () => {
  it("returns 400 when chapter subdomain is missing", async () => {
    const req = new Request("https://greekstack.vercel.app/api/mobile/data");
    const res = await getMobileData(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Chapter subdomain is required");
  });

  it("returns 404 when tenant chapter is not found in central registry", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue(null);

    const req = new Request("https://greekstack.vercel.app/api/mobile/data?subdomain=nonexistent");
    const res = await getMobileData(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Chapter not found");
  });

  it("returns 403 when chapter is suspended/inactive", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      subdomain: "usc-psk",
      isActive: false,
    });

    const req = new Request("https://greekstack.vercel.app/api/mobile/data?subdomain=usc-psk");
    const res = await getMobileData(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("chapter is inactive");
  });

  it("returns 401 when authorization token header is missing", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      subdomain: "usc-psk",
      isActive: true,
    });

    const req = new Request("https://greekstack.vercel.app/api/mobile/data?subdomain=usc-psk");
    const res = await getMobileData(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Authentication token is required");
  });

  it("returns 401 when token is invalid or signed for another tenant", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      subdomain: "usc-psk",
      isActive: true,
    });

    // Sign token for beta tenant, but present it to alpha (usc-psk)
    const crossToken = signPortalTokenForTenant("user-123", "brother", "beta-tenant");

    const req = new Request("https://greekstack.vercel.app/api/mobile/data?subdomain=usc-psk", {
      headers: {
        authorization: `Bearer ${crossToken}`,
      },
    });

    const res = await getMobileData(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Invalid or expired session");
  });

  it("returns 200 and aggregates full chapter dashboard for active member", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      subdomain: "usc-psk",
      name: "Beta Chapter",
      school: "UofSC",
      isActive: true,
    });

    const token = signPortalTokenForTenant("user-123", "brother", "usc-psk");

    mocks.mockPortalUserFindUnique.mockResolvedValue({
      id: "user-123",
      email: "brother@usc.edu",
      role: "brother",
      brotherId: "brother-789",
    });

    mocks.mockBrotherFindUnique.mockResolvedValue({
      id: "brother-789",
      name: "Marcus Aurelius",
      email: "brother@usc.edu",
      phone: "803-555-0100",
      year: "Senior",
      major: "Philosophy",
      position: "President",
      pledgeClass: "Fall 2023",
      hometown: "Rome, SC",
      gradYear: 2026,
      bio: "Active president.",
      headshotUrl: null,
      status: "ACTIVE",
      duesPaid: false,
    });

    mocks.mockSiteConfigFindMany.mockResolvedValue([
      { key: "dues.enabled", value: "true" },
      { key: "dues.amountCents", value: "50000" },
      { key: "dues.year", value: "2026" },
      { key: "dues.label", value: "Active Dues" },
      { key: "dues.stripePublishableKey", value: "pk_test" },
    ]);

    mocks.mockDuesPaymentFindMany.mockResolvedValue([
      {
        id: "pay-1",
        amountCents: 25000,
        year: "2026",
        status: "paid",
        method: "card",
        receiptUrl: "https://receipt",
        notes: "Installment",
        createdAt: new Date(),
      },
    ]);

    mocks.mockAnnouncementFindMany.mockResolvedValue([
      {
        id: "ann-1",
        title: "Ann-1 Title",
        body: "Ann-1 Body",
        pinned: true,
        createdAt: new Date(),
        author: { name: "Officer John", position: "Vice President" },
      },
    ]);

    mocks.mockEventFindMany.mockResolvedValue([
      {
        id: "evt-1",
        name: "Chapter Event",
        description: "Weekly chapter meeting",
        location: "Russell House",
        dressCode: "Formal",
        startsAt: new Date(Date.now() + 86400000), // tomorrow
        endsAt: new Date(Date.now() + 90000000),
        category: "MEETING",
        rsvps: [{ status: "GOING", note: null }],
      },
    ]);

    mocks.mockBrotherFindMany.mockResolvedValue([
      {
        id: "brother-789",
        name: "Marcus Aurelius",
        email: "brother@usc.edu",
        phone: "803-555-0100",
        year: "Senior",
        major: "Philosophy",
        position: "President",
        pledgeClass: "Fall 2023",
        headshotUrl: null,
        status: "ACTIVE",
      },
    ]);

    mocks.mockAlumniProfileFindMany.mockResolvedValue([
      {
        id: "alum-1",
        fullName: "Seneca Alum",
        preferredName: "Sen",
        graduationYear: 2018,
        pledgeClass: "Fall 2014",
        email: "seneca@alumni.com",
        phone: "843-555-0123",
        city: "Columbia",
        state: "SC",
        employer: "Stoic Corp",
        jobTitle: "Advisor",
        linkedinUrl: "https://linkedin",
        bio: "Mentorship lead.",
      },
    ]);

    mocks.mockJobPostingFindMany.mockResolvedValue([
      {
        id: "job-1",
        title: "Intern",
        company: "Stripe",
        location: "Remote",
        description: "Code Node",
        requirements: "Git",
        salary: "$40/hr",
        contactName: "Pat",
        contactEmail: "pat@stripe.com",
        contactPhone: null,
        postedByName: "Alum John",
        postedByRole: "Alumnus",
        createdAt: new Date(),
      },
    ]);

    const req = new Request("https://greekstack.vercel.app/api/mobile/data?subdomain=usc-psk", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const res = await getMobileData(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.chapter.name).toBe("Beta Chapter");
    expect(body.chapter.schoolName).toBe("UofSC");
    expect(body.role).toBe("brother");
    expect(body.profile.name).toBe("Marcus Aurelius");
    expect(body.standing.score).toBe(90.0);
    expect(body.dues.isPaid).toBe(false);
    expect(body.dues.payments).toHaveLength(1);
    expect(body.announcements).toHaveLength(1);
    expect(body.announcements[0].authorRole).toBe("Vice President");
    expect(body.events).toHaveLength(1);
    expect(body.events[0].myRsvp.status).toBe("GOING");
    expect(body.roster.actives).toHaveLength(1);
    expect(body.roster.alumni).toHaveLength(1);
    expect(body.careers).toHaveLength(1);
  });
});

describe("POST /api/mobile/auth", () => {
  it("returns 400 for missing request parameters", async () => {
    const req = new Request("https://greekstack.vercel.app/api/mobile/auth", {
      method: "POST",
      body: JSON.stringify({ email: "test@usc.edu" }),
    });

    const res = await authMobile(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("are required");
  });

  it("returns 404 when chapter subdomain doesn't exist", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue(null);

    const req = new Request("https://greekstack.vercel.app/api/mobile/auth", {
      method: "POST",
      body: JSON.stringify({
        subdomain: "nonexistent",
        email: "test@usc.edu",
        password: "correct_password",
        role: "brother",
      }),
    });

    const res = await authMobile(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Chapter subdomain not found");
  });

  it("returns 401 for incorrect password credentials", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      subdomain: "usc-psk",
      isActive: true,
    });

    mocks.mockPortalUserFindFirst.mockResolvedValue({
      id: "user-1",
      email: "test@usc.edu",
      passwordHash: "hash_here",
      role: "brother",
    });

    const req = new Request("https://greekstack.vercel.app/api/mobile/auth", {
      method: "POST",
      body: JSON.stringify({
        subdomain: "usc-psk",
        email: "test@usc.edu",
        password: "wrong_password",
        role: "brother",
      }),
    });

    const res = await authMobile(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Invalid email or password");
  });

  it("authenticates existing portal user with correct password", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      subdomain: "usc-psk",
      name: "Beta Chapter",
      school: "UofSC",
      isActive: true,
    });

    mocks.mockPortalUserFindFirst.mockResolvedValue({
      id: "user-1",
      email: "test@usc.edu",
      passwordHash: "mock_hash",
      role: "brother",
      brotherId: "brother-123",
    });

    const req = new Request("https://greekstack.vercel.app/api/mobile/auth", {
      method: "POST",
      body: JSON.stringify({
        subdomain: "usc-psk",
        email: "test@usc.edu",
        password: "correct_password",
        role: "brother",
      }),
    });

    const res = await authMobile(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe("test@usc.edu");
    expect(body.user.chapterName).toBe("Beta Chapter");
    expect(mocks.mockPortalUserUpdate).toHaveBeenCalled();
  });

  it("provisions a portal user on first-time login if matching Brother record exists", async () => {
    mocks.mockTenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      subdomain: "usc-psk",
      name: "Beta Chapter",
      school: "UofSC",
      isActive: true,
    });

    // PortalUser does not exist yet
    mocks.mockPortalUserFindFirst.mockResolvedValue(null);

    // Brother record exists with passwordHash
    mocks.mockBrotherFindFirst.mockResolvedValue({
      id: "brother-123",
      email: "first@usc.edu",
      passwordHash: "mock_hash",
    });

    mocks.mockPortalUserCreate.mockResolvedValue({
      id: "user-new",
      email: "first@usc.edu",
      role: "brother",
      brotherId: "brother-123",
    });

    const req = new Request("https://greekstack.vercel.app/api/mobile/auth", {
      method: "POST",
      body: JSON.stringify({
        subdomain: "usc-psk",
        email: "first@usc.edu",
        password: "correct_password",
        role: "brother",
      }),
    });

    const res = await authMobile(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.user.brotherId).toBe("brother-123");
    expect(mocks.mockPortalUserCreate).toHaveBeenCalled();
  });
});
