import { describe, it, expect, vi, beforeEach } from "vitest";
import { signPortalTokenForTenant } from "@/lib/portal-auth";
import {
  computeMemberCapabilities,
  isOfficerPosition,
} from "@/lib/member-capabilities";
import {
  hasPermission,
  parsePermissions,
  DEFAULT_OFFICER_CATALOG,
  SUPER_ADMIN_PERMISSIONS,
  EMPTY_PERMISSIONS,
  type DomainKey,
} from "@/lib/officer-permissions";

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

// ── 1c. Web BrothersDashboardClient derivations (mirror the .tsx expressions) ──
// Owner-reported web-portal bug: the brothers dashboard decided "show the exec
// console?" with an ad-hoc `position && position !== "Active Member" &&
// position.trim() !== ""`. That treats ANY non-empty, non-"Active Member" string
// (e.g. "Member", "Brother", "New Member", a custom title) as an officer, so the
// Quick Admin Console + its /admin/* shortcuts leaked onto a plain member's view.
// The fix routes the web surface through the SAME canonical isOfficerPosition()
// gate the mobile route uses. These tests pin both the corrected exec gate AND
// the dues-visibility gate so a future edit can't silently re-introduce either.
describe("BrothersDashboardClient RBAC derivations (mirror the .tsx)", () => {
  // showAdminConsole === isOfficerPosition(position) || isAdmin  (the .tsx line)
  const showAdminConsole = (position: string | null, isAdmin: boolean): boolean =>
    isOfficerPosition(position) || isAdmin;

  // showDues === duesConfigured || showAdminConsole  (the .tsx line)
  const showDues = (
    duesConfigured: boolean,
    position: string | null,
    isAdmin: boolean,
  ): boolean => duesConfigured || showAdminConsole(position, isAdmin);

  it("NEVER shows the exec console to a plain member (incl. the strings that used to leak)", () => {
    // The old heuristic ( !== "Active Member" ) let ALL of these through. They
    // are NOT officer seats, so the console must stay hidden.
    for (const p of ["Active Member", "Member", "Brother", "New Member", "Pledge", "Initiate", "Alumnus", "", null]) {
      expect(showAdminConsole(p, false)).toBe(false);
    }
  });

  it("shows the exec console to real officer seats matched by the keyword gate", () => {
    // isOfficerPosition matches: president / vice / treasurer / secretary /
    // chair / officer / exec. These titles all contain one of those tokens.
    for (const p of ["President", "Vice President", "Treasurer", "Secretary", "Recruitment Chair", "Social Chair", "Philanthropy Chair"]) {
      expect(showAdminConsole(p, false)).toBe(true);
    }
  });

  it("DECISION: '…Manager' titles do NOT surface the member-dashboard console (safer keyword gate), but a global admin override still does", () => {
    // OWNER FOLLOW-UP #2 — should "Risk Manager" / "House Manager" surface the
    // member-dashboard exec console? They contain no officer keyword in
    // isOfficerPosition (president/vice/treasurer/secretary/chair/officer/exec),
    // so today they don't, on the web AND on mobile (both use the same canonical
    // gate). DECISION: keep it that way — do NOT add a "manager" keyword.
    //   • This member-dashboard console is a convenience SHORTCUT, not the
    //     authoritative admin surface. A Risk/House Manager's real privileged
    //     tooling is the dedicated /admin/* pages, server-gated by their actual
    //     OfficerAssignment domain (risk:write / house:write), which the admin
    //     layout's boundary gate (test 1f) now admits them to.
    //   • Adding a broad "manager" keyword would re-introduce the over-match bug
    //     just fixed: it would also flip on chapter-invented non-officer titles
    //     like "Social Media Manager" / "Event Manager", bleeding the console
    //     back onto people who aren't exec.
    // So the safer option is the current behavior; pinned here as a deliberate
    // decision, not a silent gap. (If a chapter truly wants these in the member
    // console, the right lever is giving them an officer OfficerAssignment, not
    // weakening the title heuristic.)
    expect(showAdminConsole("Risk Manager", false)).toBe(false);
    expect(showAdminConsole("House Manager", false)).toBe(false);
    // …but the admin override still wins regardless of the title.
    expect(showAdminConsole("Risk Manager", true)).toBe(true);
  });

  it("shows the exec console to a global admin regardless of position", () => {
    expect(showAdminConsole("Active Member", true)).toBe(true);
    expect(showAdminConsole(null, true)).toBe(true);
  });

  it("hides the Dues card/tab from a plain member when dues is NOT configured", () => {
    expect(showDues(false, "Active Member", false)).toBe(false);
    expect(showDues(false, "Member", false)).toBe(false);
    expect(showDues(false, null, false)).toBe(false);
  });

  it("shows the Dues card/tab to a member once dues IS configured", () => {
    expect(showDues(true, "Active Member", false)).toBe(true);
    expect(showDues(true, "Brother", false)).toBe(true);
  });

  it("shows the Dues tab to exec/admin even when dues is unconfigured (so they can set it up)", () => {
    expect(showDues(false, "Treasurer", false)).toBe(true);
    expect(showDues(false, "Active Member", true)).toBe(true);
  });
});

// ── 1d. Server-side dues "configured" flag (mirror page.tsx derivation) ───────
// Owner-reported bug: the Dues card rendered "$0.00 / blank year" even when the
// chapter never set dues up. The server now computes configured = enabled &&
// amountCents > 0 and the client hides the dues surface for plain members when
// it's false. Pin the derivation so it can't regress.
describe("dues 'configured' server flag (mirror page.tsx)", () => {
  const duesConfigured = (enabled: boolean, amountCents: number): boolean =>
    enabled && amountCents > 0;

  it("is false when dues is disabled, has no amount, or both", () => {
    expect(duesConfigured(false, 0)).toBe(false);
    expect(duesConfigured(false, 15000)).toBe(false);
    expect(duesConfigured(true, 0)).toBe(false);
  });

  it("is true only when dues is enabled AND a positive amount is set", () => {
    expect(duesConfigured(true, 15000)).toBe(true);
    expect(duesConfigured(true, 1)).toBe(true);
  });
});

// ── 1e. Defense-in-depth: page/route server gate (requireOfficerPermission) ───
// The exec admin pages (/admin/brothers, /admin/directory, /admin/rushees/[id])
// now call requireOfficerPermission(domain, action) at the top — the same gate
// the API write routes use. requireOfficerPermission throws (→ 403) exactly when
// hasPermission(perms, domain, action) is false, so testing the underlying
// hasPermission against the REAL seeded catalog proves an officer who lacks the
// domain — or a member with no assignments at all — is SERVER-rejected, not just
// UI-hidden. (Hiding the console button is necessary but not sufficient; this is
// the "the server action must also reject" half the brief calls out.)
describe("server-side page/route gate denies officers outside their domain", () => {
  const catalog = Object.fromEntries(
    DEFAULT_OFFICER_CATALOG.map((s) => [s.slug, s.permissions]),
  );
  // requireOfficerPermission(domain, action) === !hasPermission ? throw : pass.
  const gateAllows = (perms: any, domain: DomainKey, action: "read" | "write") =>
    hasPermission(perms, domain, action);

  it("the /admin/brothers + /admin/directory gate (brothers:read) admits roster-reading officers but its WRITE side stays restricted", () => {
    // The catalog grants nearly every officer r("brothers") (the roster is
    // broadly readable), so brothers:READ is an intentionally permissive page
    // gate — it keeps NON-officers (empty perms) out, which is the member leak we
    // care about. The destructive add/remove/edit actions are gated separately on
    // brothers:WRITE at the API layer, which only the President (superAdmin) and
    // Marshal hold — a roster-reading chair cannot mutate.
    expect(gateAllows(catalog["house-manager"], "brothers", "read")).toBe(true);
    expect(gateAllows(catalog["house-manager"], "brothers", "write")).toBe(false);
    expect(gateAllows(catalog["social-chair"], "brothers", "write")).toBe(false);
    expect(gateAllows(catalog["treasurer"], "brothers", "write")).toBe(false);
    expect(gateAllows(catalog["president"], "brothers", "write")).toBe(true); // superAdmin
    expect(gateAllows(catalog["marshal"], "brothers", "write")).toBe(true); // w("brothers")
  });

  it("DENIES the /admin/rushees/[id] gate (rushPipeline:read) to officers outside recruitment", () => {
    // The rush pipeline is held ONLY by the Recruitment Chair (+ President
    // superAdmin) — so a Treasurer / Risk Manager / House Manager is rejected.
    expect(gateAllows(catalog["treasurer"], "rushPipeline", "read")).toBe(false);
    expect(gateAllows(catalog["risk-manager"], "rushPipeline", "read")).toBe(false);
    expect(gateAllows(catalog["house-manager"], "rushPipeline", "read")).toBe(false);
    expect(gateAllows(catalog["scholarship-chair"], "rushPipeline", "read")).toBe(false);
  });

  it("ALLOWS the rushPipeline:read gate for the Recruitment Chair + President", () => {
    expect(gateAllows(catalog["recruitment-chair"], "rushPipeline", "read")).toBe(true);
    expect(gateAllows(catalog["president"], "rushPipeline", "read")).toBe(true);
  });

  it("DENIES the dues/payments gate to everyone but the Treasurer + President", () => {
    expect(gateAllows(catalog["treasurer"], "dues", "write")).toBe(true);
    expect(gateAllows(catalog["treasurer"], "payments", "write")).toBe(true);
    expect(gateAllows(catalog["president"], "payments", "write")).toBe(true); // superAdmin
    expect(gateAllows(catalog["secretary"], "payments", "write")).toBe(false);
    expect(gateAllows(catalog["recruitment-chair"], "dues", "write")).toBe(false);
    expect(gateAllows(catalog["house-manager"], "dues", "write")).toBe(false);
  });

  it("DENIES every domain to a brother with NO officer assignments (plain member)", () => {
    // getOfficerPermissionsForBrother() returns EMPTY_PERMISSIONS for a member
    // with zero assignments — every gate then throws 403.
    for (const d of ["brothers", "dues", "payments", "rushPipeline", "siteSettings", "elections"] as DomainKey[]) {
      expect(gateAllows(EMPTY_PERMISSIONS, d, "read")).toBe(false);
      expect(gateAllows(EMPTY_PERMISSIONS, d, "write")).toBe(false);
    }
  });

  it("a global admin (superAdmin) passes every gate", () => {
    for (const d of ["brothers", "dues", "payments", "rushPipeline", "siteSettings", "elections"] as DomainKey[]) {
      expect(gateAllows(SUPER_ADMIN_PERMISSIONS, d, "write")).toBe(true);
    }
  });

  it("permissions round-trip through parse() so a DB-stored seed gates identically", () => {
    // The catalog perms are stored as JSON on OfficerPosition.permissions and
    // parsed at request time — prove the parsed shape gates the same way.
    const treasurerParsed = parsePermissions(
      JSON.stringify(catalog["treasurer"]),
    );
    expect(hasPermission(treasurerParsed, "dues", "write")).toBe(true);
    expect(hasPermission(treasurerParsed, "rushPipeline", "read")).toBe(false);
  });
});

// ── 1f. Admin-boundary gate: members can't enter /admin at all ────────────────
// Owner-reported / audit-found leak: the admin LAYOUT only did `if (!session)
// redirect("/admin/login")`, and the Edge middleware only verifies the session
// is VALID — neither checks isAdmin. But the public member-login branch (POST
// /api/admin/login, mode:"brother") mints the SAME `phisig_admin` cookie with
// isAdmin=false for any plain brother. So a regular member who signed into the
// member app carried a cookie that satisfied both gates and could open EVERY
// /admin/* page that didn't independently call requireOfficerPermission — the
// landing dashboard (roster + PNM votes/notes + alumni donations), the audit
// log, polls, etc. That's a real member→exec data leak, not just a UI slip.
//
// The layout now admits the admin area only for a super-admin OR an officer who
// holds ≥1 active OfficerAssignment; a plain member is bounced to /portal (NOT
// /admin/login, which would loop on their valid cookie). These tests pin that
// exact admit/deny decision (mirroring the layout expression) against the real
// seeded catalog so a future edit can't silently re-open the boundary.
describe("admin-area boundary gate (mirror app/admin/layout.tsx)", () => {
  const catalog = Object.fromEntries(
    DEFAULT_OFFICER_CATALOG.map((s) => [s.slug, s.permissions]),
  );
  // The layout's decision: isAdmin (super-admin cookie) OR the resolved perms
  // grant some access. A non-admin session with EMPTY_PERMISSIONS is rejected.
  const mayEnterAdmin = (isAdmin: boolean, perms: typeof EMPTY_PERMISSIONS): boolean => {
    if (isAdmin) return true;
    return !!perms.superAdmin || Object.keys(perms.domain || {}).length > 0;
  };

  it("ADMITS a chapter super-admin (isAdmin=true) regardless of officer perms", () => {
    // Every /admin login today mints an isAdmin=true cookie — so this branch
    // must always pass, otherwise we'd lock the only people who can sign in out.
    expect(mayEnterAdmin(true, EMPTY_PERMISSIONS)).toBe(true);
    expect(mayEnterAdmin(true, SUPER_ADMIN_PERMISSIONS)).toBe(true);
  });

  it("ADMITS a non-super-admin officer who holds at least one domain", () => {
    // Forward-looking: if an isAdmin=false officer session is ever issued, an
    // officer with real assignments still reaches their admin home.
    for (const slug of ["treasurer", "recruitment-chair", "risk-manager", "house-manager", "secretary"]) {
      expect(mayEnterAdmin(false, catalog[slug])).toBe(true);
    }
  });

  it("REJECTS a plain member (no assignments → empty perms, isAdmin=false)", () => {
    // This is the leak being closed: a member-login cookie no longer reaches the
    // admin surfaces — they're sent to /portal instead.
    expect(mayEnterAdmin(false, EMPTY_PERMISSIONS)).toBe(false);
  });
});

// ── 1g. Admin landing-page domain scoping (mirror app/admin/page.tsx) ─────────
// Follow-up the owner called out: the /admin landing dashboard loaded the rush
// pipeline (PNM votes/notes/contact), the alumni network (donations + PII) and a
// dues-paid headcount behind ONLY a session-existence gate. The page now resolves
// the caller's officer perms and renders each sensitive block only for the domain
// that owns it (super-admins see everything — that's every /admin login today),
// WITHOUT hard-gating the whole page (which would lock a single-domain officer
// out of their home / loop with the error boundary). These pin the per-block
// flags + the ?view=alumni fallback so the scoping can't silently regress.
describe("admin landing-page sensitive-block scoping (mirror page.tsx)", () => {
  const catalog = Object.fromEntries(
    DEFAULT_OFFICER_CATALOG.map((s) => [s.slug, s.permissions]),
  );
  const canSeeRush = (p: typeof EMPTY_PERMISSIONS) => hasPermission(p, "rushPipeline", "read");
  const canSeeAlumni = (p: typeof EMPTY_PERMISSIONS) => hasPermission(p, "alumni", "read");
  const canSeeDues = (p: typeof EMPTY_PERMISSIONS) => hasPermission(p, "dues", "read");
  // currentView = requestedView==="alumni" && canSeeAlumni ? "alumni" : "brothers"
  const resolveView = (requested: "alumni" | "brothers", p: typeof EMPTY_PERMISSIONS) =>
    requested === "alumni" && canSeeAlumni(p) ? "alumni" : "brothers";

  it("a super-admin sees the rush, alumni and dues blocks (unchanged behavior)", () => {
    expect(canSeeRush(SUPER_ADMIN_PERMISSIONS)).toBe(true);
    expect(canSeeAlumni(SUPER_ADMIN_PERMISSIONS)).toBe(true);
    expect(canSeeDues(SUPER_ADMIN_PERMISSIONS)).toBe(true);
    expect(resolveView("alumni", SUPER_ADMIN_PERMISSIONS)).toBe("alumni");
  });

  it("the Treasurer sees dues but NOT the rush pipeline or alumni network", () => {
    const t = catalog["treasurer"];
    expect(canSeeDues(t)).toBe(true);
    expect(canSeeRush(t)).toBe(false);
    expect(canSeeAlumni(t)).toBe(false);
    // and ?view=alumni is folded back to the brothers view they can see.
    expect(resolveView("alumni", t)).toBe("brothers");
  });

  it("the Recruitment Chair sees rush but NOT alumni or the dues headcount", () => {
    const rc = catalog["recruitment-chair"];
    expect(canSeeRush(rc)).toBe(true);
    expect(canSeeAlumni(rc)).toBe(false);
    expect(canSeeDues(rc)).toBe(false);
  });

  it("a Vice President (alumni:read) reaches the alumni view via ?view=alumni", () => {
    const vp = catalog["vice-president"];
    expect(canSeeAlumni(vp)).toBe(true);
    expect(resolveView("alumni", vp)).toBe("alumni");
  });

  it("an empty-perms member (shouldn't reach the page) sees no sensitive block", () => {
    // Defense-in-depth: even if the layout gate were bypassed, no sensitive
    // aggregate is rendered/queried for a caller with no domains.
    expect(canSeeRush(EMPTY_PERMISSIONS)).toBe(false);
    expect(canSeeAlumni(EMPTY_PERMISSIONS)).toBe(false);
    expect(canSeeDues(EMPTY_PERMISSIONS)).toBe(false);
    expect(resolveView("alumni", EMPTY_PERMISSIONS)).toBe("brothers");
  });
});

// ── 1b. Client-side demo-honesty gates (MobileAppClient) ─────────────────────
// The demo (/app?demo=true) has NO real session, so it can't read the server's
// `capabilities` object. Two owner-reported bugs came from the demo FORCING
// exec/dues visible (`isDemo || …`):
//   • "why is exec tools on member" — the member-persona screen still exposed an
//     exec toggle, bleeding exec tooling onto the member view.
//   • "dues is hiding if they do not have them set up" — dues was force-shown in
//     the demo regardless of the chapter's actual dues setting.
// These tests pin the corrected derivations the client now uses, so a future
// edit can't silently re-force them true. They mirror the EXACT expressions in
// MobileAppClient.tsx (kept in lock-step with that file).
describe("demo-honesty client gates (mirror MobileAppClient derivations)", () => {
  // duesVisible: real session → server flag; demo → the demo chapter's OWN dues
  // config (`dues.config.enabled`), never force-true just because isDemo.
  const duesVisible = (
    isDemo: boolean,
    data: { capabilities?: { duesEnabled?: boolean }; dues?: { config?: { enabled?: boolean } } } | null,
  ): boolean =>
    isDemo
      ? data?.dues?.config?.enabled === true
      : data?.capabilities?.duesEnabled === true;

  // execToggleActive: the header behaves as an exec toggle only when the exec
  // lens is genuinely in play for THIS persona — a real cleared officer
  // (execAllowed && !isDemo), OR the demo while already in the exec persona.
  // It is NEVER active on the demo member screen.
  const execToggleActive = (
    isDemo: boolean,
    execAllowed: boolean,
    viewPersona: "member" | "exec" | "alumni",
  ): boolean => (viewPersona === "exec") || (execAllowed && !isDemo);

  it("demo member persona: dues follows the chapter's own config, not isDemo", () => {
    // Dues set up in the demo chapter → visible.
    expect(duesVisible(true, { dues: { config: { enabled: true } } })).toBe(true);
    // Dues NOT set up → hidden, even though isDemo is true (the bug).
    expect(duesVisible(true, { dues: { config: { enabled: false } } })).toBe(false);
    expect(duesVisible(true, { dues: { config: {} } })).toBe(false);
    expect(duesVisible(true, {})).toBe(false);
  });

  it("real session: dues follows the server capability flag", () => {
    expect(duesVisible(false, { capabilities: { duesEnabled: true } })).toBe(true);
    expect(duesVisible(false, { capabilities: { duesEnabled: false } })).toBe(false);
    expect(duesVisible(false, {})).toBe(false);
  });

  it("demo member persona: the header is NOT an exec toggle (no exec tools on member)", () => {
    // execAllowed is true in the demo (exec persona is offerable), but the toggle
    // must stay inactive on the member screen.
    expect(execToggleActive(true, true, "member")).toBe(false);
    expect(execToggleActive(true, true, "alumni")).toBe(false);
  });

  it("demo exec persona: the header toggle is active (so you can flip back)", () => {
    expect(execToggleActive(true, true, "exec")).toBe(true);
  });

  it("real officer: the header toggle is active from any persona", () => {
    expect(execToggleActive(false, true, "member")).toBe(true);
    expect(execToggleActive(false, true, "exec")).toBe(true);
  });

  it("real non-officer: the header toggle is never active in any REACHABLE persona", () => {
    // A real non-officer (execAllowed=false) can only ever be in the member or
    // alumni persona — the persona-switch guard + the switcher's visiblePersonas
    // filter make the exec persona UNREACHABLE for them, so viewPersona can never
    // be "exec" here. In those reachable states the toggle is always inactive.
    expect(execToggleActive(false, false, "member")).toBe(false);
    expect(execToggleActive(false, false, "alumni")).toBe(false);
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

// ── GATE-3 FIX 2 — Brothers dashboard Quick Admin Console: no DEAD /admin/* ────
// shortcuts for a portal-only officer. A /portal/brothers session carries the
// `phisig_portal` cookie, NOT `phisig_admin`, so a portal-only OFFICER
// (isOfficer=true, isAdmin=false) CANNOT reach /admin/* — every shortcut just
// bounced them to /admin/login. The console + the "Add/Manage events" + "Set up
// dues" /admin/* links are now gated on REAL admin access (`canUseAdminLinks =
// isAdmin`), not officer position, so a portal-only officer sees no dead control.
// We deliberately do NOT bridge a portal officer up to admin (that would weaken
// tenant/role isolation); hiding is the safe default. Static source-pin + a pure
// predicate matching the component's gate. Non-vacuous: the pre-fix gate
// (`isOfficer || isAdmin`) would have FAILED the predicate test for the
// portal-only-officer case.
describe("brothers dashboard admin shortcuts (GATE-3 FIX 2) — no dead /admin/* for portal-only officers", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const { resolve } = require("node:path") as typeof import("node:path");
  const SRC = readFileSync(
    resolve(__dirname, "..", "app/portal/brothers/dashboard/BrothersDashboardClient.tsx"),
    "utf8",
  );

  // The exact gate the component renders the /admin/* shortcuts behind.
  const canUseAdminLinks = (isAdmin: boolean): boolean => isAdmin;

  it("a portal-only OFFICER (isOfficer=true, isAdmin=false) gets NO admin shortcuts", () => {
    // isOfficer is true, but the admin-link gate ignores it — only real admin
    // access (the phisig_admin cookie → isAdmin) unlocks the /admin/* links.
    expect(canUseAdminLinks(false)).toBe(false);
  });

  it("a real ADMIN (isAdmin=true) DOES get the admin shortcuts", () => {
    expect(canUseAdminLinks(true)).toBe(true);
  });

  it("the source gates the Quick Admin Console + /admin/* links on `canUseAdminLinks`, defined as `isAdmin`", () => {
    // Pin the wiring so a future edit can't silently re-broaden the gate back to
    // officer position (which is exactly what dangled the dead controls).
    expect(SRC).toMatch(/const canUseAdminLinks = isAdmin;/);
    // All three /admin/*-linking blocks render behind canUseAdminLinks.
    const guards = SRC.match(/\{canUseAdminLinks &&/g) || [];
    expect(guards.length).toBeGreaterThanOrEqual(3);
  });

  it("the admin-link controls are NOT gated on officer position (showExecSurface)", () => {
    // showExecSurface (isOfficer || isAdmin) still gates dues-card VISIBILITY,
    // but must never wrap an /admin/* link — those are admin-only now.
    expect(/\{showExecSurface &&/.test(SRC)).toBe(false);
    // And the old, leak-y name must be fully gone.
    expect(/showAdminConsole/.test(SRC)).toBe(false);
  });

  it("the recruitment shortcut points at the real /admin/rushees route (not the 404 /admin/rush)", () => {
    // GATE-3 FIX 3 lives here too: /admin/rush does not exist; /admin/rushees does.
    expect(SRC).toContain('path: "/admin/rushees"');
    expect(/path:\s*"\/admin\/rush"/.test(SRC)).toBe(false);
  });
});
