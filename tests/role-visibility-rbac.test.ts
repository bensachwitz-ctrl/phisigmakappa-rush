import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";
import {
  computeMemberCapabilities,
  isOfficerPosition,
} from "@/lib/member-capabilities";

// ── Market-critical RBAC coverage ────────────────────────────────────────────
// These tests prove the SERVER ENFORCES role/feature visibility, not just the
// UI. They cover the four invariants the brief calls out:
//   (a) a regular MEMBER is denied exec capabilities server-side
//   (b) Dues is hidden + API-gated when the chapter dues flag is OFF
//   (c) an EXEC (officer) still receives exec capabilities
//   (d) the mobile "viewing-as exec" lens respects the REAL role — i.e. the
//       capability the client uses is computed from the verified session +
//       admin-set position, never from a client toggle a member could flip.

// ── 1. Pure capability logic ─────────────────────────────────────────────────
describe("computeMemberCapabilities (server-side RBAC source of truth)", () => {
  it("denies exec to a plain active brother (non-officer position)", () => {
    const caps = computeMemberCapabilities("brother", "Active Member", true);
    expect(caps.exec).toBe(false);
  });

  it("denies exec to a brother with no position at all", () => {
    expect(computeMemberCapabilities("brother", null, true).exec).toBe(false);
    expect(computeMemberCapabilities("brother", "", false).exec).toBe(false);
  });

  it("grants exec to an officer brother (President / Treasurer / any chair)", () => {
    expect(computeMemberCapabilities("brother", "President", true).exec).toBe(true);
    expect(computeMemberCapabilities("brother", "Treasurer", false).exec).toBe(true);
    expect(computeMemberCapabilities("brother", "Recruitment Chair", true).exec).toBe(true);
    expect(computeMemberCapabilities("brother", "Vice President", true).exec).toBe(true);
  });

  it("NEVER grants exec to an alumni session, even with an officer-looking string", () => {
    // The exec console manages the active-brother chapter; an alumni token can't
    // operate it regardless of any position text.
    expect(computeMemberCapabilities("alumni", "President", true).exec).toBe(false);
    expect(computeMemberCapabilities("pnm", "Treasurer", true).exec).toBe(false);
  });

  it("reports duesEnabled straight from the chapter flag", () => {
    expect(computeMemberCapabilities("brother", "President", true).duesEnabled).toBe(true);
    expect(computeMemberCapabilities("brother", "President", false).duesEnabled).toBe(false);
  });

  it("isOfficerPosition matches the officer keyword set", () => {
    expect(isOfficerPosition("President")).toBe(true);
    expect(isOfficerPosition("social chair")).toBe(true);
    expect(isOfficerPosition("Brother")).toBe(false);
    expect(isOfficerPosition(null)).toBe(false);
  });
});

// ── 2 & 3. Mobile data route — exec capability + dues gating ──────────────────
const mocks = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockPortalUserFindUnique: vi.fn(),
  mockBrotherFindUnique: vi.fn(),
  mockBrotherFindMany: vi.fn(),
  mockSiteConfigFindUnique: vi.fn(),
  mockSiteConfigFindMany: vi.fn(),
  mockDuesPaymentFindMany: vi.fn(),
  mockAnnouncementFindMany: vi.fn(),
  mockEventFindMany: vi.fn(),
  mockAlumniProfileFindMany: vi.fn(),
  mockJobPostingFindMany: vi.fn(),
  mockBudgetLineFindMany: vi.fn(),
  mockExpenseFindMany: vi.fn(),
  mockRushFindMany: vi.fn(),
}));

vi.mock("@/lib/points-server", () => ({
  loadMemberStanding: async () => null,
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: () => null }),
  cookies: () => ({ get: () => null }),
}));

const mockTenantClient = {
  portalUser: { findUnique: mocks.mockPortalUserFindUnique },
  brother: {
    findUnique: mocks.mockBrotherFindUnique,
    findMany: mocks.mockBrotherFindMany,
  },
  siteConfig: {
    findUnique: mocks.mockSiteConfigFindUnique,
    findMany: mocks.mockSiteConfigFindMany,
  },
  duesPayment: { findMany: mocks.mockDuesPaymentFindMany },
  announcement: { findMany: mocks.mockAnnouncementFindMany },
  event: { findMany: mocks.mockEventFindMany },
  alumniProfile: { findMany: mocks.mockAlumniProfileFindMany },
  jobPosting: { findMany: mocks.mockJobPostingFindMany },
  budgetLine: { findMany: mocks.mockBudgetLineFindMany },
  expense: { findMany: mocks.mockExpenseFindMany },
  rush: { findMany: mocks.mockRushFindMany },
};

vi.mock("@/lib/prisma", () => ({
  centralDb: { tenant: { findUnique: mocks.mockTenantFindUnique } },
  getTenantClient: () => mockTenantClient,
  getSubdomain: (host: string | null) => host?.split(".")[0] || null,
}));

import { GET as getMobileData } from "@/app/api/mobile/data/route";

const TEST_SECRET = "test-portal-secret-32-chars-.........";

// Helper: stand up a fully-mocked happy-path tenant + brother for the data
// route, parameterized by the brother's REAL position + the dues flag.
function primeMobileData(opts: { position: string | null; duesEnabled: boolean }) {
  mocks.mockTenantFindUnique.mockResolvedValue({
    id: "tenant-1",
    subdomain: "usc-psk",
    name: "Beta Chapter",
    school: "UofSC",
    isActive: true,
  });
  mocks.mockPortalUserFindUnique.mockResolvedValue({
    id: "user-123",
    email: "brother@usc.edu",
    role: "brother",
    brotherId: "brother-789",
  });
  mocks.mockBrotherFindUnique.mockResolvedValue({
    id: "brother-789",
    name: "Test Member",
    email: "brother@usc.edu",
    phone: null,
    year: "Senior",
    major: "CS",
    position: opts.position,
    pledgeClass: "Fall 2023",
    hometown: null,
    gradYear: null,
    bio: null,
    headshotUrl: null,
    status: "ACTIVE",
    duesPaid: false,
  });
  // Route reads the dues.enabled flag via findUnique({ where: { key } }).
  mocks.mockSiteConfigFindUnique.mockResolvedValue(
    opts.duesEnabled ? { key: "dues.enabled", value: "true" } : { key: "dues.enabled", value: "false" },
  );
  // The dues config findMany (only hit when enabled) + brand findMany.
  mocks.mockSiteConfigFindMany.mockResolvedValue([
    { key: "dues.amountCents", value: "50000" },
    { key: "dues.year", value: "2026" },
    { key: "dues.label", value: "Active Dues" },
  ]);
  mocks.mockDuesPaymentFindMany.mockResolvedValue([
    { id: "p1", amountCents: 50000, year: "2026", status: "PAID", method: "STRIPE", receiptUrl: null, notes: null, createdAt: new Date() },
  ]);
  mocks.mockAnnouncementFindMany.mockResolvedValue([]);
  mocks.mockEventFindMany.mockResolvedValue([]);
  mocks.mockBrotherFindMany.mockResolvedValue([]);
  mocks.mockAlumniProfileFindMany.mockResolvedValue([]);
  mocks.mockJobPostingFindMany.mockResolvedValue([]);
  // Exec-only sources — populated so an officer call returns non-empty rollups.
  mocks.mockBudgetLineFindMany.mockResolvedValue([
    { budgetedCents: 100000, actualCents: 40000 },
    { budgetedCents: 50000, actualCents: 10000 },
  ]);
  mocks.mockExpenseFindMany.mockResolvedValue([{ amountCents: 2500 }]);
  mocks.mockRushFindMany.mockResolvedValue([
    { id: "r1", name: "PNM One", status: "ACTIVE", year: "Sophomore", major: "Econ", createdAt: new Date() },
  ]);
}

async function callMobileData() {
  const token = signPortalTokenForTenant("user-123", "brother", "usc-psk");
  const req = new Request("https://greekstack.vercel.app/api/mobile/data?subdomain=usc-psk", {
    headers: { authorization: `Bearer ${token}` },
  });
  const res = await getMobileData(req);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/mobile/data — server-enforced capabilities", () => {
  beforeEach(() => {
    vi.stubEnv("PORTAL_SESSION_SECRET", TEST_SECRET);
    vi.stubEnv("NODE_ENV", "test");
    vi.clearAllMocks();
  });

  it("(a) a regular member is denied exec capabilities server-side", async () => {
    primeMobileData({ position: "Active Member", duesEnabled: true });
    const { status, body } = await callMobileData();
    expect(status).toBe(200);
    expect(body.capabilities.exec).toBe(false);
  });

  it("(c) an officer (President) still receives exec capabilities", async () => {
    primeMobileData({ position: "President", duesEnabled: true });
    const { status, body } = await callMobileData();
    expect(status).toBe(200);
    expect(body.capabilities.exec).toBe(true);
  });

  it("(b) dues data is WITHHELD + duesEnabled=false when the chapter flag is off", async () => {
    primeMobileData({ position: "President", duesEnabled: false });
    const { status, body } = await callMobileData();
    expect(status).toBe(200);
    // The whole dues payload is null — no config, amounts, or payment history.
    expect(body.dues).toBeNull();
    expect(body.capabilities.duesEnabled).toBe(false);
    // The dues ledger query must NOT even run when the flag is off.
    expect(mocks.mockDuesPaymentFindMany).not.toHaveBeenCalled();
  });

  it("serves the dues payload when the chapter flag is on", async () => {
    primeMobileData({ position: "Active Member", duesEnabled: true });
    const { status, body } = await callMobileData();
    expect(status).toBe(200);
    expect(body.capabilities.duesEnabled).toBe(true);
    expect(body.dues).toBeTruthy();
    expect(body.dues.config.enabled).toBe(true);
    expect(body.dues.payments).toHaveLength(1);
  });

  // ── Exec-only treasury + PNM payload (withheld unless capabilities.exec) ─────
  it("WITHHOLDS treasury + pnms for a non-officer (exec=false) — queries don't run", async () => {
    primeMobileData({ position: "Active Member", duesEnabled: true });
    const { status, body } = await callMobileData();
    expect(status).toBe(200);
    expect(body.capabilities.exec).toBe(false);
    expect(body.treasury).toBeNull();
    expect(body.pnms).toBeNull();
    // The exec-only data sources must NOT even be queried for a non-officer.
    expect(mocks.mockBudgetLineFindMany).not.toHaveBeenCalled();
    expect(mocks.mockRushFindMany).not.toHaveBeenCalled();
  });

  it("INCLUDES a treasury summary + pnms list for an officer (exec=true)", async () => {
    primeMobileData({ position: "Treasurer", duesEnabled: true });
    const { status, body } = await callMobileData();
    expect(status).toBe(200);
    expect(body.capabilities.exec).toBe(true);
    expect(body.treasury).toBeTruthy();
    expect(body.treasury.budgetedCents).toBe(150000);
    expect(body.treasury.actualCents).toBe(50000);
    expect(body.treasury.remainingCents).toBe(100000);
    expect(body.treasury.pendingExpenseCents).toBe(2500);
    expect(body.pnms).toHaveLength(1);
    expect(body.pnms[0].name).toBe("PNM One");
  });
});
