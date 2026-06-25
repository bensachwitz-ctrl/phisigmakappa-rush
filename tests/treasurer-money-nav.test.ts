import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  hasPermission,
  DEFAULT_OFFICER_CATALOG,
  SUPER_ADMIN_PERMISSIONS,
  EMPTY_PERMISSIONS,
} from "@/lib/officer-permissions";

// ── GATE-3 FIX (Treasurer money-nav discovery) ───────────────────────────────
// A non-admin Treasurer is granted dues + payments (officer-permissions.ts), the
// admin layout admits them, and /admin/treasury gates on payments:read — yet the
// money surfaces (Treasury / Dues / Payouts) were marked adminOnly:true in the
// nav + ⌘K, which short-circuited BEFORE the per-domain filter and hid them from
// the very officer they belong to. They could reach Treasury only by typing the
// URL. This suite pins that a Treasurer now DISCOVERS all three money surfaces in
// the nav, the command palette, and the dashboard tiles — while Billing stays
// super-admin-only — AND that the now-exposed pages/API are genuinely reachable
// (domain-gated), so none of the surfaced links is a dead control.

const ROOT = resolve(__dirname, "..");
const read = (...p: string[]) => readFileSync(resolve(ROOT, ...p), "utf8");

const catalog = Object.fromEntries(
  DEFAULT_OFFICER_CATALOG.map((s) => [s.slug, s.permissions]),
);

// The Treasurer's readable domain set (read|write), exactly as app/admin/layout
// computes it from their merged permissions.
function readableDomainsFor(slug: string): Set<string> {
  const perms = catalog[slug];
  return new Set(
    Object.entries(perms.domain || {})
      .filter(([, a]) => a === "read" || a === "write")
      .map(([d]) => d),
  );
}

// ── 1. The nav + palette admit predicates (mirror the components) ─────────────
// AdminNav: if (adminOnly && !isAdmin) return false; if (isAdmin || !domain)
//           return true; return readable.has(domain);
const navItemVisible = (
  item: { adminOnly: boolean; domain?: string },
  isAdmin: boolean,
  readable: Set<string>,
): boolean => {
  if (item.adminOnly && !isAdmin) return false;
  if (isAdmin || !item.domain) return true;
  return readable.has(item.domain);
};

// CommandPalette: admins see all; non-admins never see adminOnly; domain-gated
// only when readable; ungated stay visible.
const cmdVisible = (
  cmd: { adminOnly?: boolean; domain?: string },
  isAdmin: boolean,
  readable: Set<string>,
): boolean => {
  if (isAdmin) return true;
  if (cmd.adminOnly) return false;
  if (cmd.domain) return readable.has(cmd.domain);
  return true;
};

describe("Treasurer discovers the money nav (predicate, mirrors components)", () => {
  const treasurer = readableDomainsFor("treasurer"); // {brothers, dues, payments}

  // The real nav entries after the fix.
  const TREASURY = { adminOnly: false, domain: "payments" };
  const PAYOUTS = { adminOnly: false, domain: "payments" };
  const DUES = { adminOnly: false, domain: "dues" };
  const BILLING = { adminOnly: true }; // super-admin only

  it("a non-admin Treasurer sees Treasury, Dues, and Payouts in the nav", () => {
    expect(navItemVisible(TREASURY, false, treasurer)).toBe(true);
    expect(navItemVisible(DUES, false, treasurer)).toBe(true);
    expect(navItemVisible(PAYOUTS, false, treasurer)).toBe(true);
  });

  it("a non-admin Treasurer still does NOT see Billing (super-admin only)", () => {
    expect(navItemVisible(BILLING, false, treasurer)).toBe(false);
  });

  it("the same three money commands surface in ⌘K for a Treasurer, Billing does not", () => {
    expect(cmdVisible({ domain: "payments" }, false, treasurer)).toBe(true); // Treasury / Payouts
    expect(cmdVisible({ domain: "dues" }, false, treasurer)).toBe(true); // Dues
    expect(cmdVisible({ adminOnly: true }, false, treasurer)).toBe(false); // Billing
  });

  it("an officer WITHOUT payments/dues (e.g. Risk Manager) still does not see the money surfaces", () => {
    const risk = readableDomainsFor("risk-manager"); // no dues/payments
    expect(navItemVisible(TREASURY, false, risk)).toBe(false);
    expect(navItemVisible(DUES, false, risk)).toBe(false);
    expect(navItemVisible(PAYOUTS, false, risk)).toBe(false);
    expect(cmdVisible({ domain: "payments" }, false, risk)).toBe(false);
  });

  it("a real admin sees every money surface incl. Billing", () => {
    const none = new Set<string>();
    expect(navItemVisible(TREASURY, true, none)).toBe(true);
    expect(navItemVisible(BILLING, true, none)).toBe(true);
    expect(cmdVisible({ adminOnly: true }, true, none)).toBe(true);
  });
});

// ── 2. The dashboard quick-tiles show predicate (mirror app/admin/page.tsx) ───
describe("Treasurer money tiles on the dashboard (mirror page.tsx)", () => {
  const t = catalog["treasurer"];
  it("Treasury + Dues tiles show for a Treasurer; Billing + Big/Little do not", () => {
    expect(hasPermission(t, "payments", "read")).toBe(true); // Treasury tile
    expect(hasPermission(t, "dues", "read")).toBe(true); // Dues tile
    expect(!!t.superAdmin).toBe(false); // Billing + Big/Little tiles hidden
  });
  it("an admin sees the super-admin tiles", () => {
    expect(!!SUPER_ADMIN_PERMISSIONS.superAdmin).toBe(true);
  });
  it("an empty-perms member sees none of the money tiles", () => {
    expect(hasPermission(EMPTY_PERMISSIONS, "payments", "read")).toBe(false);
    expect(hasPermission(EMPTY_PERMISSIONS, "dues", "read")).toBe(false);
  });
});

// ── 3. Source-pins: the surfaced links are genuinely reachable (no dead controls)
describe("no dead controls — the exposed money surfaces are domain-gated", () => {
  it("admin-nav: Treasury/Dues/Payouts are NOT adminOnly; Billing IS", () => {
    const nav = read("components/admin/admin-nav.tsx");
    // Each money item carries its domain and adminOnly:false.
    expect(nav).toMatch(/href:\s*"\/admin\/treasury"[^}]*adminOnly:\s*false[^}]*domain:\s*"payments"/);
    expect(nav).toMatch(/href:\s*"\/admin\/dues"[^}]*adminOnly:\s*false[^}]*domain:\s*"dues"/);
    expect(nav).toMatch(/href:\s*"\/admin\/dues\/connect"[^}]*adminOnly:\s*false[^}]*domain:\s*"payments"/);
    // Billing remains adminOnly (super-admin only).
    expect(nav).toMatch(/href:\s*"\/admin\/billing"[^}]*adminOnly:\s*true/);
  });

  it("the Treasury page gates on payments (requireOfficerPermission)", () => {
    const src = read("app/admin/treasury/page.tsx");
    expect(src).toMatch(/requireOfficerPermission\(\s*["']payments["']/);
  });

  it("the Dues hub page gates on the dues domain via the graceful card (no isAdminRole redirect)", () => {
    const src = read("app/admin/dues/page.tsx");
    expect(src).toMatch(/checkOfficerPermission\(\s*["']dues["']/);
    expect(src).toMatch(/OfficerAccessRequired/);
    // The old admin-only gate is gone — that was what bounced the Treasurer.
    // (isAdminRole may appear in an explanatory comment; what must be gone is the
    // actual `if (!isAdminRole())` guard and its `redirect("/admin")`.)
    expect(/if\s*\(\s*!\s*isAdminRole\s*\(/.test(src)).toBe(false);
    expect(/redirect\(\s*["']\/admin["']\s*\)/.test(src)).toBe(false);
  });

  it("the Payouts page gates on the payments domain via the graceful card (no isAdminRole redirect)", () => {
    const src = read("app/admin/dues/connect/page.tsx");
    expect(src).toMatch(/checkOfficerPermission\(\s*["']payments["']/);
    expect(src).toMatch(/OfficerAccessRequired/);
    expect(/if\s*\(\s*!\s*isAdminRole\s*\(/.test(src)).toBe(false);
    expect(/redirect\(\s*["']\/admin["']\s*\)/.test(src)).toBe(false);
  });

  it("the /api/dues/connect API gates writes on payments:write (guardOfficer), not isAdminRole", () => {
    const src = read("app/api/dues/connect/route.ts");
    expect(src).toMatch(/guardOfficer\(\s*["']payments["']\s*,\s*["']write["']\s*\)/);
    // No bare admin-only gate remains, so a Treasurer's connect button isn't dead.
    expect(/if\s*\(\s*!\s*isAdminRole\s*\(/.test(src)).toBe(false);
  });

  it("the command palette threads readableDomains + gates the money commands by domain", () => {
    const src = read("components/admin/command-palette.tsx");
    expect(src).toMatch(/readableDomains/);
    expect(src).toMatch(/href:\s*"\/admin\/treasury"[^}]*domain:\s*"payments"/);
    expect(src).toMatch(/href:\s*"\/admin\/dues\/connect"[^}]*domain:\s*"payments"/);
    expect(src).toMatch(/href:\s*"\/admin\/dues"[^}]*domain:\s*"dues"/);
    // AdminShell passes the prop through.
    const shell = read("components/admin/admin-shell.tsx");
    expect(shell).toMatch(/<CommandPalette[^>]*readableDomains=\{readableDomains\}/);
  });

  it("the dashboard tiles gate Treasury/Dues on their domain and Billing on superAdmin", () => {
    const src = read("app/admin/page.tsx");
    expect(src).toMatch(/href:\s*"\/admin\/treasury"[^}]*hasPermission\(perms,\s*"payments",\s*"read"\)/);
    expect(src).toMatch(/href:\s*"\/admin\/dues"[^}]*hasPermission\(perms,\s*"dues",\s*"read"\)/);
    expect(src).toMatch(/href:\s*"\/admin\/billing"[^}]*perms\.superAdmin/);
  });
});
