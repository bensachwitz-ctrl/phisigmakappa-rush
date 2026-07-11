import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  hasPermission,
  DEFAULT_OFFICER_CATALOG,
  EMPTY_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
} from "@/lib/officer-permissions";

// ── Item-2 (P2): /admin/events opened to events officers, not admins-only ─────
// The route was isAdminRole()-only for POST/DELETE and the page/nav gated the
// whole manager on session.isAdmin — but the RBAC model has real events officers
// (events:write). The fix gates the API on guardOfficer("events","write"), the
// page on checkOfficerPermission("events", read/write), the nav tile on the
// events domain (adminOnly:false), and the manager's controls on canWrite.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);

describe("events domain gate (mirror requireOfficerPermission)", () => {
  const catalog = Object.fromEntries(
    DEFAULT_OFFICER_CATALOG.map((s) => [s.slug, s.permissions]),
  );
  const gate = (perms: any, action: "read" | "write") => hasPermission(perms, "events", action);

  it("admits events officers to WRITE (Secretary, Recruitment, Social, Philanthropy, Brotherhood, VP, Marshal)", () => {
    for (const slug of [
      "secretary", "recruitment-chair", "social-chair",
      "philanthropy-chair", "brotherhood-chair", "vice-president", "marshal",
    ]) {
      expect(gate(catalog[slug], "write")).toBe(true);
    }
    expect(gate(SUPER_ADMIN_PERMISSIONS, "write")).toBe(true);
  });

  it("read-only events officers (Risk Manager, IFC, Alumni Relations) can READ but not WRITE", () => {
    for (const slug of ["risk-manager", "ifc-delegate", "alumni-relations"]) {
      expect(gate(catalog[slug], "read")).toBe(true);
      expect(gate(catalog[slug], "write")).toBe(false);
    }
  });

  it("non-events officers (Treasurer, House, Scholarship) see nothing; plain member denied", () => {
    for (const slug of ["treasurer", "house-manager", "scholarship-chair"]) {
      expect(gate(catalog[slug], "read")).toBe(false);
    }
    expect(gate(EMPTY_PERMISSIONS, "read")).toBe(false);
    expect(gate(EMPTY_PERMISSIONS, "write")).toBe(false);
  });
});

describe("events source-pins (API + page + nav + manager)", () => {
  it("the API route gates POST + DELETE on guardOfficer('events','write'), not isAdminRole", () => {
    const src = readFileSync(root("app/api/admin/events/route.ts"), "utf8");
    const guards = src.match(/guardOfficer\("events",\s*"write"\)/g) || [];
    expect(guards.length).toBeGreaterThanOrEqual(2); // POST + DELETE
    // The admins-only gate is gone (isAdminRole no longer imported or called).
    expect(/import\s*\{[^}]*isAdminRole/.test(src)).toBe(false);
    expect(/if\s*\(!isAdminRole\(\)\)/.test(src)).toBe(false);
  });

  it("the page gates on checkOfficerPermission('events', …) and threads canWrite", () => {
    const src = readFileSync(root("app/admin/events/page.tsx"), "utf8");
    expect(src).toMatch(/checkOfficerPermission\("events",\s*"read"\)/);
    expect(src).toMatch(/checkOfficerPermission\("events",\s*"write"\)/);
    expect(src).toMatch(/canWrite=\{canWrite\}/);
  });

  it("the admin nav events tile is domain-gated (adminOnly:false, domain:'events')", () => {
    const nav = readFileSync(root("components/admin/admin-nav.tsx"), "utf8");
    expect(nav).toMatch(/"\/admin\/events".*adminOnly: false.*domain: "events"/);
  });

  it("the EventsManager accepts canWrite and gates its create/edit/delete on it", () => {
    const mgr = readFileSync(root("components/admin/events-manager.tsx"), "utf8");
    expect(mgr).toMatch(/canWrite\s*=\s*true/); // prop with safe default
    expect(mgr).toMatch(/\{canWrite && \(/); // controls wrapped
  });
});
