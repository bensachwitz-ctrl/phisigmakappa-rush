import { describe, it, expect } from "vitest";
import {
  officerToolset,
  officerToolIds,
  matchOfficerRole,
  permissionsForPosition,
  TOOL_CATALOG,
} from "@/lib/officer-tools";
import {
  DEFAULT_OFFICER_CATALOG,
  SUPER_ADMIN_PERMISSIONS,
  EMPTY_PERMISSIONS,
} from "@/lib/officer-permissions";

// ── Item-1 RBAC core: POSITION-SPECIFIC officer tool pages ───────────────────
// The generic "Exec board" is replaced with a per-position label + a tool set
// scoped to exactly that position's permissions. These tests pin: (a) the label
// per officer, (b) that each role only gets tools its domains grant, and (c) a
// non-officer / alumni-string gets NOTHING.

describe("officerToolset — per-position label + scoped tools", () => {
  it("President → 'President Tools' with EVERY tool (super-admin)", () => {
    const ts = officerToolset("President");
    expect(ts.label).toBe("President Tools");
    expect(ts.roleKey).toBe("president");
    // super-admin unlocks all catalog tools
    expect(ts.tools.length).toBe(TOOL_CATALOG.length);
  });

  it("Vice President → 'Vice President Tools' incl. attendance + announcements, but NOT dues/rush", () => {
    const ts = officerToolset("Vice President");
    expect(ts.label).toBe("Vice President Tools");
    const ids = ts.tools.map((t) => t.id);
    expect(ids).toContain("attendance");
    expect(ids).toContain("announce");
    expect(ids).toContain("events");
    expect(ids).not.toContain("dues");
    expect(ids).not.toContain("rush");
  });

  it("Secretary → 'Secretary Tools' with announcements (+ events/documents/elections)", () => {
    const ts = officerToolset("Secretary");
    expect(ts.label).toBe("Secretary Tools");
    const ids = ts.tools.map((t) => t.id);
    expect(ids).toContain("announce");
    expect(ids).toContain("documents");
    expect(ids).toContain("elections");
    expect(ids).not.toContain("dues");
  });

  it("Recruitment Chair → 'Recruitment Tools' with the rush pipeline", () => {
    const ts = officerToolset("Recruitment Chair");
    expect(ts.label).toBe("Recruitment Tools");
    expect(ts.tools.map((t) => t.id)).toContain("rush");
  });

  it("Social Chair → 'Social Tools' with events, but NOT dues or rush", () => {
    const ts = officerToolset("Social Chair");
    expect(ts.label).toBe("Social Tools");
    const ids = ts.tools.map((t) => t.id);
    expect(ids).toContain("events");
    expect(ids).not.toContain("dues");
    expect(ids).not.toContain("rush");
  });

  it("Philanthropy Chair → 'Philanthropy Tools' with the service tool", () => {
    const ts = officerToolset("Philanthropy Chair");
    expect(ts.label).toBe("Philanthropy Tools");
    expect(ts.tools.map((t) => t.id)).toContain("service");
  });

  it("Brotherhood Chair → 'Brotherhood Tools' (events + announcements)", () => {
    const ts = officerToolset("Brotherhood Chair");
    expect(ts.label).toBe("Brotherhood Tools");
    const ids = ts.tools.map((t) => t.id);
    expect(ids).toContain("events");
    expect(ids).toContain("announce");
  });

  it("Risk Manager → 'Risk Management Tools' with the sober-shift tool", () => {
    const ts = officerToolset("Risk Manager");
    expect(ts.label).toBe("Risk Management Tools");
    expect(ts.tools.map((t) => t.id)).toContain("risk-sober");
    // and NOT dues
    expect(ts.tools.map((t) => t.id)).not.toContain("dues");
  });

  it("Treasurer → 'Treasurer Tools' with dues, but NOT the rush pipeline", () => {
    const ts = officerToolset("Treasurer");
    expect(ts.label).toBe("Treasurer Tools");
    const ids = ts.tools.map((t) => t.id);
    expect(ids).toContain("dues");
    expect(ids).not.toContain("rush");
  });

  it("Alumni Relations → 'Alumni Tools' with the alumni tool (NEW role)", () => {
    const ts = officerToolset("Alumni Relations");
    expect(ts.label).toBe("Alumni Tools");
    expect(ts.roleKey).toBe("alumni-relations");
    expect(ts.tools.map((t) => t.id)).toContain("alumni");
    expect(ts.tools.map((t) => t.id)).toContain("announce");
  });

  it("an UNKNOWN chapter-invented officer title still gets its own labelled page (read-only floor)", () => {
    const ts = officerToolset("Sustainability Chair");
    expect(ts.label).toBe("Sustainability Chair Tools");
    expect(ts.roleKey).toBe("officer");
    // read-only floor → roster/attendance only, never a write tool
    const ids = ts.tools.map((t) => t.id);
    expect(ids).toContain("roster");
    expect(ids).not.toContain("dues");
    expect(ids).not.toContain("announce"); // announce needs write
  });

  it("a plain member gets an EMPTY toolset (no officer tools leak)", () => {
    for (const p of ["Active Member", "Member", "Brother", "New Member", "Pledge", "", null]) {
      const ts = officerToolset(p);
      expect(ts.tools).toHaveLength(0);
      expect(ts.roleKey).toBe("member");
    }
  });

  it("an authoritative permsOverride wins over the position default", () => {
    // Web/admin side passes real OfficerAssignment perms; here a 'President'
    // string but empty perms yields NO tools (override beats the title).
    const ts = officerToolset("President", EMPTY_PERMISSIONS);
    expect(ts.tools).toHaveLength(0);
    // …and a super-admin override on a plain title unlocks everything.
    const ts2 = officerToolset("Active Member", SUPER_ADMIN_PERMISSIONS);
    expect(ts2.tools.length).toBe(TOOL_CATALOG.length);
  });
});

describe("matchOfficerRole / permissionsForPosition", () => {
  it("vice president beats president in the keyword table", () => {
    expect(matchOfficerRole("Vice President")?.roleKey).toBe("vice-president");
    expect(matchOfficerRole("President")?.roleKey).toBe("president");
  });

  it("resolves permissions from the catalog for a known role", () => {
    const perms = permissionsForPosition("Treasurer");
    expect(perms.domain.dues).toBe("write");
    expect(perms.domain.rushPipeline).toBeUndefined();
  });

  it("returns empty perms for a non-officer", () => {
    expect(permissionsForPosition("Active Member")).toEqual(EMPTY_PERMISSIONS);
  });
});

describe("Alumni Relations role is seeded into the catalog", () => {
  it("exists with alumni+announcements write", () => {
    const role = DEFAULT_OFFICER_CATALOG.find((s) => s.slug === "alumni-relations");
    expect(role).toBeTruthy();
    expect(role!.permissions.domain.alumni).toBe("write");
    expect(role!.permissions.domain.announcements).toBe("write");
  });
});

describe("officerToolIds convenience", () => {
  it("returns just the tool ids for a role", () => {
    const ids = officerToolIds("Treasurer");
    expect(ids).toContain("dues");
    expect(Array.isArray(ids)).toBe(true);
  });
});

// ── Mobile exec-nav scoping (mirror MobileAppClient EXEC_TAB_TOOL filter) ─────
// The client filters the exec bottom-nav so each slot only shows when the
// officer's toolset holds the tool that justifies it (Roster always shows).
// Pin the mapping so a Treasurer never gets a Rush slot, a Social Chair never
// gets Dues, etc.
describe("exec nav slot filtering (mirror the .tsx predicate)", () => {
  const EXEC_TAB_TOOL: Record<string, string> = {
    feed: "roster",
    events: "announce",
    rush: "rush",
    dues: "dues",
    directory: "settings",
  };
  const visibleTabs = (position: string): string[] => {
    const ids = new Set(officerToolIds(position));
    return ["feed", "events", "rush", "dues", "directory"].filter(
      (t) => t === "feed" || ids.has(EXEC_TAB_TOOL[t]),
    );
  };

  it("President sees every exec slot", () => {
    expect(visibleTabs("President")).toEqual(["feed", "events", "rush", "dues", "directory"]);
  });
  it("Treasurer sees Roster + Dues only (no Rush/Announce/Console)", () => {
    expect(visibleTabs("Treasurer")).toEqual(["feed", "dues"]);
  });
  it("Recruitment Chair sees Roster + Announce + Rush (no Dues/Console)", () => {
    expect(visibleTabs("Recruitment Chair")).toEqual(["feed", "events", "rush"]);
  });
  it("Social Chair sees Roster only via this 1:1 map (events-write has no announce slot)", () => {
    // Social Chair has events:write but not announcements:write, and the Announce
    // slot is gated on announce specifically — so no false 'post announcement'
    // affordance leaks (the server would reject it anyway).
    expect(visibleTabs("Social Chair")).toEqual(["feed"]);
  });
  it("Alumni Relations sees Roster + Announce", () => {
    expect(visibleTabs("Alumni Relations")).toEqual(["feed", "events"]);
  });
});
