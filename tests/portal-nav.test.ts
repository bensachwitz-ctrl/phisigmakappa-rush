import { describe, it, expect } from "vitest";
import { buildPortalDestinations, PORTAL_HOMES } from "@/components/nav/portal-nav";

// ── Portal switcher authorization boundary (source of truth: portal-nav.ts) ───
// The top portal-switcher must only ever DRAW destinations the current session is
// authorized for. The single security-critical rule: a NON-admin session can
// never reach the officer/admin console via the switcher. buildPortalDestinations
// is the one place that decides which doors to draw, so it is pinned here.

describe("buildPortalDestinations — portal switcher authorization", () => {
  it("a plain member sees only the member portal (never admin)", () => {
    const dests = buildPortalDestinations({ current: "member", isAdmin: false });
    expect(dests.map((d) => d.key)).toEqual(["member"]);
    expect(dests.some((d) => d.key === "admin")).toBe(false);
  });

  it("a member who is also an alumnus sees member + alumni, never admin", () => {
    const dests = buildPortalDestinations({
      current: "member",
      isAdmin: false,
      hasAlumniProfile: true,
    });
    expect(dests.map((d) => d.key)).toEqual(["member", "alumni"]);
    expect(dests.some((d) => d.key === "admin")).toBe(false);
  });

  it("a plain alumnus sees only the alumni portal (never admin)", () => {
    const dests = buildPortalDestinations({ current: "alumni", isAdmin: false });
    expect(dests.map((d) => d.key)).toEqual(["alumni"]);
  });

  it("HARD BOUNDARY: a non-admin never gets admin even with both linked profiles", () => {
    const dests = buildPortalDestinations({
      current: "member",
      isAdmin: false,
      hasBrotherProfile: true,
      hasAlumniProfile: true,
    });
    expect(dests.some((d) => d.key === "admin")).toBe(false);
  });

  it("a real admin override sees every portal", () => {
    const dests = buildPortalDestinations({ current: "admin", isAdmin: true });
    expect(dests.map((d) => d.key)).toEqual(["admin", "member", "alumni"]);
  });

  it("an admin viewing a member portal (override) still sees every portal", () => {
    const dests = buildPortalDestinations({ current: "member", isAdmin: true });
    expect(dests.map((d) => d.key)).toEqual(["admin", "member", "alumni"]);
  });

  it("always includes the current portal so the switcher can render it as a chip", () => {
    for (const current of ["admin", "member", "alumni"] as const) {
      const dests = buildPortalDestinations({ current, isAdmin: false });
      expect(dests.some((d) => d.key === current)).toBe(true);
    }
  });

  it("returns destinations in stable admin, member, alumni order", () => {
    const dests = buildPortalDestinations({ current: "admin", isAdmin: true });
    const order = dests.map((d) => d.key);
    expect(order).toEqual([...order].sort(
      (a, b) => ["admin", "member", "alumni"].indexOf(a) - ["admin", "member", "alumni"].indexOf(b),
    ));
  });

  it("every destination carries the canonical home route + copy", () => {
    const dests = buildPortalDestinations({ current: "admin", isAdmin: true });
    for (const d of dests) {
      expect(d.href).toBe(PORTAL_HOMES[d.key].href);
      expect(d.label).toBe(PORTAL_HOMES[d.key].label);
      expect(d.description.length).toBeGreaterThan(0);
    }
  });
});
