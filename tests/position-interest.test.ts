import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { officerToolset } from "@/lib/officer-tools";

// ── Item-3: run-for-a-position interest (member-side of the officer tools) ────
// A non-exec brother records interest; the CURRENT holder of that role is
// notified by seeing it in their officer tools. The holder match uses the SAME
// officerToolset role resolution both sides share.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);

describe("holder matching (mirror the route's officerToolset role match)", () => {
  const sameRole = (a: string, b: string) =>
    officerToolset(a).roleKey === officerToolset(b).roleKey && officerToolset(a).roleKey !== "member";

  it("matches a Treasurer interest to the sitting Treasurer", () => {
    expect(sameRole("Treasurer", "Treasurer")).toBe(true);
    expect(sameRole("Chapter Treasurer", "Treasurer")).toBe(true);
  });
  it("does NOT match a Treasurer interest to the President", () => {
    expect(sameRole("Treasurer", "President")).toBe(false);
  });
  it("a plain member string never matches a holder", () => {
    expect(sameRole("Active Member", "Active Member")).toBe(false);
  });

  // Both routes now resolve the role from the NORMALIZED positionSlug, never the
  // free-text positionTitle. This proves the fix: a typo'd display title routes
  // correctly by slug where it would silently misroute (→ "member") by title.
  it("routes a title-TYPO interest to the sitting holder via the canonical slug", () => {
    const typoTitle = "Treaurer"; // member fat-fingered the display title
    const canonicalSlug = "treasurer"; // the picker still sent the canonical slug

    // The (buggy) title path collapses the typo to a plain member → no match.
    expect(officerToolset(typoTitle).roleKey).toBe("member");
    // The (fixed) slug path resolves to the real role, so the Treasurer is notified.
    expect(officerToolset(canonicalSlug).roleKey).toBe("treasurer");
    expect(sameRole(canonicalSlug, "Treasurer")).toBe(true);
  });

  it("resolves hyphenated multi-word slugs (recruitment-chair) that a typo'd title would miss", () => {
    expect(officerToolset("recruitment-chair").roleKey).toBe("recruitment-chair");
    expect(sameRole("recruitment-chair", "Recruitment Chair")).toBe(true);
    // A typo'd title falls back to the generic "officer" floor, not the real seat.
    expect(officerToolset("Recruitmnt Chair").roleKey).not.toBe("recruitment-chair");
  });
});

describe("both position-interest routes match on positionSlug, not positionTitle", () => {
  it("the POST holder-match resolves the target role from positionSlug", () => {
    const src = readFileSync(root("app/api/mobile/position-interest/route.ts"), "utf8");
    expect(src).toMatch(/officerToolset\(positionSlug\)\.roleKey/);
    expect(src).not.toMatch(/officerToolset\(positionTitle\)/);
  });
  it("the GET inbox-filter resolves each interest's role from pi.positionSlug", () => {
    const src = readFileSync(root("app/api/mobile/data/route.ts"), "utf8");
    expect(src).toMatch(/officerToolset\(pi\.positionSlug\)\.roleKey/);
    expect(src).not.toMatch(/officerToolset\(pi\.positionTitle\)/);
  });
});

describe("position-interest wiring source-pins", () => {
  it("the POST route is brother-only and records a durable PositionInterest", () => {
    const src = readFileSync(root("app/api/mobile/position-interest/route.ts"), "utf8");
    expect(src).toMatch(/sess\.role !== "brother"/); // alumni/pnm rejected
    expect(src).toMatch(/positionInterest\.(create|update|findFirst)/);
  });

  it("the mobile data route surfaces positionInterests to the current holder", () => {
    const src = readFileSync(root("app/api/mobile/data/route.ts"), "utf8");
    expect(src).toMatch(/positionInterest\.findMany/);
    expect(src).toMatch(/positionInterests,/); // returned in the payload
  });

  it("PositionInterest is declared in the prisma schema + additive tenant DDL", () => {
    const prisma = readFileSync(root("prisma/schema.prisma"), "utf8");
    expect(prisma).toMatch(/model PositionInterest \{/);
    const sql = readFileSync(root("lib/schema.sql"), "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "PositionInterest"/);
  });

  it("the client shows a run-for-position prompt only to a non-officer brother member view", () => {
    const src = readFileSync(root("app/app/MobileAppClient.tsx"), "utf8");
    expect(src).toMatch(/Want to run for a position\?/);
    // gated on member persona + brother role + (demo OR not exec-allowed)
    expect(src).toMatch(/isDemo \|\| !execAllowed/);
  });
});
